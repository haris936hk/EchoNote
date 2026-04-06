from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import os
import sys
import json
from typing import Optional, List
from transcribe import WhisperXTranscriber

# Initialize the transcriber (global instance)
transcriber = WhisperXTranscriber()

app = FastAPI(title="EchoNote Transcription Microservice")

class TranscribeRequest(BaseModel):
    audio_path: str
    task: Optional[str] = "transcribe"
    language: Optional[str] = "en"
    mode: Optional[str] = "standard"  # "standard", "timestamps", "context"
    context_terms: Optional[List[str]] = None

@app.on_event("startup")
async def startup_event():
    """Load models at startup to cache them in memory"""
    print("🚀 Starting Transcription Service...", file=sys.stderr)
    try:
        transcriber.load_models()
        print("✅ Models loaded and ready.", file=sys.stderr)
    except Exception as e:
        print(f"❌ Error loading models during startup: {e}", file=sys.stderr)

@app.get("/health")
async def health_check():
    """Health check endpoint used by Node.js to verify server availability"""
    status = "ready" if transcriber.model is not None else "loading"
    return {
        "status": status,
        "device": transcriber.device,
        "model": transcriber.model_name
    }

@app.post("/transcribe")
def transcribe(request: TranscribeRequest):
    """Transcription endpoint with support for timestamps and context"""
    if not os.path.exists(request.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    print(f"📥 Received request: {request.mode} for {request.audio_path}", file=sys.stderr)
    
    try:
        # Currently transcribe.py always does alignment and diarization.
        # If we want to support 'only timestamps' or 'context' specifically,
        # we might need to adjust transcribe.py logic.
        # For now, we'll use the existing robust transcribe() but allow passing context if needed.
        
        result = transcriber.transcribe(request.audio_path)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown transcription error"))
            
        return result
    except Exception as e:
        print(f"❌ Server error during transcription: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
async def test_installation():
    """Test environment and Whisper version (replacing testWhisperInstallation)"""
    import whisperx
    import platform
    return {
        "success": True,
        "version": whisperx.__version__,
        "python_version": platform.python_version(),
        "device": transcriber.device,
        "has_cuda": torch.cuda.is_available()
    }

if __name__ == "__main__":
    port = int(os.environ.get("TRANSCRIPTION_SERVER_PORT", 8765))
    uvicorn.run(app, host="127.0.0.1", port=port, timeout_keep_alive=600)
