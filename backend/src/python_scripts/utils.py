#!/usr/bin/env python3
"""
EchoNote Python Utilities
Shared functions for audio processing, transcription, and NLP
"""

import os
import sys
import json
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import numpy as np
from datetime import datetime, timedelta


class Logger:
    """Utility logger for consistent output formatting"""
    
    @staticmethod
    def info(message: str):
        """Log info message to stderr"""
        print(f"ℹ️  {message}", file=sys.stderr)
    
    @staticmethod
    def success(message: str):
        """Log success message to stderr"""
        print(f"✅ {message}", file=sys.stderr)
    
    @staticmethod
    def warning(message: str):
        """Log warning message to stderr"""
        print(f"⚠️  {message}", file=sys.stderr)
    
    @staticmethod
    def error(message: str):
        """Log error message to stderr"""
        print(f"❌ {message}", file=sys.stderr)
    
    @staticmethod
    def debug(message: str):
        """Log debug message to stderr"""
        print(f"🔍 {message}", file=sys.stderr)
    
    @staticmethod
    def separator(char: str = "=", length: int = 60):
        """Print separator line"""
        print(char * length, file=sys.stderr)
    
    @staticmethod
    def section(title: str):
        """Print section header"""
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"{title}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)


class FileValidator:
    """File validation utilities"""
    
    # Supported audio formats
    AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac']
    AUDIO_MIME_TYPES = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/flac'
    ]
    
    # File size limits
    MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50 MB
    MIN_AUDIO_SIZE = 1024  # 1 KB
    
    @staticmethod
    def validate_audio_file(file_path: str) -> Dict[str, Any]:
        """
        Validate audio file
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Dictionary with validation result
        """
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                return {
                    'valid': False,
                    'error': f'File not found: {file_path}'
                }
            
            # Check if it's a file (not directory)
            if not os.path.isfile(file_path):
                return {
                    'valid': False,
                    'error': f'Not a file: {file_path}'
                }
            
            # Get file info
            file_size = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Check file extension
            if file_ext not in FileValidator.AUDIO_EXTENSIONS:
                return {
                    'valid': False,
                    'error': f'Unsupported audio format: {file_ext}. Supported: {", ".join(FileValidator.AUDIO_EXTENSIONS)}'
                }
            
            # Check file size
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
        """Format file size in human-readable format"""
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
        """
        Ensure directory exists, create if it doesn't
        
        Args:
            directory_path: Path to directory
            
        Returns:
            True if directory exists or was created
        """
        try:
            os.makedirs(directory_path, exist_ok=True)
            return True
        except Exception as e:
            Logger.error(f"Failed to create directory {directory_path}: {str(e)}")
            return False


