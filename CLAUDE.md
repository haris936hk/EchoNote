# CLAUDE.md - EchoNote Development Guide

## Project Overview
EchoNote is an AI-powered meeting transcription and summarization platform that solves the critical problem of meeting information loss (90% of content forgotten within a week). This is an MVP focusing on accuracy-first architecture with a 3-minute recording limit.

## Tech Stack

### Frontend
- **Framework**: React 18
- **UI Library**: heroUI (dark theme enforced)
- **State Management**: Context API (no Redux)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Audio Recording**: RecordRTC
- **Styling**: Tailwind CSS
- **Authentication**: @react-oauth/google (OAuth only)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Database**: PostgreSQL (Supabase free tier)
- **ORM**: Prisma
- **Authentication**: Google OAuth + JWT
- **File Handling**: Multer
- **Email**: Resend API
- **Python Integration**: python-shell (subprocess)
- **Logging**: Winston

### AI/ML Pipeline
- **Audio Processing**: Python (librosa, noisereduce, scipy) - 5-10s processing
- **Transcription**: Whisper base.en model - ~60s processing, 88% accuracy acceptable
- **NLP**: SpaCy en_core_web_lg - ~2s processing
- **Summarization**: Groq API (Mistral-7B-Instruct) - ~5s processing
- **Fallback Audio**: FFmpeg - 2s processing

## Core Architecture Principles

### 1. Sequential Processing Pipeline (NEVER PARALLEL)
```
Audio Capture (3-min max) 
  → Audio Optimization (16kHz mono PCM)
    → Transcription (Whisper)
      → NLP Processing (SpaCy)
        → Summarization (Mistral-7B)
          → Email Notification
```

### 2. Processing Time Expectations
- Audio optimization: 5-10s (Python), 2s (FFmpeg fallback)
- Transcription: ~60s
- NLP: ~2s
- Summarization: ~5s
- Total: ~70-80s per meeting

### 3. Data Flow Pattern
**Backend**: `routes → controllers → services → python_scripts`

**Error Handling**: All async operations wrapped in try/catch, return `{success: true/false, data/error}`

**Status Updates**: Database status updated at each pipeline stage: UPLOADING → PROCESSING → TRANSCRIBING → ANALYZING → SUMMARIZING → COMPLETED → FAILED

## Critical Constraints & Requirements

### Hard Limits
- ✅ **3-minute audio recording limit** (non-negotiable)
- ✅ **Post-meeting processing only** (no real-time transcription)
- ✅ **Google OAuth authentication only** (no password system)
- ✅ **16kHz mono PCM** audio format for Whisper
- ✅ **Temporary audio storage** (delete after processing)
- ✅ **Permanent transcript storage**
- ✅ **88% transcription accuracy** acceptable for MVP

### Accuracy Over Speed
When there's a conflict between accuracy and speed, **ALWAYS choose accuracy**. Processing time >5 seconds is acceptable if it improves quality.

### Audio Processing Standards
- Always optimize audio before transcription
- Speech frequency range: 85-8000Hz
- Noise reduction mandatory
- Handle background noise gracefully

### Summary Format (Always Structured)
```
Executive Summary: [2-3 sentences]
Key Decisions: [bullet points]
Action Items: [bullet points with owners if identifiable]
Next Steps: [bullet points]
```

## Database Schema (Prisma)

### Core Models
1. **User**: id, email, name, googleId, picture, refreshToken, createdAt, updatedAt
2. **Meeting**: id, userId, title, category (enum), audioUrl, transcriptText, summary, status (enum), duration, createdAt, updatedAt
3. **Category**: SALES, PLANNING, STANDUP, ONE_ON_ONE, OTHER

### Relations
- User → Meeting (one-to-many)
- Meeting status tracking at each pipeline stage

## API Routes Structure

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### Meetings
- `POST /api/meetings` - Upload audio + start processing
- `GET /api/meetings` - List all meetings (with pagination, filters)
- `GET /api/meetings/:id` - Get single meeting details
- `DELETE /api/meetings/:id` - Delete meeting
- `GET /api/meetings/:id/download` - Download audio/transcript/summary

