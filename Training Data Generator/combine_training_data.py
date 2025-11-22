#!/usr/bin/env python3
"""
Combine prompt and response files into training_data.json for Mistral fine-tuning
"""

import json
import re
from pathlib import Path

def find_pairs(prompt_dir="training_prompts", response_dir="training_responses"):
    """Find all matching prompt/response pairs"""
    prompt_folder = Path(prompt_dir)
    response_folder = Path(response_dir)
    
    if not prompt_folder.exists():
        print(f"❌ {prompt_dir} folder not found")
        return []
    
    if not response_folder.exists():
        print(f"❌ {response_dir} folder not found")
        return []
    
    prompt_files = list(prompt_folder.glob("prompt_*"))
    prompt_files = [f for f in prompt_files if not f.name.endswith('_meta.json')]
    
    pairs = []
    for prompt_file in sorted(prompt_files):
        match = re.search(r'prompt_(\d+)', prompt_file.name)
        if not match:
            continue
        
        number = match.group(1)
        response_file = response_folder / f"response_{number}"
        if not response_file.exists():
            response_file = response_folder / f"response_{number}.json"
        
        if response_file.exists():
            pairs.append((str(prompt_file), str(response_file), number))
            print(f"  ✓ Pair {number}")
        else:
            print(f"  ⚠ Missing response_{number}")
    
    return pairs

def create_training_data(pairs, output_file="training_data.json"):
    """Combine pairs into Mistral instruction format"""
    training_data = []
    
    for prompt_path, response_path, number in pairs:
        try:
            # Read prompt
            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt = f.read().strip()
            
            # Read response
            with open(response_path, 'r', encoding='utf-8') as f:
                response = json.load(f)
            
            # Format response as JSON string (model should output this)
            response_str = json.dumps(response, indent=2, ensure_ascii=False)
            
            # Create Mistral instruction format
            # [INST] marks instruction, model learns to generate what comes after [/INST]
            text = f"[INST] {prompt} [/INST] {response_str}"
            
            training_data.append({"text": text})
            
        except Exception as e:
            print(f"  ❌ Error {number}: {e}")
            continue
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, indent=2, ensure_ascii=False)
    
    return len(training_data)

def main():
    print("\n" + "="*60)
    print("Training Data Combiner - Mistral Format")
    print("="*60)
    
    print("\nScanning for prompt/response pairs...")
    pairs = find_pairs()
    
    if not pairs:
        print("\n❌ No matching pairs found")
        return
    
    print(f"\n✓ Found {len(pairs)} pairs")
    print("\nCombining with [INST] tags...")
    count = create_training_data(pairs)
    
    print(f"\n{'='*60}")
    print(f"✅ Created training_data.json")
    print(f"   Examples: {count}")
    print(f"   Format: [INST] prompt [/INST] response")
    print(f"\nReady for Colab fine-tuning!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()