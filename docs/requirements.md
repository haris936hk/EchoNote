# EchoNote: Functional & Non-Functional Requirements (Atomic Breakdown)

This document provides a granular, SRP-compliant audit of the requirements implemented in the EchoNote codebase. Each requirement is mapped to its core responsibility.

---

## 1. Authentication & Authorization (FR.AUTH)

- **FR.AUTH.01**: System shall support Google OAuth 2.0 as the primary authentication mechanism.
- **FR.AUTH.02**: System shall validate Google `idToken` on the backend via `google-auth-library`.
- **FR.AUTH.03**: System shall implement JWT-based session management using Access and Refresh tokens.
- **FR.AUTH.04**: System shall persist user identity (Email, Name, Avatar) in the PostgreSQL database upon first login.
- **FR.AUTH.05**: System shall enforce a rate limit of 10 authentication requests per 15 minutes per IP.
- **FR.AUTH.06**: System shall allow users to revoke all other active sessions except the current one.
- **FR.AUTH.07**: System shall provide an endpoint to verify token validity and return current user metadata.
- **FR.AUTH.08**: System shall support disconnection (revocation) of Google OAuth permissions from the settings.

---

## 2. Audio Processing Pipeline (FR.AUDIO)

- **FR.AUDIO.01**: System shall enforce a maximum audio duration limit of 600 seconds (10 minutes).
- **FR.AUDIO.02**: System shall enforce a maximum file size limit of 50MB for audio uploads.
- **FR.AUDIO.03**: System shall support audio formats: MP3, WAV, WEBM, OGG, and M4A.
- **FR.AUDIO.04**: System shall validate audio files using `ffprobe` to ensure duration and metadata integrity.
- **FR.AUDIO.05**: System shall normalize audio levels using `librosa` to ensure consistent volume for AI processing.
- **FR.AUDIO.06**: System shall perform noise reduction on uploaded audio files to improve transcription accuracy.
- **FR.AUDIO.07**: System shall automatically trim excessive silence from the beginning and end of audio recordings.
- **FR.AUDIO.08**: System shall convert all non-standard audio formats to a unified 16kHz mono PCM WAV for AI pipeline entry.
- **FR.AUDIO.09**: System shall utilize Python-based scripts for advanced DSP (normalization, noise reduction) via `PythonShell`.

---

## 3. AI Intelligence & Extraction (FR.AI)

- **FR.AI.01**: System shall perform speech-to-text transcription using the Deepgram Nova-3 model.
- **FR.AI.02**: System shall implement multi-speaker diarization to identify and separate different speakers in a transcript.
- **FR.AI.03**: System shall extract word-level timestamps and confidence scores for every word in the transcript.
- **FR.AI.04**: System shall detect "Neural Intelligence" including entities, topics, and intents directly from the transcription engine.
- **FR.AI.05**: System shall extract Named Entities (PERSON, ORG, GPE, DATE) using SpaCy's `en_core_web_lg` model.
- **FR.AI.06**: System shall extract SVO (Subject-Verb-Object) triplets to map interaction dynamics between speakers.
- **FR.AI.07**: System shall identify "Action Signals" (linguistic cues indicating intent or tasks) using NLP pattern matching.
- **FR.AI.08**: System shall generate structured meeting summaries using the Groq `llama-3.3-70b-versatile` model.
- **FR.AI.09**: System shall enforce a strict JSON schema for summary outputs, including executive summaries, key decisions, and action items.
- **FR.AI.10**: System shall perform an autonomous "Verification Pass" where a second LLM pass fact-checks the summary against the raw transcript.
- **FR.AI.11**: System shall detect and correct hallucinated action items that do not exist in the source transcript.

---

## 4. Core Application Logic (FR.CORE)

- **FR.CORE.01**: System shall implement a FIFO (First-In-First-Out) processing queue for meeting AI pipelines.
- **FR.CORE.02**: System shall restrict the AI pipeline worker to a single concurrent process to prevent resource exhaustion.
- **FR.CORE.03**: System shall manage the meeting lifecycle through specific states: `PENDING`, `PROCESSING_AUDIO`, `TRANSCRIBING`, `PROCESSING_NLP`, `SUMMARIZING`, `COMPLETED`, `FAILED`.
- **FR.CORE.04**: System shall perform 3 retry attempts for failed processing jobs using exponential backoff (1m, 2m, 4m).
- **FR.CORE.05**: System shall persist final processed audio files to Supabase Storage.
- **FR.CORE.06**: System shall provide real-time status polling for the frontend to track pipeline progress.
- **FR.CORE.07**: System shall automatically delete local temporary files within 24 hours of processing.

---

## 5. Navigation & Search (FR.NAV)