### User
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/settings` - Update settings

## Python Scripts Interface

### audio_processor.py
**Purpose**: Optimize raw audio for transcription (noise reduction, format conversion)

**Input**: `{"input_path": "raw/file.webm", "output_path": "processed/file.wav"}`

**Output**: `{"success": true, "duration": 178.5, "sample_rate": 16000, "channels": 1}`

**Processing**: 5-10 seconds

### transcribe.py
**Purpose**: Convert audio to text using Whisper base.en

**Input**: `{"audio_path": "processed/file.wav", "language": "en"}`

**Output**: `{"success": true, "text": "transcription...", "confidence": 0.89}`

**Processing**: ~60 seconds

### nlp_processor.py
**Purpose**: Extract entities, actions, key phrases using SpaCy

**Input**: `{"text": "meeting transcript..."}`

**Output**: 
```json
{
  "success": true,
  "entities": ["John Doe", "Q4 2024", "Project Alpha"],
  "action_items": ["Review budget", "Schedule follow-up"],
  "key_phrases": ["budget approval", "timeline extension"]
}
```

**Processing**: ~2 seconds

## Frontend Component Structure

### Pages
- `LoginPage` - Google OAuth login
- `DashboardPage` - Overview of recent meetings
- `RecordPage` - Audio recording interface (3-min timer)
- `MeetingsPage` - List/search/filter meetings
- `MeetingDetailPage` - View transcript, summary, download
- `SettingsPage` - User preferences

### Context Providers
- `AuthContext` - User authentication state, login/logout
- `MeetingContext` - Meeting list, upload, status polling
- `ThemeContext` - Dark theme enforcement

### Key Components
- `AudioRecorder` - RecordRTC integration, 3-min countdown, upload on stop
- `TranscriptViewer` - Display formatted transcript
- `SummaryViewer` - Display structured summary
- `MeetingCard` - Meeting preview with status badge
- `SearchBar` - Debounced search with filters

## Development Workflow

### Communication Standards
1. **Ask questions before coding** if requirements are ambiguous
2. **State file path + function purpose** before providing code
3. **Deliver in order**: schema → service → route → component
4. **Provide test commands** for all API endpoints (curl/Postman)
5. **Include sample data structures** for testing
6. **Flag dependencies**: Python packages vs npm packages
7. **Explain processing times** if >5 seconds

### Code Style
- Use try/catch for all async operations
- console.error for debugging (Winston for production)
- Return consistent response format: `{success, data/error}`
- Update database status at each pipeline stage
- Handle FFmpeg fallback if Python fails

### Testing Approach
- Use 30-second test clips for rapid iteration
- Test pipeline components individually before integration
- Console.log at each stage: raw audio size → processed size → transcript length → entity count → summary structure
- Manual testing flow: Record → Upload → Check status → Receive email → View summary

## MVP Exclusions (Do NOT Build)
- ❌ Speaker diarization
- ❌ Multi-language support
- ❌ Real-time transcription
- ❌ Transcript editing
- ❌ Sharing features
- ❌ Calendar auto-sync (manual only)
- ❌ File exports beyond email
- ❌ Production optimizations (scalability, caching, CDN)

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GROQ_API_KEY=...
RESEND_API_KEY=...
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=...
```

## Error Handling Patterns

### Backend Services
```javascript
try {
  // Processing logic
  return { success: true, data: result };
} catch (error) {
  console.error('Service error:', error);
  return { success: false, error: error.message };
}
```

### Python Scripts
```python
try:
    # Processing logic
    print(json.dumps({"success": True, "data": result}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
```

### Frontend API Calls
```javascript
try {
  const response = await api.post('/endpoint', data);
  return response.data;
} catch (error) {
  console.error('API error:', error);
  throw error.response?.data?.error || 'Request failed';
}
```

## File Storage Rules

### Temporary (Auto-delete)
- Raw audio files: `backend/src/uploads/raw/`
- Processed audio files: `backend/src/uploads/processed/`
- Retention: Delete after successful processing or 24 hours

### Permanent (Database)
- Processed audio URL: Supabase Storage (optional)
- Transcript text: PostgreSQL (meetings.transcriptText)
- Summary: PostgreSQL (meetings.summary)

