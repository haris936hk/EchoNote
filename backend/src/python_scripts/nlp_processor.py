# backend/src/python_scripts/nlp_processor.py
import sys
import json
import spacy
from textblob import TextBlob
import warnings
warnings.filterwarnings("ignore")

def process_text(text, model_name):
    """
    Process text and extract NLP features matching the dataset format.
    Returns: {
        "success": true,
        "entities": [{"text": "Ky", "label": "PERSON"}, ...],
        "keyPhrases": ["you guys", "all ages", "a deal"],
        "actionPatterns": [{"action": "cut", "object": "it"}, ...],
        "sentiment": {"label": "positive", "score": 0.18},
        "topics": ["kid", "cardboard", "offer"]
    }
    """
    try:
        # Load SpaCy model with all components
        nlp = spacy.load(model_name)

        # Process text
        doc = nlp(text)

        # Extract named entities (with text and label only)
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_
            })

        # Extract key phrases (simple strings, top 8)
        phrase_freq = {}
        for chunk in doc.noun_chunks:
            phrase = chunk.text.lower().strip()
            if len(phrase.split()) <= 4 and len(phrase) > 2:  # 2-4 word phrases
                phrase_freq[phrase] = phrase_freq.get(phrase, 0) + 1

        # Get top phrases by frequency
        key_phrases = [phrase for phrase, freq in sorted(phrase_freq.items(), key=lambda x: x[1], reverse=True)[:8]]

        # Extract action patterns (verb: object format)
        action_patterns = []
        seen_patterns = set()

        for token in doc:
            if token.pos_ == 'VERB' and token.dep_ in ['ROOT', 'relcl', 'ccomp']:
                # Find direct objects
                objects = []
                for child in token.children:
                    if child.dep_ in ['dobj', 'pobj', 'attr']:
                        obj_text = child.text
                        # Include compound nouns
                        compounds = [c.text for c in child.children if c.dep_ == 'compound']
                        if compounds:
                            obj_text = ' '.join(compounds + [child.text])
                        objects.append(obj_text)

                if objects:
                    for obj in objects:
                        pattern_key = f"{token.lemma_}:{obj.lower()}"
                        if pattern_key not in seen_patterns:
                            action_patterns.append({
                                'action': token.lemma_,
                                'object': obj.lower()
                            })
                            seen_patterns.add(pattern_key)
                            if len(action_patterns) >= 10:  # Limit to 10
                                break
            if len(action_patterns) >= 10:
                break

        # Sentiment analysis using TextBlob
        blob = TextBlob(text)
        polarity = round(blob.sentiment.polarity, 2)

        # Determine sentiment label
        if polarity > 0.05:
            sentiment_label = 'positive'
        elif polarity < -0.05:
            sentiment_label = 'negative'
        else:
            sentiment_label = 'neutral'

        sentiment = {
            'label': sentiment_label,
            'score': polarity
        }

        # Extract topics (top 5 most frequent nouns/proper nouns)
        word_freq = {}
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN'] and not token.is_stop and len(token.text) > 2:
                word = token.lemma_.lower()
                word_freq[word] = word_freq.get(word, 0) + 1

        # Get top 5 topics as simple strings
        topics = [word for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]]

        return {
            'success': True,
            'entities': entities,
            'keyPhrases': key_phrases,
            'actionPatterns': action_patterns,
            'sentiment': sentiment,
            'topics': topics
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'entities': [],
            'keyPhrases': [],
            'actionPatterns': [],
            'sentiment': {'label': 'neutral', 'score': 0.0},
            'topics': []
        }

def extract_entities(text, model_name):
    nlp = spacy.load(model_name)
    doc = nlp(text)
    
    entities = []
    for ent in doc.ents:
        entities.append({
            'text': ent.text,
            'label': ent.label_,
            'start': ent.start_char,
            'end': ent.end_char
        })
    
    return {'entities': entities}

