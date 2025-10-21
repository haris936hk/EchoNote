#!/usr/bin/env python3
"""
EchoNote Transcription Service
Whisper-based speech-to-text with contextual biasing
Optimized for meeting transcription accuracy
"""

import sys
import json
import os
import time
import whisper
import torch
import numpy as np
from typing import Dict, List, Optional
import warnings

warnings.filterwarnings('ignore')

# Whisper configuration
MODEL_NAME = "base.en"  # Options: tiny.en, base.en, small.en, medium.en, large
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "float32"

# Transcription parameters
LANGUAGE = "en"
BEAM_SIZE = 5  # Higher = more accurate but slower
BEST_OF = 5  # Number of candidates to consider
TEMPERATURE = 0.0  # 0 = deterministic, higher = more random
NO_SPEECH_THRESHOLD = 0.6  # Confidence threshold for speech detection
LOGPROB_THRESHOLD = -1.0  # Minimum log probability
COMPRESSION_RATIO_THRESHOLD = 2.4  # Maximum compression ratio

# Meeting-specific vocabulary for contextual biasing
MEETING_VOCABULARY = [
    # Common meeting terms
    "standup", "scrum", "sprint", "backlog", "retrospective",
    "action items", "follow-up", "deliverables", "timeline",
    "deadline", "milestone", "KPI", "ROI", "Q1", "Q2", "Q3", "Q4",
    
    # Technical terms
    "API", "backend", "frontend", "database", "server",
    "deployment", "production", "staging", "git", "GitHub",
    "pull request", "merge", "commit", "branch",
    
    # Business terms
    "revenue", "budget", "forecast", "quarter", "fiscal",
    "stakeholder", "shareholder", "investor", "client",
    
    # Communication terms
    "Zoom", "Teams", "Slack", "email", "calendar",
    "schedule", "reschedule", "postpone", "cancel"
]


