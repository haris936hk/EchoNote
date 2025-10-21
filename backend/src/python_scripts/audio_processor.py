#!/usr/bin/env python3
"""
EchoNote Audio Processor
Advanced audio processing with noise reduction and speech enhancement
Optimized for Whisper ASR accuracy
"""

import sys
import json
import os
import numpy as np
import librosa
import soundfile as sf
import noisereduce as nr
from scipy import signal
from scipy.fft import rfft, rfftfreq, irfft
import warnings

warnings.filterwarnings('ignore')

# Audio processing configuration
TARGET_SAMPLE_RATE = 16000  # Whisper requires 16kHz
TARGET_CHANNELS = 1  # Mono audio
NOISE_REDUCTION_STRENGTH = 0.8  # 0.0 to 1.0
SPEECH_FREQ_MIN = 85  # Human speech starts at ~85 Hz
SPEECH_FREQ_MAX = 8000  # Human speech ends at ~8000 Hz


class AudioProcessor:
    """Advanced audio processor with noise reduction and speech enhancement"""
    
    def __init__(self, input_path, output_path):
        self.input_path = input_path
        self.output_path = output_path
        self.audio = None
        self.sample_rate = None
        self.duration = None
        
    def process(self):
        """Execute complete audio processing pipeline"""
        try:
            # Step 1: Load audio
            print("🔊 Step 1/7: Loading audio file...", file=sys.stderr)
            self.load_audio()
            
            # Step 2: Normalize volume
            print("📊 Step 2/7: Normalizing volume...", file=sys.stderr)
            self.normalize_volume()
            
            # Step 3: Remove silence
            print("🔇 Step 3/7: Removing silence...", file=sys.stderr)
            self.remove_silence()
            
            # Step 4: Apply spectral gating (first pass noise reduction)
            print("🎯 Step 4/7: Applying spectral gating...", file=sys.stderr)
            self.apply_spectral_gating()
            
            # Step 5: Advanced noise reduction
            print("🧹 Step 5/7: Advanced noise reduction...", file=sys.stderr)
            self.apply_advanced_noise_reduction()
            
            # Step 6: Speech enhancement (bandpass filter)
            print("🎤 Step 6/7: Speech enhancement...", file=sys.stderr)
            self.enhance_speech()
            
            # Step 7: Final normalization and save
            print("💾 Step 7/7: Saving processed audio...", file=sys.stderr)
            self.final_normalize_and_save()
            
            # Calculate metrics
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
        """Load audio file and convert to mono 16kHz"""
        # Load with original sample rate
        audio, sr = librosa.load(self.input_path, sr=None, mono=True)
        
        # Resample to 16kHz if needed
        if sr != TARGET_SAMPLE_RATE:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SAMPLE_RATE)
        
        self.audio = audio
        self.sample_rate = TARGET_SAMPLE_RATE
        self.duration = len(audio) / self.sample_rate
        
        print(f"   ✓ Loaded: {self.duration:.2f}s, {self.sample_rate}Hz", file=sys.stderr)
    
    def normalize_volume(self):
        """Normalize audio volume to consistent level"""
        # RMS normalization
        rms = np.sqrt(np.mean(self.audio ** 2))
        target_rms = 0.1  # Target RMS level
        
        if rms > 0:
            self.audio = self.audio * (target_rms / rms)
        
        # Peak normalization to prevent clipping
        peak = np.abs(self.audio).max()
        if peak > 0.95:
            self.audio = self.audio * (0.95 / peak)
        
        print(f"   ✓ Volume normalized (RMS: {target_rms:.3f})", file=sys.stderr)
    
    def remove_silence(self):
        """Remove leading/trailing silence and long pauses"""
        # Trim silence from start and end
        self.audio, _ = librosa.effects.trim(
            self.audio,
            top_db=30,  # Threshold in dB
            frame_length=2048,
            hop_length=512
        )
        
        # Split on silence and rejoin with shorter gaps
        intervals = librosa.effects.split(
            self.audio,
            top_db=30,
            frame_length=2048,
            hop_length=512
        )
        
        # Reconstruct audio with controlled pauses
        if len(intervals) > 0:
            segments = []
            pause_samples = int(0.3 * self.sample_rate)  # 300ms pause
            
            for start, end in intervals:
                segments.append(self.audio[start:end])
                segments.append(np.zeros(pause_samples))
            
            # Remove last pause
            segments = segments[:-1]
            self.audio = np.concatenate(segments)
        
        self.duration = len(self.audio) / self.sample_rate
        print(f"   ✓ Silence removed (new duration: {self.duration:.2f}s)", file=sys.stderr)
    
    def apply_spectral_gating(self):
        """Apply spectral gating to remove stationary noise"""
        # Compute STFT
        stft = librosa.stft(self.audio, n_fft=2048, hop_length=512)
        magnitude = np.abs(stft)
        phase = np.angle(stft)
        
        # Estimate noise floor (median of lower 20% of magnitudes)
        noise_floor = np.percentile(magnitude, 20, axis=1, keepdims=True)
        
        # Apply soft gating
        threshold = noise_floor * 2.0  # 2x noise floor
        gain = np.where(
            magnitude > threshold,
            1.0,
            (magnitude / threshold) ** 2  # Smooth transition
        )
        
        # Apply gain
        gated_magnitude = magnitude * gain
        
        # Reconstruct audio
        gated_stft = gated_magnitude * np.exp(1j * phase)
        self.audio = librosa.istft(gated_stft, hop_length=512)
        
        print(f"   ✓ Spectral gating applied", file=sys.stderr)
    
    def apply_advanced_noise_reduction(self):
        """Apply advanced multi-stage noise reduction"""
        # Stage 1: Stationary noise reduction
        # Estimate noise profile from first 0.5 seconds (assumed to be noise)
        noise_sample_length = min(int(0.5 * self.sample_rate), len(self.audio) // 4)
        
        self.audio = nr.reduce_noise(
            y=self.audio,
            sr=self.sample_rate,
            stationary=True,
            prop_decrease=NOISE_REDUCTION_STRENGTH
        )
        
        print(f"   ✓ Stationary noise reduced", file=sys.stderr)
        
        # Stage 2: Non-stationary noise reduction
        self.audio = nr.reduce_noise(
            y=self.audio,
            sr=self.sample_rate,
            stationary=False,
            prop_decrease=NOISE_REDUCTION_STRENGTH * 0.7  # Less aggressive
        )
        
        print(f"   ✓ Non-stationary noise reduced", file=sys.stderr)
        
        # Stage 3: Wiener filtering for residual noise
        self.audio = self.apply_wiener_filter()
        
        print(f"   ✓ Wiener filter applied", file=sys.stderr)
    
    def apply_wiener_filter(self):
        """Apply Wiener filter for noise suppression"""
        # Compute STFT
        stft = librosa.stft(self.audio, n_fft=2048, hop_length=512)
        magnitude = np.abs(stft)
        phase = np.angle(stft)
        
        # Estimate signal and noise power
        signal_power = magnitude ** 2
        noise_power = np.percentile(signal_power, 10, axis=1, keepdims=True)
        
        # Compute Wiener gain
        wiener_gain = signal_power / (signal_power + noise_power + 1e-10)
        
        # Apply gain
        filtered_magnitude = magnitude * wiener_gain
        
        # Reconstruct
        filtered_stft = filtered_magnitude * np.exp(1j * phase)
        filtered_audio = librosa.istft(filtered_stft, hop_length=512)
        
        return filtered_audio
    
    def enhance_speech(self):
        """Enhance speech frequencies using bandpass filter and emphasis"""
        # Stage 1: Bandpass filter (85Hz - 8000Hz)
        sos = signal.butter(
            N=8,  # Filter order
            Wn=[SPEECH_FREQ_MIN, SPEECH_FREQ_MAX],
            btype='bandpass',
            fs=self.sample_rate,
            output='sos'
        )
        self.audio = signal.sosfilt(sos, self.audio)
        
        print(f"   ✓ Bandpass filter applied ({SPEECH_FREQ_MIN}-{SPEECH_FREQ_MAX}Hz)", file=sys.stderr)
        
        # Stage 2: Pre-emphasis for high frequencies (improves consonants)
        pre_emphasis = 0.97
        self.audio = np.append(
            self.audio[0],
            self.audio[1:] - pre_emphasis * self.audio[:-1]
        )
        
        print(f"   ✓ Pre-emphasis applied", file=sys.stderr)
        
        # Stage 3: Dynamic range compression (make quiet parts louder)
        self.audio = self.apply_compression()
        
        print(f"   ✓ Dynamic compression applied", file=sys.stderr)
    
    def apply_compression(self):
        """Apply dynamic range compression"""
        # Compute envelope
        analytic_signal = signal.hilbert(self.audio)
        envelope = np.abs(analytic_signal)
        
        # Smooth envelope
        window_length = int(0.01 * self.sample_rate)  # 10ms window
        if window_length % 2 == 0:
            window_length += 1
        
        envelope = signal.savgol_filter(envelope, window_length, 3)
        
        # Compression parameters
        threshold = 0.1
        ratio = 3.0  # 3:1 compression
        
        # Compute gain
        gain = np.ones_like(envelope)
        mask = envelope > threshold
        gain[mask] = threshold + (envelope[mask] - threshold) / ratio
        gain[mask] = gain[mask] / envelope[mask]
        
        # Apply gain
        compressed = self.audio * gain
        
        return compressed
    
    def final_normalize_and_save(self):
        """Final normalization and save to file"""
        # Peak normalization to -1dB (0.891)
        peak = np.abs(self.audio).max()
        if peak > 0:
            self.audio = self.audio * (0.891 / peak)
        
        # Ensure no clipping
        self.audio = np.clip(self.audio, -1.0, 1.0)
        
        # Save as WAV (16kHz mono)
        sf.write(
            self.output_path,
            self.audio,
            self.sample_rate,
            subtype='PCM_16'  # 16-bit PCM
        )
        
        file_size = os.path.getsize(self.output_path)
        print(f"   ✓ Saved: {file_size / 1024:.1f} KB", file=sys.stderr)
    
    def calculate_metrics(self):
        """Calculate audio quality metrics"""
        # RMS level
        rms = np.sqrt(np.mean(self.audio ** 2))
        
        # Peak level
        peak = np.abs(self.audio).max()
        
        # Crest factor (peak to RMS ratio)
        crest_factor = peak / (rms + 1e-10)
        
        # Zero crossing rate (speech vs noise indicator)
        zcr = np.sum(librosa.zero_crossings(self.audio)) / len(self.audio)
        
        # Signal-to-noise ratio estimate
        # Use spectral flatness as SNR proxy (lower = more tonal = better)
        spectral_flatness = librosa.feature.spectral_flatness(y=self.audio)[0]
        avg_flatness = np.mean(spectral_flatness)
        estimated_snr = 30 * (1 - avg_flatness)  # Rough estimate in dB
        
        return {
            'rms_level': float(rms),
            'peak_level': float(peak),
            'crest_factor': float(crest_factor),
            'zero_crossing_rate': float(zcr),
            'estimated_snr_db': float(estimated_snr),
            'spectral_flatness': float(avg_flatness)
        }


def main():
    """Main entry point"""
    if len(sys.argv) != 3:
        result = {
            'success': False,
            'error': 'Usage: audio_processor.py <input_file> <output_file>'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Validate input file
    if not os.path.exists(input_path):
        result = {
            'success': False,
            'error': f'Input file not found: {input_path}'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    # Process audio
    print(f"\n🎵 Processing: {os.path.basename(input_path)}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    processor = AudioProcessor(input_path, output_path)
    result = processor.process()
    
    print("=" * 60, file=sys.stderr)
    
    if result['success']:
        print(f"✅ Processing complete!", file=sys.stderr)
        print(f"📊 Metrics:", file=sys.stderr)
        print(f"   - Duration: {result['duration']:.2f}s", file=sys.stderr)
        print(f"   - Sample Rate: {result['sample_rate']}Hz", file=sys.stderr)
        print(f"   - RMS Level: {result['metrics']['rms_level']:.3f}", file=sys.stderr)
        print(f"   - Estimated SNR: {result['metrics']['estimated_snr_db']:.1f} dB", file=sys.stderr)
        print("", file=sys.stderr)
    else:
        print(f"❌ Processing failed: {result['error']}", file=sys.stderr)
        print("", file=sys.stderr)
    
    # Output JSON result to stdout
    print(json.dumps(result))


if __name__ == '__main__':
    main()