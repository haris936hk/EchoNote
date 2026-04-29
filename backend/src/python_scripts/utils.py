#!/usr/bin/env python3

import os
import sys
import json
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import numpy as np
from datetime import datetime, timedelta
import contextlib

class Logger:

    @staticmethod
    def info(message: str):

        print(f"ℹ️  {message}", file=sys.stderr)

    @staticmethod
    def success(message: str):

        print(f"✅ {message}", file=sys.stderr)

    @staticmethod
    def warning(message: str):

        print(f"⚠️  {message}", file=sys.stderr)

    @staticmethod
    def error(message: str):

        print(f"❌ {message}", file=sys.stderr)

    @staticmethod
    def debug(message: str):

        print(f"🔍 {message}", file=sys.stderr)

    @staticmethod
    def separator(char: str = "=", length: int = 60):

        print(char * length, file=sys.stderr)

    @staticmethod
    def section(title: str):

        print(f"\n{'='*60}", file=sys.stderr)
        print(f"{title}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)

    @staticmethod
    @contextlib.contextmanager
    def suppress_stdout():

        with open(os.devnull, "w") as devnull:
            old_stdout = sys.stdout
            sys.stdout = devnull
            try:
                yield
            finally:
                sys.stdout = old_stdout

class FileValidator:

    AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac']
    AUDIO_MIME_TYPES = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/flac'
    ]

    MAX_AUDIO_SIZE = 50 * 1024 * 1024
    MIN_AUDIO_SIZE = 1024

    @staticmethod
    def validate_audio_file(file_path: str) -> Dict[str, Any]:

        try:

            if not os.path.exists(file_path):
                return {
                    'valid': False,
                    'error': f'File not found: {file_path}'
                }

            if not os.path.isfile(file_path):
                return {
                    'valid': False,
                    'error': f'Not a file: {file_path}'
                }

            file_size = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()

            if file_ext not in FileValidator.AUDIO_EXTENSIONS:
                return {
                    'valid': False,
                    'error': f'Unsupported audio format: {file_ext}. Supported: {", ".join(FileValidator.AUDIO_EXTENSIONS)}'
                }

            if file_size < FileValidator.MIN_AUDIO_SIZE:
                return {
                    'valid': False,
                    'error': f'File too small: {FileValidator.format_file_size(file_size)}'
                }

            if file_size > FileValidator.MAX_AUDIO_SIZE:
                return {
                    'valid': False,
                    'error': f'File too large: {FileValidator.format_file_size(file_size)}. Maximum: {FileValidator.format_file_size(FileValidator.MAX_AUDIO_SIZE)}'
                }

            return {
                'valid': True,
                'file_size': file_size,
                'file_ext': file_ext,
                'file_name': os.path.basename(file_path)
            }

        except Exception as e:
            return {
                'valid': False,
                'error': f'Validation error: {str(e)}'
            }

    @staticmethod
    def format_file_size(size_bytes: int) -> str:

        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

    @staticmethod
    def ensure_directory_exists(directory_path: str) -> bool:

        try:
            os.makedirs(directory_path, exist_ok=True)
            return True
        except Exception as e:
            Logger.error(f"Failed to create directory {directory_path}: {str(e)}")
            return False

class AudioUtils:

    @staticmethod
    def calculate_duration(audio_array: np.ndarray, sample_rate: int) -> float:

        return len(audio_array) / sample_rate

    @staticmethod
    def calculate_rms(audio_array: np.ndarray) -> float:

        return float(np.sqrt(np.mean(audio_array ** 2)))

    @staticmethod
    def calculate_peak(audio_array: np.ndarray) -> float:

        return float(np.abs(audio_array).max())

    @staticmethod
    def calculate_snr_estimate(audio_array: np.ndarray) -> float:

        from scipy.fft import rfft

        fft_vals = np.abs(rfft(audio_array))

        signal_threshold = np.percentile(fft_vals, 75)
        signal_power = np.mean(fft_vals[fft_vals > signal_threshold] ** 2)

        noise_threshold = np.percentile(fft_vals, 25)
        noise_power = np.mean(fft_vals[fft_vals < noise_threshold] ** 2)

        if noise_power > 0:
            snr_db = 10 * np.log10(signal_power / noise_power)
            return float(max(0, min(60, snr_db)))

        return 0.0

    @staticmethod
    def detect_clipping(audio_array: np.ndarray, threshold: float = 0.99) -> Dict[str, Any]:

        clipped_samples = np.sum(np.abs(audio_array) >= threshold)
        total_samples = len(audio_array)
        clipping_percentage = (clipped_samples / total_samples) * 100

        return {
            'is_clipped': clipped_samples > 0,
            'clipped_samples': int(clipped_samples),
            'total_samples': int(total_samples),
            'clipping_percentage': float(clipping_percentage)
        }

    @staticmethod
    def validate_audio_quality(audio_array: np.ndarray, sample_rate: int) -> Dict[str, Any]:

        duration = AudioUtils.calculate_duration(audio_array, sample_rate)
        rms = AudioUtils.calculate_rms(audio_array)
        peak = AudioUtils.calculate_peak(audio_array)
        snr = AudioUtils.calculate_snr_estimate(audio_array)
        clipping = AudioUtils.detect_clipping(audio_array)

        issues = []
        quality_score = 100

        if duration < 1:
            issues.append("Audio too short (< 1 second)")
            quality_score -= 30
        elif duration > 180:
            issues.append("Audio exceeds 3-minute limit")
            quality_score -= 20

        if rms < 0.01:
            issues.append("Audio level too low")
            quality_score -= 25
        elif rms > 0.5:
            issues.append("Audio level too high")
            quality_score -= 15

        if clipping['clipping_percentage'] > 1:
            issues.append(f"Audio clipping detected ({clipping['clipping_percentage']:.1f}%)")
            quality_score -= 30

        if snr < 10:
            issues.append("High background noise (low SNR)")
            quality_score -= 20

        quality_level = "excellent" if quality_score >= 80 else \
                       "good" if quality_score >= 60 else \
                       "fair" if quality_score >= 40 else "poor"

        return {
            'quality_score': max(0, quality_score),
            'quality_level': quality_level,
            'duration': duration,
            'rms': rms,
            'peak': peak,
            'snr_db': snr,
            'clipping': clipping,
            'issues': issues,
            'passed': len(issues) == 0
        }

