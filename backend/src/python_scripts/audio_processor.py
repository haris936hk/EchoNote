#!/usr/bin/env python3

import sys
import json
import os
import numpy as np
import librosa
import soundfile as sf
from scipy import signal
import warnings

warnings.filterwarnings('ignore')

TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1
SILENCE_THRESHOLD_DB = 30
SPEECH_FREQ_MIN = 80
SPEECH_FREQ_MAX = 8000

class AudioProcessor:

    def __init__(self, input_path, output_path):
        self.input_path = input_path
        self.output_path = output_path
        self.audio = None
        self.sample_rate = None
        self.duration = None

    def process(self):

        try:

            print("🔊 Step 1/4: Loading audio file...", file=sys.stderr)
            self.load_audio()

            print("📊 Step 2/4: Light normalization...", file=sys.stderr)
            self.normalize_volume()

            print("🔇 Step 3/4: Trimming silence...", file=sys.stderr)
            self.trim_silence()

            print("💾 Step 4/4: Saving audio...", file=sys.stderr)
            self.save_audio()

            metrics = self.calculate_metrics()

            return {
                'success': True,
                'output_path': self.output_path,
                'duration': float(self.duration),
                'sample_rate': int(self.sample_rate),
                'channels': 1,
                'metrics': metrics
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def load_audio(self):

        audio, sr = librosa.load(self.input_path, sr=None, mono=True)

        if sr != TARGET_SAMPLE_RATE:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SAMPLE_RATE)

        self.audio = audio
        self.sample_rate = TARGET_SAMPLE_RATE
        self.duration = len(audio) / self.sample_rate

        print(f"   ✓ Loaded: {self.duration:.2f}s, {self.sample_rate}Hz", file=sys.stderr)

    def normalize_volume(self):

        peak = np.abs(self.audio).max()

        if peak > 0.95:

            self.audio = self.audio * (0.891 / peak)
            print(f"   ✓ Normalized (peak was {peak:.3f})", file=sys.stderr)
        else:
            print(f"   ✓ No normalization needed (peak: {peak:.3f})", file=sys.stderr)

    def trim_silence(self):

        original_length = len(self.audio)

        self.audio, _ = librosa.effects.trim(
            self.audio,
            top_db=SILENCE_THRESHOLD_DB,
            frame_length=2048,
            hop_length=512
        )

        trimmed_samples = original_length - len(self.audio)
        trimmed_seconds = trimmed_samples / self.sample_rate

        self.duration = len(self.audio) / self.sample_rate
        print(f"   ✓ Trimmed {trimmed_seconds:.2f}s silence (new duration: {self.duration:.2f}s)", file=sys.stderr)

    def save_audio(self):

        self.audio = np.clip(self.audio, -1.0, 1.0)

        sf.write(
            self.output_path,
            self.audio,
            self.sample_rate,
            subtype='PCM_16'
        )

        file_size = os.path.getsize(self.output_path)
        print(f"   ✓ Saved: {file_size / 1024:.1f} KB", file=sys.stderr)

    def calculate_metrics(self):

        rms = np.sqrt(np.mean(self.audio ** 2))

        peak = np.abs(self.audio).max()

        crest_factor = peak / (rms + 1e-10)

        zcr = np.sum(librosa.zero_crossings(self.audio)) / len(self.audio)

        return {
            'rms_level': float(rms),
            'peak_level': float(peak),
            'crest_factor': float(crest_factor),
            'zero_crossing_rate': float(zcr),
            'processing_type': 'minimal_whisper_optimized'
        }

