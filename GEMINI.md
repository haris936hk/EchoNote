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
  - Summarization: openai/gpt-oss-120b via Groq API (cloud-hosted, no NGROK required).
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

### 2. UI & Design Standards (The Luminous Archive)
- **Theme:** OLED Dark Mode (Primary). Absolute black foundations (`#020617`).
- **Visual Philosophy:** "Linear meets Vercel". Information-dense, premium, and functional.
- **The "No-Line" Rule:** Avoid 1px solid borders for sectioning. Use tonal transitions (surface color shifts) or "Ghost Borders" (15% opacity).
- **Typography:** 
  - **Plus Jakarta Sans:** Primary UI font. Tight tracking (-0.02em) for headings.
  - **JetBrains Mono:** Dedicated for timecodes, raw data, and technical metadata.
- **Components:**
  - **Cards:** `rounded-[16px]`. Glassmorphism for floating/AI elements (`backdrop-blur-xl`).
  - **Buttons:** `rounded-[10px]`. Primary uses 135° indigo-violet gradients.
  - **AI Signature:** Subtle sparkle icons or indigo/violet pulsing glows to denote AI-generated content.

---

## The Luminous Archive Design System

### Color PaletteTokens
| Token | Value | usage |
|-------|-------|-------|
| `bg-base` | `#020617` | Main background |
| `bg-surface` | `#0F172A` | Primary cards/surfaces |
| `surface-dim` | `#0c1324` | Application canvas |
| `accent-primary` | `#818CF8` | Primary actions (Indigo 400) |
| `accent-secondary`| `#A78BFA` | AI elements (Violet 400) |
| `cta-color` | `#22C55E` | Main CTA green |
| `text-primary` | `#F8FAFC` | Main headings |
| `text-secondary` | `#94A3B8` | Body text |
| `border-ghost` | `rgba(255,255,255,0.06)` | Ultra-subtle felt borders |

### Core Rules
1. **OLED Contrast:** Embrace pure black `#020617`. Use negative space as a premium asset.
2. **Technical/Narrative Split:** Always use Mono for timestamps/durations and Sans for textual content.
3. **Glass Layering:** Only use glass/blur for elements floating over other content (modals, popovers).
4. **No Placeholder Emojis:** Use Lucide icons (`react-icons/lu`) exclusively for UI. No standard emojis. **CRITICAL: When importing from `react-icons/lu`, you MUST use the `Lu` prefix for the icon name (e.g., `import { LuCalendar, LuClock } from 'react-icons/lu';`).**

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
- **Model API:** Summarization uses the Groq API (no local NGROK tunnel needed).

## Troubleshooting & Verification
- **Test Scripts:** Use `backend/scripts/test-*.js` for email and transport verification.
- **Python Integration:** Use `backend/src/python_scripts/*.py` with JSON inputs for manual testing.
- **Database:** `npx prisma studio` for visual data management.

Refer to `CLAUDE.md` for even more granular technical specifications, `PROJECT_OVERVIEW.md` for high-level business logic, and the following for exhaustive design details:
- `stitch/echonote_midnight/DESIGN.md`: Full "Luminous Archive" design system specification.
- `stitch_ui_ux_prompt.md`: Comprehensive UI/UX design brief and aesthetic direction.