class TextUtils:

    @staticmethod
    def clean_text(text: str) -> str:

        if not text:
            return ""

        text = ' '.join(text.split())

        text = text.strip()

        return text

    @staticmethod
    def truncate_text(text: str, max_length: int = 500, suffix: str = "...") -> str:

        if len(text) <= max_length:
            return text

        return text[:max_length - len(suffix)] + suffix

    @staticmethod
    def count_words(text: str) -> int:

        return len(text.split())

    @staticmethod
    def count_sentences(text: str) -> int:

        import re
        sentences = re.split(r'[.!?]+', text)
        return len([s for s in sentences if s.strip()])

    @staticmethod
    def calculate_reading_time(text: str, wpm: int = 200) -> int:

        word_count = TextUtils.count_words(text)
        return max(1, round(word_count / wpm))

    @staticmethod
    def extract_key_phrases(text: str, top_n: int = 10) -> List[str]:

        from collections import Counter
        import re

        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())

        stop_words = {
            'this', 'that', 'these', 'those', 'with', 'from', 'have',
            'would', 'could', 'should', 'about', 'which', 'their',
            'there', 'where', 'when', 'what', 'will', 'been', 'were'
        }

        words = [w for w in words if w not in stop_words]

        word_counts = Counter(words)

        return [word for word, _ in word_counts.most_common(top_n)]

class TimeUtils:

    @staticmethod
    def format_duration(seconds: float) -> str:

        if seconds < 60:
            return f"{seconds:.1f}s"

        minutes = int(seconds // 60)
        secs = int(seconds % 60)

        if minutes < 60:
            return f"{minutes}m {secs}s"

        hours = minutes // 60
        minutes = minutes % 60
        return f"{hours}h {minutes}m {secs}s"

    @staticmethod
    def format_timestamp(seconds: float) -> str:

        total_seconds = int(seconds)
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60

        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"

    @staticmethod
    def get_current_timestamp() -> str:

        return datetime.now().isoformat()

class JsonUtils:

    @staticmethod
    def success_response(data: Any, message: str = None) -> Dict[str, Any]:

        response = {
            'success': True,
            'data': data,
            'timestamp': TimeUtils.get_current_timestamp()
        }

        if message:
            response['message'] = message

        return response

    @staticmethod
    def error_response(error: str, details: Any = None) -> Dict[str, Any]:

        response = {
            'success': False,
            'error': error,
            'timestamp': TimeUtils.get_current_timestamp()
        }

        if details:
            response['details'] = details

        return response

    @staticmethod
    def output_json(data: Dict[str, Any]):

        print(json.dumps(data, indent=None, ensure_ascii=False))

class HashUtils:

    @staticmethod
    def file_hash(file_path: str, algorithm: str = 'sha256') -> str:

        hash_func = hashlib.new(algorithm)

        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_func.update(chunk)

        return hash_func.hexdigest()

    @staticmethod
    def text_hash(text: str, algorithm: str = 'sha256') -> str:

        hash_func = hashlib.new(algorithm)
        hash_func.update(text.encode('utf-8'))
        return hash_func.hexdigest()

class PerformanceTimer:

    def __init__(self, operation_name: str = "Operation", log: bool = True):
        self.operation_name = operation_name
        self.log = log
        self.start_time = None
        self.end_time = None
        self.duration = None

    def __enter__(self):
        self.start_time = time.time()
        if self.log:
            Logger.info(f"Starting: {self.operation_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time

        if self.log:
            if exc_type is None:
                Logger.success(f"Completed: {self.operation_name} in {TimeUtils.format_duration(self.duration)}")
            else:
                Logger.error(f"Failed: {self.operation_name} after {TimeUtils.format_duration(self.duration)}")

        return False

def validate_input_file(file_path: str, file_type: str = "audio") -> Tuple[bool, Optional[str]]:

    if file_type == "audio":
        result = FileValidator.validate_audio_file(file_path)
        return result['valid'], result.get('error')

    return False, "Unknown file type"

def ensure_output_directory(output_path: str) -> bool:

    output_dir = os.path.dirname(output_path)
    if output_dir:
        return FileValidator.ensure_directory_exists(output_dir)
    return True

def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:

    try:
        if denominator == 0:
            return default
        return numerator / denominator
    except:
        return default

def clamp(value: float, min_val: float, max_val: float) -> float:

    return max(min_val, min(max_val, value))

__all__ = [
    'Logger',
    'FileValidator',
    'AudioUtils',
    'TextUtils',
    'TimeUtils',
    'JsonUtils',
    'HashUtils',
    'PerformanceTimer',
    'validate_input_file',
    'ensure_output_directory',
    'safe_divide',
    'clamp'
]