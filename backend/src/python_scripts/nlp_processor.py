
import sys
import json
import re
import os
import spacy
from spacy.matcher import Matcher
import warnings
from utils import Logger
warnings.filterwarnings("ignore")

_MODEL_CACHE = {}

def get_model(model_name):

    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]

    nlp = spacy.load(model_name)

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

NOISY_LABELS = {'CARDINAL', 'ORDINAL', 'QUANTITY', 'LANGUAGE'}
MIN_ENTITY_LENGTH = 2

def filter_entities(entities_raw):

    filtered = []
    for ent in entities_raw:
        text = ent['text'].strip()
        label = ent['label']

        if label in NOISY_LABELS:
            continue

        if len(text) < MIN_ENTITY_LENGTH:
            continue

        if text.isdigit():
            continue

        if text.lower() in ('it', 'he', 'she', 'they', 'we', 'us', 'them',
                            'this', 'that', 'these', 'those'):
            continue

        filtered.append(ent)
    return filtered

def deduplicate_entities(entities_raw):

    counts = {}
    for ent in entities_raw:
        key = (ent['text'].strip(), ent['label'])
        counts[key] = counts.get(key, 0) + 1

    deduplicated = [
        {'text': text, 'label': label, 'count': count}
        for (text, label), count in counts.items()
    ]

    deduplicated.sort(key=lambda x: x['count'], reverse=True)
    return deduplicated

def parse_with_speaker_context(text):

    speaker_segments = []
    current_speaker = None
    cleaned_lines = []

    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue

        match = re.match(
            r'\[?(SPEAKER_\d+|Speaker\s*\d+)\]?:\s*(.*)',
            line,
            flags=re.IGNORECASE
        )
        if not match:

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

            cleaned_lines.append(line)

    cleaned_text = ' '.join(cleaned_lines)
    return speaker_segments, cleaned_text

def build_speaker_entity_map(speaker_segments, doc):

    speaker_entities = {}

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

    for ent in doc.ents:

        if ent.label_ in NOISY_LABELS or len(ent.text.strip()) < MIN_ENTITY_LENGTH:
            continue
        if ent.text.strip().lower() in ('it', 'he', 'she', 'they', 'we'):
            continue

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

def extract_action_signals(doc, speaker_segments, max_signals=15):

    nlp = doc.vocab
    matcher = Matcher(doc.vocab)

    matcher.add("WILL_COMMIT", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": "will"}, {"POS": "VERB"}],
    ])

    matcher.add("NEED_TO", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": "need"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    matcher.add("GOING_TO", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"IS_PUNCT": False, "OP": "?"}, {"LOWER": "going"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    matcher.add("LETS", [
        [{"LOWER": "let"}, {"TEXT": {"IN": ["'s", "us"]}}, {"POS": "VERB"}],
    ])

    matcher.add("MODAL_COMMIT", [
        [{"POS": {"IN": ["PROPN", "NOUN", "PRON"]}}, {"LEMMA": {"IN": ["should", "must"]}}, {"POS": "VERB"}],
    ])

    matcher.add("MAKE_SURE", [
        [{"LOWER": "make"}, {"LOWER": "sure"}, {"LOWER": "to"}, {"POS": "VERB"}],
    ])

    matcher.add("CAN_COMMIT", [
        [{"LOWER": {"IN": ["i", "we"]}}, {"LEMMA": {"IN": ["can", "could"]}}, {"POS": "VERB"}],
    ])

    matches = matcher(doc)
    action_signals = []
    seen_spans = set()

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

        sent = doc[start].sent
        span_text = sent.text.strip()

        if span_text in seen_spans:
            continue
        seen_spans.add(span_text)

        verb = None
        for token in doc[start:end]:
            if token.pos_ == 'VERB':
                verb = token.lemma_
                break

        speaker = None
        match_start_char = doc[start].idx
        for seg_range in segment_ranges:
            if match_start_char >= seg_range['start'] and match_start_char < seg_range['end']:
                speaker = seg_range['speaker']
                break

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

QUESTION_STARTERS = frozenset([
    'who', 'what', 'when', 'where', 'why', 'how',
    'can', 'could', 'should', 'would', 'will',
    'is', 'are', 'do', 'does', 'did', 'has', 'have', 'had',
    'shall', 'may', 'might'
])

def extract_questions(doc, max_questions=10):

    questions = []

    for sent in doc.sents:
        text = sent.text.strip()
        if not text:
            continue

        if text.endswith('?'):
            questions.append({'text': text, 'type': 'direct'})
        else:

            first_word = text.split()[0].lower() if text.split() else ''
            if first_word in QUESTION_STARTERS and len(text) > 15:

                if any(w in text.lower() for w in ['?', 'anyone', 'somebody',
                                                     'we need to know',
                                                     'figure out']):
                    questions.append({'text': text, 'type': 'indirect'})

        if len(questions) >= max_questions:
            break

    return questions

def extract_svo_triplets(doc, max_triplets=20):

    svo_triplets = []

    for token in doc:

        if token.pos_ not in ('VERB', 'AUX'):
            continue

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

        subjects = [w for w in verb_token.children if w.dep_ in ('nsubj', 'nsubjpass')]
        if not subjects and token != verb_token:
            subjects = [w for w in token.children if w.dep_ in ('nsubj', 'nsubjpass')]

        objects = [w for w in verb_token.children if w.dep_ in ('dobj', 'pobj', 'attr', 'oprd')]

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

def process_text(text, model_name):

    try:

        nlp = get_model(model_name)

        speaker_segments, cleaned_text = parse_with_speaker_context(text)

        if not speaker_segments and not cleaned_text:
            cleaned_text = re.sub(r'\[SPEAKER_\d+\]:\s*', '', text)
            cleaned_text = re.sub(r'Speaker\s*\d+:\s*', '', cleaned_text, flags=re.IGNORECASE)
            cleaned_text = cleaned_text.strip()

        doc = nlp(cleaned_text)

        entities_raw = [{'text': ent.text, 'label': ent.label_} for ent in doc.ents]
        entities_filtered = filter_entities(entities_raw)
        entities = deduplicate_entities(entities_filtered)

        svo_triplets = extract_svo_triplets(doc)

        action_signals = extract_action_signals(doc, speaker_segments)

        questions = extract_questions(doc)

        speaker_entity_map = build_speaker_entity_map(speaker_segments, doc)

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