#!/usr/bin/env python3
"""
YouTube to Training Prompt Generator
Automates: YouTube URL → Transcript → NLP Processing → Enhanced Prompt
"""

import os
import sys
import json
import subprocess
from pathlib import Path
import re

# Configuration
OUTPUT_DIR = "training_prompts"
NLP_PROCESSOR = "nlp_processor.py"  # Path to your nlp_processor.py

def setup():
    """Create output directory and check dependencies"""
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # Check if yt-dlp is installed
    try:
        subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
    except:
        print("❌ yt-dlp not found. Install with: pip install yt-dlp")
        return False
    
    # Check if nlp_processor exists
    if not os.path.exists(NLP_PROCESSOR):
        print(f"❌ {NLP_PROCESSOR} not found in current directory")
        return False
    
    return True

def get_next_number():
    """Get next available number for filename"""
    existing = list(Path(OUTPUT_DIR).glob("prompt_*.txt"))
    if not existing:
        return 1
    
    numbers = []
    for f in existing:
        match = re.search(r'prompt_(\d+)\.txt', f.name)
        if match:
            numbers.append(int(match.group(1)))
    
    return max(numbers) + 1 if numbers else 1

def download_transcript(youtube_url):
    """Download transcript from YouTube using yt-dlp"""
    print(f"\n📥 Downloading transcript from YouTube...")
    
    try:
        # Try to get auto-generated subtitles first
        result = subprocess.run([
            'yt-dlp',
            '--skip-download',
            '--write-auto-sub',
            '--sub-lang', 'en',
            '--sub-format', 'vtt',
            '--output', 'temp_subtitle',
            youtube_url
        ], capture_output=True, text=True, timeout=30)
        
        # Check if subtitle file was created
        vtt_file = 'temp_subtitle.en.vtt'
        if os.path.exists(vtt_file):
            transcript = parse_vtt(vtt_file)
            os.remove(vtt_file)  # Cleanup
            print(f"  ✓ Transcript downloaded ({len(transcript)} characters)")
            return transcript
        
        # If auto-sub fails, try manual subtitles
        result = subprocess.run([
            'yt-dlp',
            '--skip-download',
            '--write-sub',
            '--sub-lang', 'en',
            '--sub-format', 'vtt',
            '--output', 'temp_subtitle',
            youtube_url
        ], capture_output=True, text=True, timeout=30)
        
        if os.path.exists(vtt_file):
            transcript = parse_vtt(vtt_file)
            os.remove(vtt_file)
            print(f"  ✓ Transcript downloaded ({len(transcript)} characters)")
            return transcript
        
        print("  ❌ No transcript available for this video")
        return None
        
    except subprocess.TimeoutExpired:
        print("  ❌ Download timed out")
        return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def parse_vtt(vtt_file):
    """Parse VTT subtitle file and extract text"""
    with open(vtt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove VTT headers and timestamps
    lines = content.split('\n')
    transcript_lines = []
    
    for line in lines:
        line = line.strip()
        # Skip empty lines, timestamps, and WEBVTT header
        if not line or line.startswith('WEBVTT') or '-->' in line or line.isdigit():
            continue
        # Remove HTML tags
        line = re.sub(r'<[^>]+>', '', line)
        if line:
            transcript_lines.append(line)
    
    transcript = ' '.join(transcript_lines)
    
    # Clean up multiple spaces
    transcript = re.sub(r'\s+', ' ', transcript).strip()
    
    return transcript

def get_video_info(youtube_url):
    """Get video title and duration"""
    try:
        result = subprocess.run([
            'yt-dlp',
            '--get-title',
            '--get-duration',
            youtube_url
        ], capture_output=True, text=True, timeout=15)
        
        lines = result.stdout.strip().split('\n')
        title = lines[0] if len(lines) > 0 else "Untitled"
        duration = lines[1] if len(lines) > 1 else "Unknown"
        
        return title, duration
        
    except:
        return "Untitled", "Unknown"

def run_nlp_processor(transcript):
    """Run NLP processor on transcript"""
    print("\n🧠 Running NLP processor...")
    
    try:
        # Write transcript to temp file to avoid command line length limit
        temp_file = 'temp_transcript.txt'
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(transcript)
        
        # Read from file and pass to NLP processor
        with open(temp_file, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        # For Windows compatibility, use 'python' instead of 'python3'
        python_cmd = 'python' if os.name == 'nt' else 'python3'
        
        result = subprocess.run(
            [python_cmd, NLP_PROCESSOR, transcript_text, 'full'],
            capture_output=True,
            text=True,
            timeout=120  # Increased timeout for long transcripts
        )
        
        # Clean up temp file
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        if result.returncode != 0:
            print(f"  ❌ NLP processor error: {result.stderr}")
            return None
        
        nlp_data = json.loads(result.stdout)
        
        # Extract cleaned transcript from statistics if available
        # Your nlp_processor might return cleaned text - adjust as needed
        cleaned_transcript = transcript  # Use original if no cleaning output
        
        print(f"  ✓ Entities: {len(nlp_data.get('entities', []))}")
        print(f"  ✓ Key phrases: {len(nlp_data.get('key_phrases', []))}")
        print(f"  ✓ Actions: {len(nlp_data.get('actions', []))}")
        print(f"  ✓ Topics: {len(nlp_data.get('topics', []))}")
        
        return nlp_data, cleaned_transcript
        
    except subprocess.TimeoutExpired:
        print("  ❌ NLP processing timed out (try shorter video)")
        if os.path.exists('temp_transcript.txt'):
            os.remove('temp_transcript.txt')
        return None
    except json.JSONDecodeError as e:
        print(f"  ❌ Invalid JSON output: {e}")
        return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def format_nlp_features(nlp_data):
    """Format NLP features for prompt"""
    parts = []
    
    # Entities
    entities = nlp_data.get('entities', [])[:15]
    if entities:
        entity_list = ", ".join([f"{e['text']} ({e['label']})" for e in entities])
        parts.append(f"**Entities:** {entity_list}")
    else:
        parts.append("**Entities:** None identified")
    
    # Key Phrases
    phrases = nlp_data.get('key_phrases', [])[:8]
    if phrases:
        phrase_list = ", ".join([f"{p['phrase']}" for p in phrases])
        parts.append(f"**Key Phrases:** {phrase_list}")
    else:
        parts.append("**Key Phrases:** None identified")
    
    # Actions
    actions = nlp_data.get('actions', [])[:10]
    if actions:
        action_items = []
        for a in actions:
            action_items.append(f"  • {a.get('verb', 'action')}: {a.get('object', 'N/A')}")
        parts.append("**Action Patterns:**\n" + "\n".join(action_items))
    else:
        parts.append("**Action Patterns:** None identified")
    
    # Sentiment
    sentiment = nlp_data.get('sentiment', {})
    polarity = sentiment.get('polarity', 0)
    if polarity > 0.1:
        sentiment_label = "Positive"
    elif polarity < -0.1:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Neutral"
    parts.append(f"**Sentiment:** {sentiment_label} (polarity: {polarity:.2f})")
    
    # Topics
    topics = nlp_data.get('topics', [])[:7]
    if topics:
        topic_list = ", ".join([t['term'] for t in topics])
        parts.append(f"**Topics:** {topic_list}")
    else:
        parts.append("**Topics:** None identified")
    
    return "\n\n".join(parts)

def create_prompt(cleaned_transcript, nlp_data, title, category="General"):
    """Create enhanced prompt for Claude/ChatGPT"""
    
    nlp_text = format_nlp_features(nlp_data)
    
    prompt = f"""You are an expert meeting assistant that creates structured, actionable summaries.

You will receive:
1. A cleaned meeting transcript (filler words removed)
2. Pre-extracted NLP features to guide your analysis

MEETING INFORMATION
Title: {title}
Category: {category}

CLEANED TRANSCRIPT
{cleaned_transcript}

NLP FEATURES (Pre-extracted)
{nlp_text}

TASK
Create a comprehensive summary in JSON format using BOTH the transcript and NLP features:

{{
  "executiveSummary": "2-3 sentences capturing main purpose and outcomes",
  "keyDecisions": "Important decisions made, or 'No major decisions recorded'",
  "actionItems": [
    {{
      "task": "What needs to be done",
      "assignee": "Person responsible or null",
      "deadline": "When due or null",
      "priority": "high/medium/low"
    }}
  ],
  "nextSteps": "What happens next after this meeting",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive/neutral/negative/mixed"
}}

GUIDELINES
- Use identified entities to ensure accuracy
- Match action items with extracted action patterns
- Align topics with pre-identified themes
- Be concise but comprehensive
- Extract ONLY information from the transcript
- If assignee/deadline not mentioned, use null
- If no action items, return empty array []

Return ONLY the JSON object, no additional text."""
    
    return prompt

def save_prompt(prompt, number, title):
    """Save prompt to numbered file"""
    filename = f"{OUTPUT_DIR}/prompt_{number:03d}.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(prompt)
    
    # Also save metadata
    meta_filename = f"{OUTPUT_DIR}/prompt_{number:03d}_meta.json"
    metadata = {
        'number': number,
        'title': title,
        'filename': filename
    }
    
    with open(meta_filename, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    return filename

def process_youtube_url(youtube_url, category="General"):
    """Main processing function"""
    
    print(f"\n{'='*70}")
    print(f"Processing YouTube Video")
    print(f"{'='*70}")
    
    # Get video info
    print("\n📺 Getting video info...")
    title, duration = get_video_info(youtube_url)
    print(f"  Title: {title}")
    print(f"  Duration: {duration}")
    
    # Download transcript
    transcript = download_transcript(youtube_url)
    if not transcript:
        print("\n❌ Failed to get transcript")
        return False
    
    # Check transcript length
    word_count = len(transcript.split())
    char_count = len(transcript)
    print(f"  Transcript: {word_count} words, {char_count} characters")
    
    # Warn if too long
    if word_count > 5000:
        print(f"\n⚠️  WARNING: This transcript is VERY LONG ({word_count} words)")
        print(f"  Recommended: Use videos 5-15 minutes long")
        print(f"  This video: {duration}")
        print(f"\nOptions:")
        print(f"  1. Continue anyway (may take 2-3 minutes to process)")
        print(f"  2. Skip this video")
        response = input("\nContinue? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            print("Skipped.")
            return False
    
    # Run NLP processor
    result = run_nlp_processor(transcript)
    if not result:
        print("\n❌ Failed to process with NLP")
        print("Try a shorter video (5-15 minutes ideal)")
        return False
    
    nlp_data, cleaned_transcript = result
    
    # Create prompt
    print("\n📝 Creating enhanced prompt...")
    prompt = create_prompt(cleaned_transcript, nlp_data, title, category)
    
    # Save to file
    number = get_next_number()
    filename = save_prompt(prompt, number, title)
    
    print(f"\n{'='*70}")
    print(f"✅ SUCCESS!")
    print(f"{'='*70}")
    print(f"Prompt saved to: {filename}")
    print(f"Prompt number: {number}")
    print(f"\nNEXT STEPS:")
    print(f"1. Open file: {filename}")
    print(f"2. Copy entire content")
    print(f"3. Paste into Claude.ai or ChatGPT")
    print(f"4. Save response as: response_{number:03d}.json")
    print(f"{'='*70}\n")
    
    return True

def main():
    """Main entry point"""
    
    print("\n" + "="*70)
    print("YouTube to Training Prompt Generator")
    print("="*70)
    
    # Setup
    if not setup():
        sys.exit(1)
    
    # Get YouTube URL
    if len(sys.argv) > 1:
        youtube_url = sys.argv[1]
        category = sys.argv[2] if len(sys.argv) > 2 else "General"
    else:
        python_cmd = 'python' if os.name == 'nt' else 'python3'
        print("\nUsage:")
        print(f"  {python_cmd} youtube_to_prompt.py <youtube_url> [category]")
        print("\nExample:")
        print(f"  {python_cmd} youtube_to_prompt.py 'https://youtube.com/watch?v=xxxxx' SALES")
        print("\nCategories: SALES, PLANNING, STANDUP, ONE_ON_ONE, OTHER")
        print("\nOR run interactively:")
        print()
        
        youtube_url = input("Enter YouTube URL: ").strip()
        if not youtube_url:
            print("❌ No URL provided")
            sys.exit(1)
        
        category = input("Enter category (SALES/PLANNING/STANDUP/ONE_ON_ONE/OTHER) [General]: ").strip()
        if not category:
            category = "General"
    
    # Process
    success = process_youtube_url(youtube_url, category)
    
    if success:
        # Ask if user wants to process another
        print("\nProcess another video? (yes/no): ", end="")
        response = input().strip().lower()
        if response in ['yes', 'y']:
            main()
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