- **FR.NAV.01**: System shall allow users to search meetings by title, description, or transcript content.
- **FR.NAV.02**: System shall require a minimum of 2 characters for search queries.
- **FR.NAV.03**: System shall support filtering meetings by category (SALES, PLANNING, STANDUP, ONE_ON_ONE, OTHER).
- **FR.NAV.04**: System shall support pagination for meeting lists with a default limit of 100 items for full visibility.
- **FR.NAV.05**: System shall allow sorting meetings by title or creation date.

---

## 6. Visualisation & Analytics (FR.VIS)

- **FR.VIS.01**: System shall provide a dashboard showing total meeting count, duration, and productivity scores.
- **FR.VIS.02**: System shall visualize sentiment trajectory over time using AreaCharts.
- **FR.VIS.03**: System shall visualize meeting category distribution using PieCharts.
- **FR.VIS.04**: System shall visualize "Neural Nodes" representing the most mentioned entities and concepts.
- **FR.VIS.05**: System shall provide a "Speaker Coach" that aggregates metrics across the 10 most recent meetings.
- **FR.VIS.06**: System shall calculate and display per-speaker Talk Ratio and Words Per Minute (WPM).
- **FR.VIS.07**: System shall identify interruptions between speakers based on a 300ms overlap threshold.
- **FR.VIS.08**: System shall calculate "Silence Ratio" representing the percentage of meeting duration without detectable speech.
- **FR.VIS.09**: System shall track "Curiosity" metrics by counting questions asked by each participant.

---

## 7. User Interface & Design (FR.UI)

- **FR.UI.01**: System shall follow the "Luminous Archive" design system: OLED Dark Mode (`#020617`).
- **FR.UI.02**: System shall use Glassmorphism for floating UI elements (Modals, Popovers) with `backdrop-blur-xl`.
- **FR.UI.03**: System shall use `Plus Jakarta Sans` for primary UI text and `JetBrains Mono` for metadata and durations.
- **FR.UI.04**: System shall implement "Ghost Borders" (15% opacity) instead of standard 1px solid lines for sectioning.
- **FR.UI.05**: System shall provide an interactive waveform visualization during audio playback.
- **FR.UI.06**: System shall support viewport-aware positioning for all floating components.
- **FR.UI.07**: System shall use Lucide icons (`react-icons/lu`) exclusively for all UI iconography.

---

## 8. Export & Integrations (FR.INT)

- **FR.INT.01**: System shall allow users to download processed meeting audio in MP3 format (128kbps, Mono).
- **FR.INT.02**: System shall allow users to download transcripts and summaries in TXT and JSON formats.
- **FR.INT.03**: System shall name exported files using a `[Title]_[Date]_[Type]` convention.
- **FR.INT.04**: System shall support Slack webhooks for sending automated meeting summaries to a specific channel.
- **FR.INT.05**: System shall support automated Follow-up Emails sent via Gmail OAuth2/Nodemailer.
- **FR.INT.06**: System shall integrate with Google Calendar to display connected status and manage scopes.

---

## 9. User Settings & Privacy (FR.SETTINGS)

- **FR.SETTINGS.01**: System shall allow users to set an automatic deletion period for recordings (7, 30, 90, 180, 365 days).
- **FR.SETTINGS.02**: System shall support full account deletion, requiring the user to type "DELETE" for confirmation.
- **FR.SETTINGS.03**: System shall allow users to toggle email and push notification preferences.
- **FR.SETTINGS.04**: System shall allow users to export all account data in a single ZIP archive.
- **FR.SETTINGS.05**: System shall display current storage usage and durational metrics to the user.

---

## 10. Non-Functional Requirements (NFR)

### Performance & Scalability (NFR.PERF)
- **NFR.PERF.01**: Database queries for dashboard analytics shall return in under 200ms.
- **NFR.PERF.02**: System shall avoid all caching mechanisms for meeting statistics to ensure real-time data integrity.
- **NFR.PERF.03**: API responses shall follow a standard `{ success, data, error }` structure.

### Security & Privacy (NFR.SEC)
- **NFR.SEC.01**: All sensitive API routes shall be protected by the `authenticate` middleware.
- **NFR.SEC.02**: Audio files shall be stored in Supabase Storage buckets with restricted access policies.
- **NFR.SEC.03**: System shall sanitize all incoming request bodies to prevent injection attacks.

### Reliability (NFR.REL)
- **NFR.REL.01**: System shall maintain persistent logs for all AI pipeline stages using Winston logger.
- **NFR.REL.02**: The server shall gracefully handle and report errors for missing external API keys (Deepgram, Groq).
- **NFR.REL.03**: The system shall implement graceful cleanup of orphans in the `storage/temp` directory on startup.

### Design Standards (NFR.DES)
- **NFR.DES.01**: All interactive elements (Buttons, Inputs) shall have unique, descriptive IDs for automated testing.
- **NFR.DES.02**: The UI shall maintain consistent OLED contrast with no absolute white backgrounds.
