#!/usr/bin/env python3
# filepath: youtube_to_transcript.py
# purpose: Download YouTube transcript and save as numbered file

import os
import sys
import json
import subprocess
from pathlib import Path
import re

OUTPUT_DIR = "transcripts"

def setup():
    """Create output directory and check yt-dlp"""
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    try:
        subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
        return True
    except:
        print("❌ Install yt-dlp: pip install yt-dlp")
        return False

def get_next_number():
    """Get next available number for filename"""
    existing = list(Path(OUTPUT_DIR).glob("transcript_*.txt"))
    if not existing:
        return 1
    
    numbers = []
    for f in existing:
        match = re.search(r'transcript_(\d+)\.txt', f.name)
        if match:
            numbers.append(int(match.group(1)))
    
    return max(numbers) + 1 if numbers else 1

def parse_vtt(vtt_file):
    """Parse VTT subtitle file and extract text"""
    with open(vtt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    transcript_lines = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('WEBVTT') or '-->' in line or line.isdigit():
            continue
        line = re.sub(r'<[^>]+>', '', line)
        if line:
            transcript_lines.append(line)
    
    transcript = ' '.join(transcript_lines)
    transcript = re.sub(r'\s+', ' ', transcript).strip()
    
    return transcript

def download_transcript(youtube_url):
    """Download transcript from YouTube"""
    print(f"📥 Downloading transcript...")
    
    try:
        # Try auto-generated subtitles first
        subprocess.run([
            'yt-dlp',
            '--skip-download',
            '--write-auto-sub',
            '--sub-lang', 'en',
            '--sub-format', 'vtt',
            '--output', 'temp_subtitle',
            youtube_url
        ], capture_output=True, text=True, timeout=30)
        
        vtt_file = 'temp_subtitle.en.vtt'
        if os.path.exists(vtt_file):
            transcript = parse_vtt(vtt_file)
            os.remove(vtt_file)
            print(f"✓ Downloaded ({len(transcript)} characters)")
            return transcript
        
        # Try manual subtitles
        subprocess.run([
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
            print(f"✓ Downloaded ({len(transcript)} characters)")
            return transcript
        
        print("❌ No transcript available")
        return None
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

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

def save_transcript(transcript, number, title, youtube_url):
    """Save transcript to numbered file"""
    filename = f"{OUTPUT_DIR}/transcript_{number:03d}.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"Title: {title}\n")
        f.write(f"URL: {youtube_url}\n")
        f.write(f"{'='*70}\n\n")
        f.write(transcript)
    
    # Save metadata
    meta_filename = f"{OUTPUT_DIR}/transcript_{number:03d}_meta.json"
    metadata = {
        'number': number,
        'title': title,
        'url': youtube_url,
        'filename': filename,
        'word_count': len(transcript.split()),
        'char_count': len(transcript)
    }
    
    with open(meta_filename, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    return filename

def process_youtube_url(youtube_url):
    """Main processing function"""
    
    print(f"\n{'='*70}")
    print(f"Processing YouTube Video")
    print(f"{'='*70}\n")
    
    # Get video info
    title, duration = get_video_info(youtube_url)
    print(f"Title: {title}")
    print(f"Duration: {duration}\n")
    
    # Download transcript
    transcript = download_transcript(youtube_url)
    if not transcript:
        return False
    
    word_count = len(transcript.split())
    print(f"Words: {word_count}\n")
    
    # Save
    number = get_next_number()
    filename = save_transcript(transcript, number, title, youtube_url)
    
    print(f"{'='*70}")
    print(f"✅ Saved to: {filename}")
    print(f"{'='*70}\n")
    
    return True

def main():
    if not setup():
        sys.exit(1)
    
    if len(sys.argv) > 1:
        youtube_url = sys.argv[1]
    else:
        youtube_url = input("YouTube URL: ").strip()
        if not youtube_url:
            print("❌ No URL provided")
            sys.exit(1)
    
    success = process_youtube_url(youtube_url)
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main()