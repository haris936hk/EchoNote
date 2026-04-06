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
import multiprocessing

# Use whisperx instead of standard whisper
from whisperx import load_model, load_audio, load_align_model, align
from whisperx.diarize import DiarizationPipeline, assign_word_speakers
from utils import Logger

warnings.filterwarnings('ignore')

# ── CPU thread tuning ────────────────────────────────────────────────────────
_PHYSICAL_CORES = multiprocessing.cpu_count()
_OMP_THREADS = str(max(2, _PHYSICAL_CORES // 4))
os.environ.setdefault("OMP_NUM_THREADS", _OMP_THREADS)
os.environ.setdefault("MKL_NUM_THREADS", _OMP_THREADS)

# WhisperX configuration
MODEL_NAME = "base.en"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
BATCH_SIZE = 4 if DEVICE == "cpu" else 16
CPU_THREADS = int(_OMP_THREADS)

class WhisperXTranscriber:
    """WhisperX transcription with alignment and diarization"""
    
    def __init__(self):
        self.model = None
        self.model_name = MODEL_NAME
        self.device = DEVICE
        self.compute_type = COMPUTE_TYPE
        self.align_models = {}  # Cache for alignment models by language
        self.diarize_model = None
        
    def load_models(self):
        """Pre-load the main transcription model"""
        if self.model is None:
            print(f"🤖 Loading WhisperX model: {self.model_name} ({self.device}, {self.compute_type}, threads={CPU_THREADS})", file=sys.stderr)
            with Logger.suppress_stdout():
                self.model = load_model(
                    self.model_name,
                    self.device,
                    compute_type=self.compute_type,
                    threads=CPU_THREADS,
                    download_root=None,
                )
        
        if self.diarize_model is None:
            print(f"🗣️ Loading Diarization model...", file=sys.stderr)
            with Logger.suppress_stdout():
                self.diarize_model = DiarizationPipeline(device=self.device)

    def get_align_model(self, language_code):
        """Get or load alignment model for language"""
        if language_code not in self.align_models:
            print(f"⏱️ Loading Alignment model for '{language_code}'...", file=sys.stderr)
            with Logger.suppress_stdout():
                model_a, metadata = load_align_model(language_code=language_code, device=self.device)
                self.align_models[language_code] = (model_a, metadata)
        return self.align_models[language_code]

    def transcribe(self, audio_path: str) -> dict:
        """
        Transcribe audio file, align timestamps, and assign speakers.
        Args: audio_path
        Returns: Dict with transcription results including speakers
        """
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            # Ensure models are loaded
            self.load_models()
            
            # Check HF_TOKEN
            hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                print("⚠️ HF_TOKEN not found in environment. Diarization will fail.", file=sys.stderr)
            
            print(f"\n📝 Transcribing: {os.path.basename(audio_path)}", file=sys.stderr)
            print("=" * 60, file=sys.stderr)
            
            start_time = time.time()
            
            # 1. Load audio and transcribe
            audio = load_audio(audio_path)
            
            print(f"🎙️ Running base transcription...", file=sys.stderr)
            with Logger.suppress_stdout():
                result = self.model.transcribe(audio, batch_size=BATCH_SIZE)
            
            # 2. Align
            language_code = result["language"]
            print(f"⏱️ Aligning words ({language_code})...", file=sys.stderr)
            model_a, metadata = self.get_align_model(language_code)
            with Logger.suppress_stdout():
                result = align(result["segments"], model_a, metadata, audio, self.device, return_char_alignments=False)
            
            # 3. Diarize
            print(f"🗣️ Diarizing speakers...", file=sys.stderr)
            with Logger.suppress_stdout():
                # self.diarize_model is already loaded
                diarize_segments = self.diarize_model(audio)
            
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
                'text': combined_text,
                'segments': formatted_segments,
                'language': language_code,
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
    """Main entry point for CLI usage (still reload every time if called this way)"""
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