def extract_key_phrases(text, model_name, top_n):
    nlp = spacy.load(model_name)
    doc = nlp(text)
    
    phrase_freq = {}
    for chunk in doc.noun_chunks:
        phrase = chunk.text.lower().strip()
        if len(phrase.split()) > 1:  # Multi-word phrases only
            phrase_freq[phrase] = phrase_freq.get(phrase, 0) + 1
    
    key_phrases = []
    total_chunks = len(list(doc.noun_chunks))
    for phrase, freq in sorted(phrase_freq.items(), key=lambda x: x[1], reverse=True)[:top_n]:
        key_phrases.append({
            'phrase': phrase,
            'score': min(freq / max(total_chunks / 10, 1), 1.0),
            'frequency': freq
        })
    
    return {'key_phrases': key_phrases}

def extract_actions(text, model_name):
    nlp = spacy.load(model_name)
    doc = nlp(text)
    
    actions = []
    action_verbs = ['deploy', 'review', 'update', 'create', 'implement', 'test', 'fix', 'merge', 'schedule', 'send', 'prepare', 'discuss', 'analyze']
    
    for sent in doc.sents:
        for token in sent:
            if token.pos_ == 'VERB' and (token.dep_ == 'ROOT' or token.lemma_ in action_verbs):
                # Find direct objects
                objects = []
                context = []
                
                for child in token.children:
                    if child.dep_ in ['dobj', 'pobj', 'attr']:
                        objects.append(child.text)
                        # Get compounds
                        for subchild in child.children:
                            if subchild.dep_ == 'compound':
                                objects.insert(0, subchild.text)
                    elif child.dep_ in ['prep', 'advmod', 'aux']:
                        context.append(child.text)
                        # Get prep objects
                        for subchild in child.children:
                            if subchild.dep_ == 'pobj':
                                context.append(subchild.text)
                
                if objects:
                    actions.append({
                        'text': sent.text.strip(),
                        'verb': token.lemma_,
                        'object': ' '.join(objects),
                        'context': ' '.join(context) if context else None,
                        'confidence': 0.7 + (0.15 if context else 0)
                    })
    
    return {'actions': actions}

def analyze_sentiment(text):
    blob = TextBlob(text)
    return {
        'polarity': blob.sentiment.polarity,
        'subjectivity': blob.sentiment.subjectivity
    }

def extract_topics(text, model_name, top_n):
    nlp = spacy.load(model_name)
    doc = nlp(text)
    
    word_freq = {}
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and not token.is_stop and len(token.text) > 2:
            word = token.lemma_.lower()
            word_freq[word] = word_freq.get(word, 0) + 1
    
    topics = []
    max_freq = max(word_freq.values()) if word_freq else 1
    for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:top_n]:
        topics.append({
            'term': word,
            'score': freq / max_freq,
            'category': 'general'
        })
    
    return {'topics': topics}

def extract_dates(text, model_name):
    nlp = spacy.load(model_name)
    doc = nlp(text)
    
    dates = []
    for ent in doc.ents:
        if ent.label_ in ['DATE', 'TIME']:
            date_type = 'DATE' if ent.label_ == 'DATE' else 'TIME'
            dates.append({
                'text': ent.text,
                'normalized': ent.text,  # Would use dateparser for actual normalization
                'type': date_type
            })
    
    return {'dates': dates}

if __name__ == '__main__':
    if sys.argv[1] == 'test':
        # Test mode
        import platform
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
        elif mode == 'entities':
            result = extract_entities(text, model_name)
        elif mode == 'keyphrases':
            top_n = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            result = extract_key_phrases(text, model_name, top_n)
        elif mode == 'actions':
            result = extract_actions(text, model_name)
        elif mode == 'sentiment':
            result = analyze_sentiment(text)
        elif mode == 'topics':
            top_n = int(sys.argv[3]) if len(sys.argv) > 3 else 5
            result = extract_topics(text, model_name, top_n)
        elif mode == 'dates':
            result = extract_dates(text, model_name)
        
        print(json.dumps(result))