class AudioProcessorWithVAD(AudioProcessor):

    def process(self):

        try:

            print("🔊 Step 1/5: Loading audio file...", file=sys.stderr)
            self.load_audio()

            print("📊 Step 2/5: Light normalization...", file=sys.stderr)
            self.normalize_volume()

            print("🔇 Step 3/5: Trimming silence...", file=sys.stderr)
            self.trim_silence()

            print("🎤 Step 4/5: Voice activity detection...", file=sys.stderr)
            self.apply_vad()

            print("💾 Step 5/5: Saving audio...", file=sys.stderr)
            self.save_audio()

            metrics = self.calculate_metrics()

            return {
                'success': True,
                'output_path': self.output_path,
                'duration': float(self.duration),
                'sample_rate': int(self.sample_rate),
                'channels': 1,
                'metrics': metrics
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def apply_vad(self):

        intervals = librosa.effects.split(
            self.audio,
            top_db=SILENCE_THRESHOLD_DB,
            frame_length=2048,
            hop_length=512
        )

        if len(intervals) == 0:
            print(f"   ⚠ No speech detected, keeping original", file=sys.stderr)
            return

        segments = []
        pause_samples = int(0.2 * self.sample_rate)

        for start, end in intervals:
            segments.append(self.audio[start:end])
            segments.append(np.zeros(pause_samples))

        if segments:
            segments = segments[:-1]
            self.audio = np.concatenate(segments)

        self.duration = len(self.audio) / self.sample_rate
        print(f"   ✓ VAD applied ({len(intervals)} segments, duration: {self.duration:.2f}s)", file=sys.stderr)

class AudioProcessorWithBandpass(AudioProcessor):

    def process(self):

        try:

            print("🔊 Step 1/5: Loading audio file...", file=sys.stderr)
            self.load_audio()

            print("🎛️  Step 2/5: Applying gentle bandpass filter...", file=sys.stderr)
            self.apply_bandpass()

            print("📊 Step 3/5: Light normalization...", file=sys.stderr)
            self.normalize_volume()

            print("🔇 Step 4/5: Trimming silence...", file=sys.stderr)
            self.trim_silence()

            print("💾 Step 5/5: Saving audio...", file=sys.stderr)
            self.save_audio()

            metrics = self.calculate_metrics()

            return {
                'success': True,
                'output_path': self.output_path,
                'duration': float(self.duration),
                'sample_rate': int(self.sample_rate),
                'channels': 1,
                'metrics': metrics
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def apply_bandpass(self):

        sos = signal.butter(
            N=4,
            Wn=[SPEECH_FREQ_MIN, SPEECH_FREQ_MAX],
            btype='bandpass',
            fs=self.sample_rate,
            output='sos'
        )
        self.audio = signal.sosfilt(sos, self.audio)

        print(f"   ✓ Gentle bandpass applied ({SPEECH_FREQ_MIN}-{SPEECH_FREQ_MAX}Hz)", file=sys.stderr)

def main():

    if len(sys.argv) < 2:
        print("Usage: python audio_processor.py <input_file> [output_file] [--optimize]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3].lower() if len(sys.argv) > 3 else 'minimal'

    if not os.path.exists(input_path):
        result = {
            'success': False,
            'error': f'Input file not found: {input_path}'
        }
        print(json.dumps(result))
        sys.exit(1)

    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    if mode == 'vad':
        processor = AudioProcessorWithVAD(input_path, output_path)
        print(f"\n🎵 Processing with VAD: {os.path.basename(input_path)}", file=sys.stderr)
    elif mode == 'bandpass':
        processor = AudioProcessorWithBandpass(input_path, output_path)
        print(f"\n🎵 Processing with bandpass: {os.path.basename(input_path)}", file=sys.stderr)
    else:
        processor = AudioProcessor(input_path, output_path)
        print(f"\n🎵 Minimal processing: {os.path.basename(input_path)}", file=sys.stderr)

    print("=" * 60, file=sys.stderr)

    result = processor.process()

    print("=" * 60, file=sys.stderr)

    if result['success']:
        print(f"✅ Processing complete!", file=sys.stderr)
        print(f"📊 Metrics:", file=sys.stderr)
        print(f"   - Duration: {result['duration']:.2f}s", file=sys.stderr)
        print(f"   - Sample Rate: {result['sample_rate']}Hz", file=sys.stderr)
        print(f"   - RMS Level: {result['metrics']['rms_level']:.3f}", file=sys.stderr)
        print(f"   - Peak Level: {result['metrics']['peak_level']:.3f}", file=sys.stderr)
        print(f"   - Mode: {result['metrics'].get('processing_type', mode)}", file=sys.stderr)
        print("", file=sys.stderr)
    else:
        print(f"❌ Processing failed: {result['error']}", file=sys.stderr)
        print("", file=sys.stderr)

    print(json.dumps(result))

if __name__ == '__main__':
    main()