## Supabase Free Tier Limits
- Database: 500MB
- Storage: 1GB
- Bandwidth: 5GB/month

**Strategy**: Delete audio files after processing, keep only transcripts and summaries in database.

## Priority Development Phases

### Week 1: Complete Processing Pipeline
- Database schema + Prisma setup
- Python scripts (audio → transcript → NLP)
- Backend services (sequential pipeline)
- Test with single file end-to-end

### Week 2: API + Basic UI
- Auth routes (Google OAuth)
- Meeting routes (CRUD)
- Frontend authentication
- Audio recording component
- Meeting list + detail pages

### Week 3: Integration + Polish
- Groq API integration (summarization)
- Email notifications (Resend)
- Error handling + status updates
- Search + filtering

### Week 4: Testing + Documentation
- End-to-end testing
- Error scenarios
- User documentation
- Deployment preparation

## When to Use FFmpeg vs Python

### Use Python (Default - Accuracy First)
- All production audio processing
- When processing time <15 seconds is acceptable
- Professional-grade noise reduction needed

### Use FFmpeg (Fallback - Speed)
- Python script fails
- Quick testing during development
- Simple format conversion without enhancement

## Status Codes & Database Enums

### Meeting Status
```typescript
enum MeetingStatus {
  UPLOADING    // File upload in progress
  PROCESSING   // Audio optimization
  TRANSCRIBING // Whisper ASR
  ANALYZING    // SpaCy NLP
  SUMMARIZING  // Mistral-7B
  COMPLETED    // Ready for viewing
  FAILED       // Error occurred
}
```

### Category Enum
```typescript
enum MeetingCategory {
  SALES
  PLANNING
  STANDUP
  ONE_ON_ONE
  OTHER
}
```

## Common Pitfalls to Avoid

1. ❌ **Don't use real-time transcription** - Only post-meeting processing
2. ❌ **Don't skip audio optimization** - Always process before Whisper
3. ❌ **Don't parallel process** - Always sequential pipeline
4. ❌ **Don't store passwords** - Google OAuth only
5. ❌ **Don't keep raw audio** - Delete after processing
6. ❌ **Don't use browser storage APIs** - All storage server-side
7. ❌ **Don't assume 100% accuracy** - 88% is acceptable
8. ❌ **Don't build speaker diarization** - Out of MVP scope

## Success Criteria

### Technical Metrics
- ✅ Transcription accuracy >88%
- ✅ End-to-end processing <90 seconds
- ✅ Audio recording exactly 3 minutes max
- ✅ Zero audio files stored permanently
- ✅ All errors logged and handled gracefully

### User Experience
- ✅ One-click Google login
- ✅ Seamless audio recording with countdown
- ✅ Email notification on completion
- ✅ Easy search and filtering
- ✅ Clean, dark-themed interface

## Quick Reference Commands

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
pip install -r src/python_scripts/requirements.txt
python -m spacy download en_core_web_lg
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Testing Python Scripts Individually
```bash
cd backend/src/python_scripts
python audio_processor.py '{"input_path": "test.wav", "output_path": "out.wav"}'
python transcribe.py '{"audio_path": "out.wav", "language": "en"}'
python nlp_processor.py '{"text": "Sample meeting transcript"}'
```

### Test API Endpoints
```bash
# Login
curl -X POST http://localhost:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "google_id_token"}'

# Upload meeting
curl -X POST http://localhost:5000/api/meetings \
  -H "Authorization: Bearer jwt_token" \
  -F "audio=@meeting.wav" \
  -F "title=Team Standup" \
  -F "category=STANDUP"

# Get meetings
curl -X GET http://localhost:5000/api/meetings \
  -H "Authorization: Bearer jwt_token"
```

---

## Notes for Claude Code

When working on this project in Claude Code:
- Always refer to this file for architecture decisions
- Prioritize accuracy over speed in all implementations
- Ask clarifying questions before implementing ambiguous features
- Test each pipeline component individually before integration
- Provide curl commands for all new API endpoints
- Flag when Python dependencies need installation
- Explain processing time implications for changes >5 seconds

**Remember**: This is an MVP. Build working features that solve the core problem (meeting information loss) rather than perfect, production-ready code.