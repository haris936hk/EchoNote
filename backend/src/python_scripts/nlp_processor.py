# backend/src/python_scripts/nlp_processor.py
import sys
import json
import re
import os
import spacy
from spacy.matcher import Matcher
import warnings
from utils import Logger
warnings.filterwarnings("ignore")


# ─── Module-level model cache ────────────────────────────────────────────────
_MODEL_CACHE = {}


def get_model(model_name):
    """Load and cache SpaCy model with custom entity ruler."""
    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]

    nlp = spacy.load(model_name)

    # Load custom entity patterns
    base_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        with open(os.path.join(base_dir, 'entities_config.json'), 'r') as f:
            custom_patterns = json.load(f)
        if not nlp.has_pipe("entity_ruler"):
            ruler = nlp.add_pipe("entity_ruler", before="ner")
            ruler.add_patterns(custom_patterns)
    except Exception:
        pass

    _MODEL_CACHE[model_name] = nlp
    return nlp


# ─── Entity noise filtering ──────────────────────────────────────────────────

# Labels with low value for meeting analysis
NOISY_LABELS = {'CARDINAL', 'ORDINAL', 'QUANTITY', 'LANGUAGE'}
MIN_ENTITY_LENGTH = 2


def filter_entities(entities_raw):
    """Remove noisy entities that degrade LLM context quality."""
    filtered = []
    for ent in entities_raw:
        text = ent['text'].strip()
        label = ent['label']

        # Skip noisy labels
        if label in NOISY_LABELS:
            continue
        # Skip very short entities
        if len(text) < MIN_ENTITY_LENGTH:
            continue
        # Skip pure numeric entities
        if text.isdigit():
            continue
        # Skip common pronouns that SpaCy sometimes tags as entities
        if text.lower() in ('it', 'he', 'she', 'they', 'we', 'us', 'them',
                            'this', 'that', 'these', 'those'):
            continue

        filtered.append(ent)
    return filtered


def deduplicate_entities(entities_raw):
    """
    Deduplicate entities by (text, label) and add frequency counts.
    Returns list of unique entities sorted by frequency descending.
    """
    counts = {}
    for ent in entities_raw:
        key = (ent['text'].strip(), ent['label'])
        counts[key] = counts.get(key, 0) + 1

    deduplicated = [
        {'text': text, 'label': label, 'count': count}
        for (text, label), count in counts.items()
    ]
    # Sort by frequency (most common first)
    deduplicated.sort(key=lambda x: x['count'], reverse=True)
    return deduplicated


# ─── Speaker-aware parsing ────────────────────────────────────────────────────

def parse_with_speaker_context(text):
    """
    Parse transcript into speaker-attributed segments.
    Handles formats:
      - [SPEAKER_00]: text
      - Speaker 1: text
      - John: text
    Returns list of {speaker, text} dicts and cleaned text (labels stripped).
    """
    speaker_segments = []
    current_speaker = None
    cleaned_lines = []

    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Match [SPEAKER_XX]: or Speaker X: or Name: patterns
        match = re.match(
            r'\[?(SPEAKER_\d+|Speaker\s*\d+)\]?:\s*(.*)',
            line,
            flags=re.IGNORECASE
        )
        if not match:
            # Try Name: pattern (capitalized word followed by colon)
            match = re.match(r'([A-Z][a-zA-Z]+):\s*(.*)', line)

        if match:
            current_speaker = match.group(1).strip()
            content = match.group(2).strip()
            if content:
                speaker_segments.append({
                    'speaker': current_speaker,
                    'text': content
                })
                cleaned_lines.append(content)
        elif current_speaker and line:
            speaker_segments.append({
                'speaker': current_speaker,
                'text': line
            })
            cleaned_lines.append(line)
        elif line:
            # No speaker context — include as-is
            cleaned_lines.append(line)

    cleaned_text = ' '.join(cleaned_lines)
    return speaker_segments, cleaned_text


def build_speaker_entity_map(speaker_segments, doc):
    """
    Map speakers to the entities they mention most frequently.
    This helps Groq attribute action items to correct speakers.
    
    Returns: {
        "SPEAKER_00": ["ProjectX (TECH)", "John (PERSON)"],
        "SPEAKER_01": ["AWS (TECH)", "Friday (DATE)"]
    }
    """
    speaker_entities = {}

    # Build a character offset map: for each speaker segment, track its
    # position in the cleaned text so we can attribute doc.ents to speakers
    char_offset = 0
    segment_ranges = []
    for seg in speaker_segments:
        start = char_offset
        end = start + len(seg['text'])
        segment_ranges.append({
            'speaker': seg['speaker'],
            'start': start,
            'end': end
        })
        # +1 for the space that joins segments in cleaned_text
        char_offset = end + 1

    for ent in doc.ents:
        # Skip noisy entities
        if ent.label_ in NOISY_LABELS or len(ent.text.strip()) < MIN_ENTITY_LENGTH:
            continue
        if ent.text.strip().lower() in ('it', 'he', 'she', 'they', 'we'):
            continue

        # Find which speaker segment this entity falls in
        for seg_range in segment_ranges:
            if ent.start_char >= seg_range['start'] and ent.end_char <= seg_range['end']:
                speaker = seg_range['speaker']
                if speaker not in speaker_entities:
                    speaker_entities[speaker] = []
                entity_str = f"{ent.text.strip()} ({ent.label_})"
                if entity_str not in speaker_entities[speaker]:
                    speaker_entities[speaker].append(entity_str)
                break

    return speaker_entities


