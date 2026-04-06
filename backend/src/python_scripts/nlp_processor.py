# backend/src/python_scripts/nlp_processor.py
import sys
import json
import spacy
from textblob import TextBlob
import warnings
from utils import Logger
warnings.filterwarnings("ignore")

def process_text(text, model_name):
    """
    Process text and extract NLP features matching the dataset format.
    Returns: {
        "success": true,
        "entities": [{"text": "Ky", "label": "PERSON"}, ...],
        "svoTriplets": [{"subject": "...", "verb": "...", "object": "..."}, ...],
        "sentiment": {"label": "positive", "score": 0.18}
    }
    """
    try:
        # Load SpaCy model with all components
        nlp = spacy.load(model_name)

        # Load custom entities
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        try:
            with open(os.path.join(base_dir, 'entities_config.json'), 'r') as f:
                custom_patterns = json.load(f)
            if not nlp.has_pipe("entity_ruler"):
                ruler = nlp.add_pipe("entity_ruler", before="ner")
                ruler.add_patterns(custom_patterns)
        except Exception:
            pass

        # Process text
        doc = nlp(text)

        # Extract named entities (with text and label only)
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_
            })

        # Extract SVO Triplets (Subject-Verb-Object)
        svo_triplets = []
        for token in doc:
            if token.pos_ == 'VERB':
                subjects = [w for w in token.lefts if w.dep_ in ("nsubj", "nsubjpass")]
                objects = [w for w in token.rights if w.dep_ in ("dobj", "pobj", "attr")]
                
                if subjects and objects:
                    subj_text = " ".join([t.text for t in subjects[0].subtree])
                    obj_text = " ".join([t.text for t in objects[0].subtree])
                    svo_triplets.append({
                        'subject': subj_text.strip(),
                        'verb': token.lemma_.strip(),
                        'object': obj_text.strip()
                    })
                    if len(svo_triplets) >= 15:
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

        return {
            'success': True,
            'entities': entities,
            'svoTriplets': svo_triplets,
            'sentiment': sentiment
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'entities': [],
            'svoTriplets': [],
            'sentiment': {'label': 'neutral', 'score': 0.0}
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