class WhisperTranscriber:
    """Whisper-based transcription with meeting optimizations"""
    
    def __init__(self):
        self.model = None
        self.model_name = MODEL_NAME
        self.device = DEVICE
        
    def load_model(self):
        """Load Whisper model"""
        print(f"🤖 Loading Whisper model: {self.model_name}", file=sys.stderr)
        print(f"📱 Device: {self.device}", file=sys.stderr)
        
        start_time = time.time()
        
        self.model = whisper.load_model(
            self.model_name,
            device=self.device
        )
        
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.2f}s", file=sys.stderr)
        
    def transcribe(self, audio_path: str) -> Dict:
        """
        Transcribe audio file to text
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with transcription results
        """
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            print(f"\n📝 Transcribing: {os.path.basename(audio_path)}", file=sys.stderr)
            print("=" * 60, file=sys.stderr)
            
            start_time = time.time()
            
            # Transcribe with optimized parameters
            result = self.model.transcribe(
                audio_path,
                language=LANGUAGE,
                task="transcribe",
                beam_size=BEAM_SIZE,
                best_of=BEST_OF,
                temperature=TEMPERATURE,
                no_speech_threshold=NO_SPEECH_THRESHOLD,
                logprob_threshold=LOGPROB_THRESHOLD,
                compression_ratio_threshold=COMPRESSION_RATIO_THRESHOLD,
                condition_on_previous_text=True,  # Use context from previous segments
                initial_prompt=self._get_initial_prompt(),  # Contextual biasing
                word_timestamps=False,  # Disable for faster processing
                verbose=False
            )
            
            transcription_time = time.time() - start_time
            
            # Extract results
            text = result["text"].strip()
            segments = result["segments"]
            language_confidence = result.get("language", LANGUAGE)
            
            # Calculate confidence metrics
            avg_logprob = np.mean([seg["avg_logprob"] for seg in segments]) if segments else 0
            no_speech_prob = np.mean([seg["no_speech_prob"] for seg in segments]) if segments else 0
            
            # Convert log probability to confidence percentage
            confidence = self._calculate_confidence(avg_logprob, no_speech_prob)
            
            print("=" * 60, file=sys.stderr)
            print(f"✅ Transcription complete!", file=sys.stderr)
            print(f"⏱️  Time: {transcription_time:.2f}s", file=sys.stderr)
            print(f"📊 Confidence: {confidence:.1f}%", file=sys.stderr)
            print(f"📝 Length: {len(text)} characters", file=sys.stderr)
            print(f"🗣️  Segments: {len(segments)}", file=sys.stderr)
            print("", file=sys.stderr)
            
            return {
                'success': True,
                'text': text,
                'segments': self._format_segments(segments),
                'language': language_confidence,
                'confidence': float(confidence),
                'duration': float(result.get('duration', 0)),
                'transcription_time': float(transcription_time),
                'metrics': {
                    'avg_logprob': float(avg_logprob),
                    'no_speech_prob': float(no_speech_prob),
                    'num_segments': len(segments),
                    'words_per_minute': self._calculate_wpm(text, result.get('duration', 0))
                }
            }
            
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}", file=sys.stderr)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_initial_prompt(self) -> str:
        """
        Generate initial prompt for contextual biasing
        This helps Whisper recognize meeting-specific terms
        """
        prompt_terms = MEETING_VOCABULARY[:50]  # Use first 50 terms
        prompt = "This is a business meeting discussion. " + ", ".join(prompt_terms[:20]) + "."
        return prompt
    
    def _calculate_confidence(self, avg_logprob: float, no_speech_prob: float) -> float:
        """
        Calculate confidence percentage from Whisper metrics
        
        Args:
            avg_logprob: Average log probability
            no_speech_prob: Probability of no speech
            
        Returns:
            Confidence percentage (0-100)
        """
        # Convert log probability to confidence
        # Whisper logprob typically ranges from -1.0 (good) to -2.0 (poor)
        logprob_confidence = max(0, min(100, (avg_logprob + 2.0) * 100))
        
        # Factor in no-speech probability (lower is better)
        speech_confidence = (1 - no_speech_prob) * 100
        
        # Combined confidence (weighted average)
        confidence = (logprob_confidence * 0.7) + (speech_confidence * 0.3)
        
        return max(0, min(100, confidence))
    
    def _format_segments(self, segments: List[Dict]) -> List[Dict]:
        """
        Format segment data for output
        
        Args:
            segments: Raw segments from Whisper
            
        Returns:
            Formatted segment list
        """
        formatted = []
        
        for seg in segments:
            formatted.append({
                'id': seg['id'],
                'start': float(seg['start']),
                'end': float(seg['end']),
                'text': seg['text'].strip(),
                'confidence': float(self._calculate_confidence(
                    seg['avg_logprob'],
                    seg['no_speech_prob']
                ))
            })
        
        return formatted
    
    def _calculate_wpm(self, text: str, duration: float) -> float:
        """Calculate words per minute"""
        if duration == 0:
            return 0
        
        word_count = len(text.split())
        minutes = duration / 60
        wpm = word_count / minutes if minutes > 0 else 0
        
        return float(wpm)
    
    def transcribe_with_timestamps(self, audio_path: str) -> Dict:
        """
        Transcribe with word-level timestamps (slower but more detailed)
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with word-level timestamps
        """
        try:
            print(f"📝 Transcribing with word timestamps...", file=sys.stderr)
            
            start_time = time.time()
            
            result = self.model.transcribe(
                audio_path,
                language=LANGUAGE,
                task="transcribe",
                beam_size=BEAM_SIZE,
                word_timestamps=True,  # Enable word timestamps
                condition_on_previous_text=True,
                initial_prompt=self._get_initial_prompt(),
                verbose=False
            )
            
            transcription_time = time.time() - start_time
            
            # Extract word-level timestamps
            words = []
            for segment in result["segments"]:
                if "words" in segment:
                    for word in segment["words"]:
                        words.append({
                            'word': word['word'].strip(),
                            'start': float(word['start']),
                            'end': float(word['end']),
                            'probability': float(word.get('probability', 0))
                        })
            
            print(f"✅ Word-level transcription complete: {len(words)} words", file=sys.stderr)
            
            return {
                'success': True,
                'text': result["text"].strip(),
                'words': words,
                'transcription_time': float(transcription_time)
            }
            
        except Exception as e:
            print(f"❌ Word-level transcription error: {str(e)}", file=sys.stderr)
            return {
                'success': False,
                'error': str(e)
            }


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        result = {
            'success': False,
            'error': 'Usage: transcribe.py <audio_file> [--with-timestamps]'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    with_timestamps = '--with-timestamps' in sys.argv
    
    # Validate input file
    if not os.path.exists(audio_path):
        result = {
            'success': False,
            'error': f'Audio file not found: {audio_path}'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Initialize transcriber
    transcriber = WhisperTranscriber()
    transcriber.load_model()
    
    # Transcribe
    if with_timestamps:
        result = transcriber.transcribe_with_timestamps(audio_path)
    else:
        result = transcriber.transcribe(audio_path)
    
    # Output JSON result to stdout
    print(json.dumps(result))


if __name__ == '__main__':
    main()