# ─── Action signal detection ─────────────────────────────────────────────────

def extract_action_signals(doc, speaker_segments, max_signals=15):
    """
    Detect commitment-indicating patterns using SpaCy Matcher.
    These are phrases where someone commits to doing something.
    
    Returns list of {text, verb, speaker} dicts.
    """
    nlp = doc.vocab  # needed for Matcher
    matcher = Matcher(doc.vocab)

    # Pattern: "I/we will [verb]" or "I'll [verb]"
    matcher.add("WILL_COMMIT", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": "will"}, {"POS": "VERB"}],
    ])

    # Pattern: "I/we need to [verb]"
    matcher.add("NEED_TO", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": "need"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    # Pattern: "I'm going to [verb]"
    matcher.add("GOING_TO", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"IS_PUNCT": False, "OP": "?"}, {"LOWER": "going"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    # Pattern: "Let's [verb]"
    matcher.add("LETS", [
        [{"LOWER": "let"}, {"TEXT": {"IN": ["'s", "us"]}}, {"POS": "VERB"}],
    ])

    # Pattern: "[noun/pronoun] should/must [verb]"
    matcher.add("MODAL_COMMIT", [
        [{"POS": {"IN": ["PROPN", "NOUN", "PRON"]}}, {"LEMMA": {"IN": ["should", "must"]}}, {"POS": "VERB"}],
    ])

    # Pattern: "make sure to [verb]"
    matcher.add("MAKE_SURE", [
        [{"LOWER": "make"}, {"LOWER": "sure"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    # Pattern: "I can [verb]" / "I could [verb]"
    matcher.add("CAN_COMMIT", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": {"IN": ["can", "could"]}}, {"POS": "VERB"}],
    ])

    matches = matcher(doc)
    action_signals = []
    seen_spans = set()

    # Build speaker attribution via character offsets
    char_offset = 0
    segment_ranges = []
    for seg in speaker_segments:
        start = char_offset
        end = start + len(seg['text'])
        segment_ranges.append({
            'speaker': seg['speaker'],
            'start': start,
            'end': end
        })
        char_offset = end + 1

    for match_id, start, end in matches:
        # Expand the match to include more context (up to sentence boundary)
        sent = doc[start].sent
        span_text = sent.text.strip()

        # Skip duplicates
        if span_text in seen_spans:
            continue
        seen_spans.add(span_text)

        # Find the main verb in the match
        verb = None
        for token in doc[start:end]:
            if token.pos_ == 'VERB':
                verb = token.lemma_
                break

        # Attribute to speaker
        speaker = None
        match_start_char = doc[start].idx
        for seg_range in segment_ranges:
            if match_start_char >= seg_range['start'] and match_start_char < seg_range['end']:
                speaker = seg_range['speaker']
                break

        # Limit context length
        if len(span_text) > 120:
            span_text = span_text[:120] + '...'

        action_signals.append({
            'text': span_text,
            'verb': verb,
            'speaker': speaker
        })

        if len(action_signals) >= max_signals:
            break

    return action_signals


# ─── Question detection ───────────────────────────────────────────────────────

QUESTION_STARTERS = frozenset([
    'who', 'what', 'when', 'where', 'why', 'how',
    'can', 'could', 'should', 'would', 'will',
    'is', 'are', 'do', 'does', 'did', 'has', 'have', 'had',
    'shall', 'may', 'might'
])


def extract_questions(doc, max_questions=10):
    """
    Extract questions from the transcript.
    Helps the LLM populate nextSteps with unresolved issues.
    """
    questions = []

    for sent in doc.sents:
        text = sent.text.strip()
        if not text:
            continue

        # Direct questions (end with ?)
        if text.endswith('?'):
            questions.append({'text': text, 'type': 'direct'})
        else:
            # Check for question-starting words without ? (common in speech)
            first_word = text.split()[0].lower() if text.split() else ''
            if first_word in QUESTION_STARTERS and len(text) > 15:
                # Only include if it actually reads as a question
                # (avoid false positives from statements like "How great this is")
                if any(w in text.lower() for w in ['?', 'anyone', 'somebody',
                                                     'we need to know',
                                                     'figure out']):
                    questions.append({'text': text, 'type': 'indirect'})

        if len(questions) >= max_questions:
            break

    return questions


# ─── SVO extraction (improved from Pass 1) ────────────────────────────────────

def extract_svo_triplets(doc, max_triplets=20):
    """
    Extract Subject-Verb-Object triplets with improved handling for:
    - Auxiliary verb chains (should, will, can + main verb)
    - Passive voice (was approved by John)
    - Subtree length limiting to prevent noisy strings
    """
    svo_triplets = []

    for token in doc:
        # Skip non-verbs
        if token.pos_ not in ('VERB', 'AUX'):
            continue

        # For auxiliary verbs, find the main verb they modify
        verb_token = token
        if token.pos_ == 'AUX':
            main_verbs = [
                child for child in token.children
                if child.dep_ in ('xcomp', 'ccomp', 'conj') and child.pos_ == 'VERB'
            ]
            if main_verbs:
                verb_token = main_verbs[0]
            else:
                continue

        # Find subjects (active and passive)
        subjects = [w for w in verb_token.children if w.dep_ in ('nsubj', 'nsubjpass')]
        if not subjects and token != verb_token:
            subjects = [w for w in token.children if w.dep_ in ('nsubj', 'nsubjpass')]

        # Find objects (direct, prepositional, attributive)
        objects = [w for w in verb_token.children if w.dep_ in ('dobj', 'pobj', 'attr', 'oprd')]

        # For passive voice, look for agent ("by X")
        if not subjects:
            for child in verb_token.children:
                if child.dep_ == 'agent':
                    for pobj in child.children:
                        if pobj.dep_ == 'pobj':
                            subjects = [pobj]
                            break

        if subjects and objects:
            subj_tokens = list(subjects[0].subtree)[:6]
            obj_tokens = list(objects[0].subtree)[:8]

            subj_text = " ".join([t.text for t in subj_tokens]).strip()
            obj_text = " ".join([t.text for t in obj_tokens]).strip()

            if len(subj_text) < 2 or len(obj_text) < 2:
                continue

            svo_triplets.append({
                'subject': subj_text,
                'verb': verb_token.lemma_.strip(),
                'object': obj_text
            })

            if len(svo_triplets) >= max_triplets:
                break

    return svo_triplets


# ─── Main processing function ─────────────────────────────────────────────────

def process_text(text, model_name):
    """
    Process transcript text and extract NLP features for Groq LLM input.

    Returns: {
        "success": true,
        "entities": [{text, label, count}, ...],
        "svoTriplets": [{subject, verb, object}, ...],
        "actionSignals": [{text, verb, speaker}, ...],
        "questions": [{text, type}, ...],
        "speakerEntityMap": {"SPEAKER_00": ["John (PERSON)"], ...},
        "metadata": {"sentenceCount": 47, "wordCount": 892, "avgSentenceLength": 19.0}
    }
    """
    try:
        # Load cached SpaCy model
        nlp = get_model(model_name)

        # Parse transcript with speaker context preservation
        speaker_segments, cleaned_text = parse_with_speaker_context(text)

        # If no speaker segments found, treat entire text as cleaned
        if not speaker_segments and not cleaned_text:
            cleaned_text = re.sub(r'\[SPEAKER_\d+\]:\s*', '', text)
            cleaned_text = re.sub(r'Speaker\s*\d+:\s*', '', cleaned_text, flags=re.IGNORECASE)
            cleaned_text = cleaned_text.strip()

        # Process with SpaCy
        doc = nlp(cleaned_text)

        # 1. Extract and filter entities
        entities_raw = [{'text': ent.text, 'label': ent.label_} for ent in doc.ents]
        entities_filtered = filter_entities(entities_raw)
        entities = deduplicate_entities(entities_filtered)

        # 2. Extract SVO triplets
        svo_triplets = extract_svo_triplets(doc)

        # 3. Extract action signals (commitment patterns)
        action_signals = extract_action_signals(doc, speaker_segments)

        # 4. Extract questions
        questions = extract_questions(doc)

        # 5. Build speaker-entity map
        speaker_entity_map = build_speaker_entity_map(speaker_segments, doc)

        # 6. Sentence metadata
        sentences = list(doc.sents)
        metadata = {
            'sentenceCount': len(sentences),
            'wordCount': len(doc),
            'avgSentenceLength': round(
                sum(len(s) for s in sentences) / max(len(sentences), 1), 1
            ),
        }

        return {
            'success': True,
            'entities': entities,
            'svoTriplets': svo_triplets,
            'actionSignals': action_signals,
            'questions': questions,
            'speakerEntityMap': speaker_entity_map,
            'metadata': metadata,
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'entities': [],
            'svoTriplets': [],
            'actionSignals': [],
            'questions': [],
            'speakerEntityMap': {},
            'metadata': {},
        }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No input text provided'}))
        sys.exit(1)

    if sys.argv[1] == 'test':
        # Test mode
        import platform
        print("🧪 Testing SpaCy installation...", file=sys.stderr)
        with Logger.suppress_stdout():
            nlp = spacy.load('en_core_web_lg')
        print(json.dumps({
            'spacy_version': spacy.__version__,
            'model': 'en_core_web_lg',
            'model_version': nlp.meta['version'],
            'python_version': platform.python_version(),
            'components': nlp.pipe_names
        }))
    else:
        text = sys.argv[1]
        mode = sys.argv[2] if len(sys.argv) > 2 else 'full'
        model_name = 'en_core_web_lg'

        if mode == 'full':
            result = process_text(text, model_name)
        else:
            result = {'success': False, 'error': f'Unsupported mode: {mode}'}

        print(json.dumps(result))