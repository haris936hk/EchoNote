# EchoNote - Project Overview

## Project Description

EchoNote is an **AI-powered meeting transcription and summarization platform** that automatically records meetings, transcribes audio to text, extracts key information using NLP, and generates comprehensive summaries with action items.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| React Router | v6 | Navigation |
| Tailwind CSS | 3.3.6 | Styling |
| HeroUI/React | 2.6.11 | UI Components |
| RecordRTC | 5.6.2 | In-browser audio recording |
| Axios | 1.6.2 | HTTP Client |
| Framer Motion | 11.18.2 | Animations |
| React OAuth | - | Google OAuth integration |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.18.2 | Web Framework |
| Prisma ORM | 5.7.1 | Database ORM |
| PostgreSQL | - | Database (via Supabase) |
| Supabase Storage | - | Cloud file storage |
| JWT | 9.0.2 | Authentication tokens |
| FFmpeg | 2.1.2 | Audio processing |
| Nodemailer | 7.0.12 | Email notifications |
| Winston | 3.11.0 | Logging |

### AI/ML Stack (Python)
| Technology | Purpose |
|------------|---------|
| OpenAI Whisper | Speech-to-text transcription |
| SpaCy (en_core_web_lg) | NLP processing |
| Qwen2.5-7B (Fine-tuned) | AI summarization |
| librosa | Audio analysis |

---

## Key Features

### Core Functionality
- **Meeting Recording** - Record meetings directly in browser (up to 10 minutes)
- **Audio Upload** - Support for WebM, MP3, WAV, OGG formats
- **Meeting Organization** - Categories: Sales, Planning, Standup, One-on-One, Other
- **Search & Filter** - Search by title/content, filter by category/status

### AI-Powered Processing
- **Automatic Transcription** - Whisper ASR with word-level timestamps
- **NLP Analysis** - Entity extraction, key phrases, sentiment analysis, topic detection
- **Smart Summarization** - Executive summary, decisions, action items, next steps
- **Quality Scoring** - Completeness, actionability, and clarity metrics

### User Experience
- **Google OAuth** - Seamless authentication
- **Real-time Status** - Progressive processing updates
- **Email Notifications** - Alerts when processing completes
- **Export Functionality** - Download meetings as ZIP archive
- **Auto-Deletion** - Configurable automatic cleanup

### Processing Pipeline
```
Upload → Audio Processing → Transcription → NLP Analysis → Summarization → Complete
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│  Express API    │────▶│   PostgreSQL    │
│   (Port 3000)   │     │   (Port 5000)   │     │   (Supabase)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  Whisper │ │  SpaCy   │ │  Qwen2.5 │
              │  (ASR)   │ │  (NLP)   │ │  (LLM)   │
              └──────────┘ └──────────┘ └──────────┘
```

---

## Client Type & Industry

**Target Market:** Business/Corporate Productivity

**Target Users:**
- Sales teams (call documentation)
- Product/Engineering teams (planning meetings)
- Team leads (standups and syncs)
- Managers (one-on-ones)
- General business professionals

**Primary Use Cases:**
- Meeting minutes and documentation
- Action item tracking and follow-up
- Sales call analysis
- Compliance recording
- Team collaboration and alignment

---

## Technical Highlights

- **Async Processing Queue** - Background job processing with retry logic
- **Multi-stage Pipeline** - Modular processing with detailed logging
- **Security** - Helmet, CORS, rate limiting, JWT authentication
- **Scalable Storage** - Cloud-based audio storage via Supabase
- **Real-time Updates** - Polling mechanism for processing status
- **Error Handling** - Automatic retries with exponential backoff

---

## Database Schema

### Core Tables
- `users` - Google OAuth user profiles and settings
- `meetings` - Meeting data, audio, transcripts, summaries
- `processing_logs` - Detailed processing stage logs
- `user_activities` - Analytics and usage tracking

---

## Development

```bash
# Frontend (port 3000)
cd frontend && npm install && npm start

# Backend (port 5000)
cd backend && npm install && npm run dev
```

### Environment Requirements
- Node.js 18+
- Python 3.8+ (with Whisper, SpaCy)
- PostgreSQL (Supabase)
- FFmpeg installed locally