class AudioUtils:
    """Audio processing utilities"""
    
    @staticmethod
    def calculate_duration(audio_array: np.ndarray, sample_rate: int) -> float:
        """Calculate audio duration in seconds"""
        return len(audio_array) / sample_rate
    
    @staticmethod
    def calculate_rms(audio_array: np.ndarray) -> float:
        """Calculate RMS (Root Mean Square) level"""
        return float(np.sqrt(np.mean(audio_array ** 2)))
    
    @staticmethod
    def calculate_peak(audio_array: np.ndarray) -> float:
        """Calculate peak level"""
        return float(np.abs(audio_array).max())
    
    @staticmethod
    def calculate_snr_estimate(audio_array: np.ndarray) -> float:
        """
        Estimate Signal-to-Noise Ratio in dB
        Uses spectral analysis for estimation
        """
        from scipy.fft import rfft
        
        # Compute FFT
        fft_vals = np.abs(rfft(audio_array))
        
        # Estimate signal (top 25% of spectrum)
        signal_threshold = np.percentile(fft_vals, 75)
        signal_power = np.mean(fft_vals[fft_vals > signal_threshold] ** 2)
        
        # Estimate noise (bottom 25% of spectrum)
        noise_threshold = np.percentile(fft_vals, 25)
        noise_power = np.mean(fft_vals[fft_vals < noise_threshold] ** 2)
        
        # Calculate SNR in dB
        if noise_power > 0:
            snr_db = 10 * np.log10(signal_power / noise_power)
            return float(max(0, min(60, snr_db)))  # Clamp to 0-60 dB
        
        return 0.0
    
    @staticmethod
    def detect_clipping(audio_array: np.ndarray, threshold: float = 0.99) -> Dict[str, Any]:
        """
        Detect audio clipping
        
        Args:
            audio_array: Audio samples
            threshold: Clipping threshold (0-1)
            
        Returns:
            Dictionary with clipping info
        """
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
        """
        Validate audio quality metrics
        
        Args:
            audio_array: Audio samples
            sample_rate: Sample rate in Hz
            
        Returns:
            Dictionary with quality assessment
        """
        duration = AudioUtils.calculate_duration(audio_array, sample_rate)
        rms = AudioUtils.calculate_rms(audio_array)
        peak = AudioUtils.calculate_peak(audio_array)
        snr = AudioUtils.calculate_snr_estimate(audio_array)
        clipping = AudioUtils.detect_clipping(audio_array)
        
        # Assess quality
        issues = []
        quality_score = 100
        
        # Check duration
        if duration < 1:
            issues.append("Audio too short (< 1 second)")
            quality_score -= 30
        elif duration > 180:  # 3 minutes
            issues.append("Audio exceeds 3-minute limit")
            quality_score -= 20
        
        # Check RMS level
        if rms < 0.01:
            issues.append("Audio level too low")
            quality_score -= 25
        elif rms > 0.5:
            issues.append("Audio level too high")
            quality_score -= 15
        
        # Check clipping
        if clipping['clipping_percentage'] > 1:
            issues.append(f"Audio clipping detected ({clipping['clipping_percentage']:.1f}%)")
            quality_score -= 30
        
        # Check SNR
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
    """Text processing utilities"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 500, suffix: str = "...") -> str:
        """Truncate text to maximum length"""
        if len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def count_words(text: str) -> int:
        """Count words in text"""
        return len(text.split())
    
    @staticmethod
    def count_sentences(text: str) -> int:
        """Count sentences in text"""
        import re
        sentences = re.split(r'[.!?]+', text)
        return len([s for s in sentences if s.strip()])
    
    @staticmethod
    def calculate_reading_time(text: str, wpm: int = 200) -> int:
        """Calculate reading time in minutes"""
        word_count = TextUtils.count_words(text)
        return max(1, round(word_count / wpm))
    
    @staticmethod
    def extract_key_phrases(text: str, top_n: int = 10) -> List[str]:
        """
        Extract key phrases using simple frequency analysis
        
        Args:
            text: Input text
            top_n: Number of key phrases to extract
            
        Returns:
            List of key phrases
        """
        from collections import Counter
        import re
        
        # Extract words (alphanumeric only)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        # Common stop words to exclude
        stop_words = {
            'this', 'that', 'these', 'those', 'with', 'from', 'have',
            'would', 'could', 'should', 'about', 'which', 'their',
            'there', 'where', 'when', 'what', 'will', 'been', 'were'
        }
        
        # Filter stop words
        words = [w for w in words if w not in stop_words]
        
        # Count frequencies
        word_counts = Counter(words)
        
        # Return top N
        return [word for word, _ in word_counts.most_common(top_n)]


class TimeUtils:
    """Time formatting utilities"""
    
    @staticmethod
    def format_duration(seconds: float) -> str:
        """Format duration in human-readable format"""
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
        """Format timestamp in MM:SS or HH:MM:SS format"""
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
        """Get current timestamp in ISO format"""
        return datetime.now().isoformat()


class JsonUtils:
    """JSON utilities for consistent output"""
    
    @staticmethod
    def success_response(data: Any, message: str = None) -> Dict[str, Any]:
        """Create success response"""
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
        """Create error response"""
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
        """Output JSON to stdout"""
        print(json.dumps(data, indent=None, ensure_ascii=False))


class HashUtils:
    """Hashing utilities"""
    
    @staticmethod
    def file_hash(file_path: str, algorithm: str = 'sha256') -> str:
        """
        Calculate file hash
        
        Args:
            file_path: Path to file
            algorithm: Hash algorithm (md5, sha1, sha256)
            
        Returns:
            Hex digest of file hash
        """
        hash_func = hashlib.new(algorithm)
        
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_func.update(chunk)
        
        return hash_func.hexdigest()
    
    @staticmethod
    def text_hash(text: str, algorithm: str = 'sha256') -> str:
        """Calculate text hash"""
        hash_func = hashlib.new(algorithm)
        hash_func.update(text.encode('utf-8'))
        return hash_func.hexdigest()


class PerformanceTimer:
    """Context manager for timing operations"""
    
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
        
        return False  # Don't suppress exceptions


# Convenience functions for common operations

def validate_input_file(file_path: str, file_type: str = "audio") -> Tuple[bool, Optional[str]]:
    """
    Validate input file
    
    Args:
        file_path: Path to file
        file_type: Type of file (audio, text, etc.)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if file_type == "audio":
        result = FileValidator.validate_audio_file(file_path)
        return result['valid'], result.get('error')
    
    # Add other file types as needed
    return False, "Unknown file type"


def ensure_output_directory(output_path: str) -> bool:
    """Ensure output directory exists"""
    output_dir = os.path.dirname(output_path)
    if output_dir:
        return FileValidator.ensure_directory_exists(output_dir)
    return True


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division with default value"""
    try:
        if denominator == 0:
            return default
        return numerator / denominator
    except:
        return default


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max"""
    return max(min_val, min(max_val, value))


# Export all utilities
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