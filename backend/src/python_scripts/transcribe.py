#!/usr/bin/env python3
"""
EchoNote Transcription Service (WhisperX Diarization)
WhisperX-based speech-to-text with word-level alignment and speaker diarization.
Optimized for meeting transcription accuracy.
"""

import sys
import json
import os
import time
import torch
import warnings

# Use whisperx instead of standard whisper
from whisperx import load_model, load_audio, load_align_model, align
from whisperx.diarize import DiarizationPipeline, assign_word_speakers
from utils import Logger

warnings.filterwarnings('ignore')

# WhisperX configuration
MODEL_NAME = "base.en"  # Options: tiny.en, base.en, small.en, medium.en, large
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
BATCH_SIZE = 16

class WhisperXTranscriber:
    """WhisperX transcription with alignment and diarization"""
    
    def __init__(self):
        self.model = None
        self.model_name = MODEL_NAME
        self.device = DEVICE
        self.compute_type = COMPUTE_TYPE
        
    def transcribe(self, audio_path: str) -> dict:
        """
        Transcribe audio file, align timestamps, and assign speakers.
        Args: audio_path
        Returns: Dict with transcription results including speakers
        """
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            # Check HF_TOKEN
            hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                print("⚠️ HF_TOKEN not found in environment. Diarization will fail.", file=sys.stderr)
            
            print(f"\n📝 Transcribing: {os.path.basename(audio_path)}", file=sys.stderr)
            print("=" * 60, file=sys.stderr)
            
            start_time = time.time()
            
            # 1. Load audio and transcribe
            print(f"🤖 Loading WhisperX model: {self.model_name}", file=sys.stderr)
            with Logger.suppress_stdout():
                self.model = load_model(self.model_name, self.device, compute_type=self.compute_type)
            
            audio = load_audio(audio_path)
            
            print(f"🎙️ Running base transcription...", file=sys.stderr)
            with Logger.suppress_stdout():
                result = self.model.transcribe(audio, batch_size=BATCH_SIZE)
            
            # 2. Align
            print(f"⏱️ Aligning words...", file=sys.stderr)
            with Logger.suppress_stdout():
                model_a, metadata = load_align_model(language_code=result["language"], device=self.device)
                result = align(result["segments"], model_a, metadata, audio, self.device, return_char_alignments=False)
            
            # 3. Diarize
            print(f"🗣️ Diarizing speakers...", file=sys.stderr)
            with Logger.suppress_stdout():
                diarize_model = DiarizationPipeline(device=self.device)
                diarize_segments = diarize_model(audio)
            
            # 4. Assign Speakers
            print(f"🔗 Assigning speakers to words...", file=sys.stderr)
            with Logger.suppress_stdout():
                result = assign_word_speakers(diarize_segments, result)
            
            transcription_time = time.time() - start_time
            
            segments = result["segments"]
            
            # Construct unified text and build formatted segments
            full_text = []
            formatted_segments = []
            
            for seg in segments:
                text = seg["text"].strip()
                full_text.append(text)
                
                formatted_segments.append({
                    'start': float(seg['start']),
                    'end': float(seg['end']),
                    'text': text,
                    'speaker': seg.get('speaker', 'SPEAKER_UNKNOWN')
                })
                
            combined_text = " ".join(full_text)
            
            print("=" * 60, file=sys.stderr)
            print(f"✅ Transcription & Diarization complete!", file=sys.stderr)
            print(f"⏱️ Time: {transcription_time:.2f}s", file=sys.stderr)
            print(f"🗣️ Segments: {len(segments)}", file=sys.stderr)
            print("", file=sys.stderr)
            
            return {
                'success': True,
                'text': combined_text,  # Clean text without speaker tags, just appended
                'segments': formatted_segments, # Has speaker mapping
                'language': result.get("language", "en"),
                'transcription_time': float(transcription_time)
            }
            
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        result = {
            'success': False,
            'error': 'Usage: transcribe.py <audio_file>'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Initialize transcriber
    transcriber = WhisperXTranscriber()
    
    # Transcribe
    result = transcriber.transcribe(audio_path)
    
    # Output JSON result to stdout
    print(json.dumps(result))

if __name__ == '__main__':
    main()