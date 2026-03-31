# GEMINI.md - EchoNote Project Context

This file serves as the primary instructional context for Gemini CLI when working within the EchoNote repository. It outlines the project architecture, development standards, and critical operational workflows.

## Project Overview
**EchoNote** is an AI-powered productivity platform that transcribes and summarizes meetings. It captures audio (up to 10 minutes), optimizes it, converts speech to text, extracts key entities/actions, and generates structured summaries using a fine-tuned LLM.

### Tech Stack
- **Frontend:** React 18, HeroUI (NextUI), Tailwind CSS, RecordRTC (Audio), Axios, Framer Motion.
- **Backend:** Node.js 18 (Express), Prisma ORM (PostgreSQL via Supabase), Supabase Storage.
- **AI/ML Pipeline (Python):** 
  - Audio Processing: `librosa`, `noisereduce`.
  - Transcription: OpenAI Whisper (`base.en`).
  - NLP Analysis: SpaCy (`en_core_web_lg`).
  - Summarization: Fine-tuned Qwen2.5-7B (hosted via NGROK API).
- **Notifications:** Gmail OAuth2 with Nodemailer.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- FFmpeg (installed on system)
- PostgreSQL (Supabase)

### Build & Run Commands

#### Root / Docker
```bash
# Start full environment (Database, Backend, Frontend)
docker-compose up
```

#### Backend (Port 5000)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
# Python dependencies
pip install -r src/python_scripts/requirements.txt
python -m spacy download en_core_web_lg
# Run development server
npm run dev
```

#### Frontend (Port 3000)
```bash
cd frontend
npm install
npm start
```

---

## Development Conventions

### 1. Sequential Processing Pipeline (Critical)
The AI pipeline MUST be sequential. Never attempt to parallelize these stages:
`Audio Optimization → Transcription (Whisper) → NLP Analysis (SpaCy) → Summarization (Qwen2.5) → Email`

### 2. UI & Design Standards
- **Theme:** Dark mode only.
- **Visuals:** Modern, rounded aesthetics.
  - Cards: `rounded-xl` or `rounded-3xl`.
  - Buttons: `radius="full"` (pill design).
  - Page Headers: Pill-shaped containers.

### 3. Authentication
- **Mechanism:** Google OAuth 2.0 ONLY. No local password system.
- **Frontend:** `@react-oauth/google`.
- **Backend:** JWT-based sessions.

### 4. Code Patterns
- **Async Operations:** Always wrap in `try/catch`.
- **API Responses:** Return structured `{ success: boolean, data?: any, error?: string }`.
- **Logging:** Use Winston (`backend/src/utils/logger.js`) for server-side logging.
- **Database:** Prisma is the source of truth for schema changes.

---

## Key Project Structure

### Backend (`/backend`)
- `src/python_scripts/`: Core AI logic (Audio, Whisper, SpaCy).
- `src/services/meeting.service.js`: The "Orchestrator" for the AI pipeline.
- `src/controllers/`: Request handlers for Auth, Meetings, and Users.
- `prisma/schema.prisma`: Data models for Users, Meetings, and Processing Logs.

### Frontend (`/frontend`)
- `src/components/meeting/`: UI for recording, transcripts, and summaries.
- `src/contexts/`: Global state (Auth, Meeting, Theme).
- `src/pages/`: Main application views (Dashboard, Record, Meetings).

---

## Critical Constraints
- **Recording Limit:** Hard 10-minute limit (600 seconds).
- **Audio Format:** Whisper requires 16kHz mono PCM WAV.
- **Storage:** Audio files are temporary; delete local copies after Supabase upload.
- **Model API:** Summarization requires an active NGROK tunnel to the Qwen2.5-7B model.

## Troubleshooting & Verification
- **Test Scripts:** Use `backend/scripts/test-*.js` for email and transport verification.
- **Python Integration:** Use `backend/src/python_scripts/*.py` with JSON inputs for manual testing.
- **Database:** `npx prisma studio` for visual data management.

Refer to `CLAUDE.md` for even more granular technical specifications and `PROJECT_OVERVIEW.md` for high-level business logic.
