import sys
import json

sys.path.insert(0, r'backend/src/python_scripts')
import nlp_processor

text = "Good morning everyone. Let's discuss the new Lenovo device and its battery optimization. John, did you review the chip architecture? We need to ensure apps don't drain the battery. Mary will deploy the Kubernetes cluster this afternoon. When is the deployment deadline?"
res = nlp_processor.process_text(text, 'en_core_web_lg')

with open('direct_example.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, indent=2)
