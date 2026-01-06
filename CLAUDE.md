# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
EchoNote is an AI-powered meeting transcription and summarization platform that solves the critical problem of meeting information loss (90% of content forgotten within a week). This is an MVP focusing on accuracy-first architecture with a 10-minute recording limit.

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
- **Design Philosophy**: Rounded corners everywhere (`rounded-xl`, `rounded-3xl`, `rounded-full` for buttons)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Database**: PostgreSQL (Supabase free tier)
- **ORM**: Prisma
- **Authentication**: Google OAuth + JWT
- **File Handling**: Multer
- **Storage**: Supabase Storage (audio files)
- **Email**: Gmail OAuth2 with nodemailer
- **Python Integration**: python-shell (subprocess)
- **Logging**: Winston

### AI/ML Pipeline
- **Audio Processing**: Python (librosa, noisereduce, scipy) - 5-10s processing
- **Transcription**: Whisper base.en model - ~60s processing, 88% accuracy acceptable
- **NLP**: SpaCy en_core_web_lg - ~2s processing (extracts entities, key phrases, sentiment, topics)
- **Summarization**: Custom Fine-Tuned Qwen2.5-7B Model (via NGROK API) - ~5s processing (uses NLP features to guide summary generation)

**NLP → AI Integration**:
- NLP extracts entities, key phrases, action patterns, sentiment, and topics
- These features are passed to custom model API alongside the transcript
- AI uses NLP features to ensure accuracy in assignees, topics, and sentiment
- If NLP doesn't extract features (e.g., no action items), AI still generates summary with empty arrays
- Format matches echonote_dataset.json exactly

## Project Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── config/           # Configuration (auth, database, email)
│   ├── controllers/      # Request handlers (auth, meeting, user)
│   ├── middleware/       # Auth, validation, upload, error handling
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic (audio, transcription, NLP, summarization, storage)
│   ├── python_scripts/   # Audio processing, Whisper, SpaCy NLP
│   ├── utils/            # Helpers (logger, emailTransport, fileUtils)
│   └── server.js         # Express app entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── storage/              # Local file storage (temp, processed, audio)
├── scripts/              # Test scripts (email testing)
└── logs/                 # Winston logs

Key Services:
- audio.service.js: Calls Python audio processor
- transcription.service.js: Calls Python Whisper script
- nlp.service.js: Calls Python SpaCy script
- customModelService.js: Calls NGROK-hosted Qwen2.5-7B model
- supabase-storage.service.js: Uploads audio to Supabase bucket
- meeting.service.js: Orchestrates full pipeline
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/         # Login components
│   │   ├── common/       # Reusable UI components
│   │   ├── layout/       # Layout components (Navbar, Footer)
│   │   ├── meeting/      # Meeting-related components
│   │   └── user/         # User profile components
│   ├── contexts/         # React Context (Auth, Meeting, Theme)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components (Login, Dashboard, Record, Meetings, etc.)
│   ├── services/         # API client (axios)
│   ├── styles/           # Global styles, Tailwind config
│   └── utils/            # Helpers (validators, constants)
```

## Core Architecture Principles

### 1. Sequential Processing Pipeline (NEVER PARALLEL)
```
Audio Capture (10-min max)
  → Audio Optimization (16kHz mono PCM)
    → Transcription (Whisper)
      → NLP Processing (SpaCy)
        → Summarization (Custom Qwen2.5-7B)
          → Email Notification
```

### 2. Processing Time Expectations
- Audio optimization: 5-10s (Python only)
- Transcription: ~60s
- NLP: ~2s
- Summarization: ~5s
- Total: ~70-80s per meeting

### 3. Data Flow Pattern
**Backend**: `routes → controllers → services → python_scripts`

**Error Handling**: All async operations wrapped in try/catch, return `{success: true/false, data/error}`

**Status Updates**: Database status updated at each pipeline stage: UPLOADING → PROCESSING_AUDIO → TRANSCRIBING → PROCESSING_NLP → SUMMARIZING → COMPLETED → FAILED

## Critical Constraints & Requirements

### Hard Limits
- ✅ **10-minute audio recording limit** (non-negotiable)
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

### Summary Format (Always Structured - matches echonote_dataset.json)
```json
{
  "executiveSummary": "2-3 sentences capturing main purpose and outcomes",
  "keyDecisions": "Important decisions made, or 'No major decisions recorded'",
  "actionItems": [
    {
      "task": "What needs to be done",
      "assignee": "Person responsible or null",
      "deadline": "When due or null",
      "priority": "high/medium/low"
    }
  ],
  "nextSteps": "What happens next after this meeting",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive/neutral/negative/mixed"
}
```

**Important**:
- If no action items found, return empty array `[]`
- If assignee/deadline not mentioned, use `null`
- Backend must handle missing NLP features gracefully
- AI uses NLP features (entities, key phrases, sentiment) to guide summary generation

## Database Schema (Prisma)

### Core Models

**User**:
- Basic: id, email, name, googleId, picture, refreshToken
- Settings: autoDeleteDays, emailNotifications
- Timestamps: createdAt, updatedAt, lastLoginAt
- Relations: meetings (one-to-many)

**Meeting**:
- Basic: id, userId, title, description, category, status
- Audio: audioUrl, audioSize, audioDuration (max 600s), audioFormat
- Transcript: transcriptText, transcriptWordCount
- NLP Features: nlpEntities, nlpKeyPhrases, nlpActionPatterns, nlpSentiment, nlpSentimentScore, nlpTopics
- AI Summary: summaryExecutive, summaryKeyDecisions, summaryActionItems, summaryNextSteps, summaryKeyTopics, summarySentiment
- Processing: processingError, processingStartedAt, processingCompletedAt, processingDuration
- Deletion: audioDeletedAt, shouldDeleteAudioAt
- Email: emailSent, emailSentAt
- Timestamps: createdAt, updatedAt

**ProcessingLog**: id, meetingId, stage, status, details, duration, createdAt

**UserActivity**: id, userId, action, metadata, createdAt

### Enums
- **MeetingStatus**: UPLOADING, PROCESSING_AUDIO, TRANSCRIBING, PROCESSING_NLP, SUMMARIZING, COMPLETED, FAILED
- **MeetingCategory**: SALES, PLANNING, STANDUP, ONE_ON_ONE, OTHER

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
- `RecordPage` - Audio recording interface (10-min timer)
- `MeetingsPage` - List/search/filter meetings
- `MeetingDetailPage` - View transcript, summary, download
- `SettingsPage` - User preferences

### Context Providers
- `AuthContext` - User authentication state, login/logout
- `MeetingContext` - Meeting list, upload, status polling
- `ThemeContext` - Dark theme enforcement

### Key Components
- `AudioRecorder` - RecordRTC integration, 10-min countdown, upload on stop
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
- Python-only audio processing (no fallbacks)
- **UI Components**: Always use rounded corners for a modern, polished look
  - Cards: `rounded-xl` or `rounded-3xl`
  - Buttons: `radius="full"` for pill-shaped design
  - Inputs/Dropdowns: `rounded-lg`
  - Page headers: Compact pill design with `rounded-full` container

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
```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# JWT
JWT_SECRET=...
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Supabase Storage (audio files)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET_NAME=meeting-audio

# Custom Model API (NGROK tunnel - UPDATE ON EVERY RESTART!)
CUSTOM_MODEL_API_URL=https://your-domain.ngrok-free.app
CUSTOM_MODEL_API_KEY=echonote-secret-api-key-2025
CUSTOM_MODEL_TIMEOUT=70000

# Email (Gmail OAuth2)
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=... # Get from OAuth Playground
EMAIL_FROM=EchoNote <your-email@gmail.com>

# Audio Processing
MAX_AUDIO_DURATION=600
AUDIO_SAMPLE_RATE=16000
PYTHON_PATH=python3
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

### Local Storage (`backend/storage/`)
- `temp/` - Temporary uploads and conversion files (auto-delete after processing or 1 hour)
- `processed/` - Processed audio intermediates (auto-delete after meeting completion)
- `audio/` - Local processed audio files (WAV format for Whisper)

### Supabase Storage
- **Bucket**: `meeting-audio`
- **Purpose**: Permanent storage for processed audio files
- **URL stored in**: `Meeting.audioUrl` field
- **Service**: `supabase-storage.service.js`

### Database Storage (PostgreSQL)
- Transcript text: `Meeting.transcriptText`
- NLP features: `Meeting.nlp*` fields
- AI summary: `Meeting.summary*` fields
- Processing logs: `ProcessingLog` table
- User activity: `UserActivity` table

### Deletion Strategy
- **Local files**: Auto-delete after successful upload to Supabase
- **Supabase audio**: Auto-delete based on user settings (`autoDeleteDays`)
- **Transcripts & summaries**: Keep permanently in database
- **Processing logs**: Keep for debugging (can be pruned periodically)

## Supabase Free Tier Limits
- Database: 500MB
- Storage: 1GB
- Bandwidth: 5GB/month

**Strategy**: Rely on database for transcripts/summaries, use Supabase Storage sparingly for audio playback.

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
- Custom Model API integration (Qwen2.5-7B via NGROK)
- Email notifications (Gmail OAuth2)
- Error handling + status updates
- Search + filtering

### Week 4: Testing + Documentation
- End-to-end testing
- Error scenarios
- User documentation
- Deployment preparation

## Audio Processing Architecture

### Python-Only Processing (Accuracy First)
- **All audio processing** uses Python with librosa, noisereduce, and scipy
- **No fallbacks** - Python script handles all validation and error cases internally
- **Multi-stage pipeline**: Normalization → Silence Removal → Spectral Gating → Noise Reduction → Speech Enhancement
- **Processing time**: 5-10s (acceptable for accuracy-first MVP)
- **Output format**: 16kHz mono PCM WAV (optimized for Whisper)

### Python Dependencies Required
```bash
pip install librosa noisereduce soundfile scipy numpy
```

## Custom Model Integration

### Architecture
- **Model**: Fine-tuned Qwen2.5-7B on EchoNote meeting dataset
- **Deployment**: FastAPI server exposed via NGROK tunnel
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s delays)
- **Timeout**: 70 seconds total per request
- **Authentication**: X-API-Key header authentication

### NGROK URL Management
The NGROK URL changes every time the inference notebook restarts. To update:

1. Start inference notebook `echonote_inference_api_ngrok.ipynb` in Google Colab
2. Copy the NGROK public URL from the notebook output
3. Update `.env` file: `CUSTOM_MODEL_API_URL=<new-ngrok-url>`
4. Restart backend server: `npm run dev`
5. No code changes needed - service automatically uses new URL

### Error Handling
When custom model API is unavailable (NGROK down, notebook stopped):

**User-Facing Message**:
```
"AI summarization service is currently unavailable. Please ensure the model API is running and try again."
```

**Behavior**:
- Meeting is saved with transcript
- Summary generation fails gracefully
- No summary stored
- User can retry later (future feature: regenerate summary)

**Detection**: Catches network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, EHOSTUNREACH)

### Health Monitoring
- Custom model service includes built-in retry logic for transient failures
- Check NGROK tunnel status: `curl <NGROK_URL>/health`
- Monitor backend logs for connection errors: `tail -f logs/echonote.log`
- NGROK dashboard for request inspection: `http://localhost:4040`

### Production Deployment (Future)
For production, migrate from NGROK to:
- **HuggingFace Inference Endpoints** (managed hosting)
- **Modal.com** (serverless GPU)
- **RunPod** (dedicated GPU instances)
- **Self-hosted** (AWS/GCP with GPU + NGINX)

## Email Configuration (Gmail OAuth2)

### Architecture
- **Service**: Gmail via nodemailer with OAuth2 authentication
- **Transport**: `backend/src/utils/emailTransport.js`
- **Purpose**: Send meeting completion notifications with summary
- **Authentication**: OAuth2 refresh token (never expires, can be revoked)

### Setup Instructions

1. **Enable Gmail API** in Google Cloud Console:
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Gmail API" and enable it

2. **Get OAuth2 Refresh Token** using OAuth Playground:
   - Go to: https://developers.google.com/oauthplayground/
   - Click Settings (⚙️) → Check "Use your own OAuth credentials"
   - Enter `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Select scope: `https://mail.google.com/`
   - Click "Authorize APIs" and sign in with Gmail account
   - Click "Exchange authorization code for tokens"
   - Copy the `refresh_token` to `.env` as `GMAIL_REFRESH_TOKEN`

3. **Update `.env`**:
   ```bash
   GMAIL_USER=your-email@gmail.com
   GMAIL_REFRESH_TOKEN=1//04... (from OAuth Playground)
   EMAIL_FROM=EchoNote <your-email@gmail.com>
   ```

4. **Test Email Setup**:
   ```bash
   # Test transport connection
   node backend/scripts/test-gmail-transport.js

   # Test basic email send
   node backend/scripts/test-email-send.js

   # Test meeting notification template
   node backend/scripts/test-meeting-emails.js
   ```

### Email Templates
- **Meeting Completion**: Sent when summary is ready
- **Contains**: Executive summary, key decisions, action items, next steps
- **Format**: HTML email with structured sections

### Error Handling
- If email fails, meeting still completes successfully
- Error logged to console and `Meeting.processingError`
- `Meeting.emailSent` remains `false`
- User can retry email send from UI (future feature)

## Status Codes & Database Enums

### Meeting Status
```typescript
enum MeetingStatus {
  UPLOADING         // File upload in progress
  PROCESSING_AUDIO  // Audio optimization (Python librosa)
  TRANSCRIBING      // Whisper ASR
  PROCESSING_NLP    // SpaCy NLP extraction
  SUMMARIZING       // Custom Qwen2.5-7B
  COMPLETED         // Ready for viewing
  FAILED            // Error occurred
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
- ✅ End-to-end processing time scales with audio length
- ✅ Audio recording exactly 10 minutes max
- ✅ Zero audio files stored permanently
- ✅ All errors logged and handled gracefully

### User Experience
- ✅ One-click Google login
- ✅ Seamless 10-minute audio recording with countdown
- ✅ Email notification on completion
- ✅ Easy search and filtering
- ✅ Clean, dark-themed interface

## Quick Reference Commands

### Initial Setup

**Backend**:
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
pip install -r src/python_scripts/requirements.txt
python -m spacy download en_core_web_lg
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

### Development Commands

**Database**:
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name description_of_change

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Push schema without migration (for prototyping)
npx prisma db push

# Open Prisma Studio (visual database editor)
npx prisma studio
```

**Email Testing** (backend/scripts/):
```bash
# Test Gmail OAuth2 connection
node scripts/test-gmail-transport.js

# Test basic email sending
node scripts/test-email-send.js

# Test meeting completion email template
node scripts/test-meeting-emails.js
```

**NGROK URL Update** (when model notebook restarts):
```bash
# 1. Start notebook and copy NGROK URL
# 2. Update backend/.env:
CUSTOM_MODEL_API_URL=https://new-url.ngrok-free.app

# 3. Restart backend
npm run dev
```

### Testing Python Scripts

**Individual Testing**:
```bash
cd backend/src/python_scripts

# Audio processing
python audio_processor.py '{"input_path": "test.wav", "output_path": "out.wav"}'

# Transcription
python transcribe.py '{"audio_path": "out.wav", "language": "en"}'

# NLP extraction
python nlp_processor.py '{"text": "Sample meeting transcript"}'
```

### API Testing

**Authentication**:
```bash
# Google OAuth login
curl -X POST http://localhost:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "google_id_token"}'
```

**Meetings**:
```bash
# Upload meeting
curl -X POST http://localhost:5000/api/meetings \
  -H "Authorization: Bearer jwt_token" \
  -F "audio=@meeting.wav" \
  -F "title=Team Standup" \
  -F "category=STANDUP"

# List meetings
curl -X GET http://localhost:5000/api/meetings \
  -H "Authorization: Bearer jwt_token"

# Get meeting details
curl -X GET http://localhost:5000/api/meetings/:id \
  -H "Authorization: Bearer jwt_token"

# Delete meeting
curl -X DELETE http://localhost:5000/api/meetings/:id \
  -H "Authorization: Bearer jwt_token"
```

## Common Troubleshooting

### NGROK Model API Issues
**Problem**: `AI summarization service is currently unavailable`

**Solutions**:
1. Check if notebook is running in Google Colab
2. Verify NGROK URL in `.env` matches notebook output
3. Test API health: `curl <NGROK_URL>/health`
4. Check API key matches between `.env` and notebook
5. Restart backend after updating `.env`

### Email Sending Fails
**Problem**: `Error sending email` in logs

**Solutions**:
1. Test transport: `node backend/scripts/test-gmail-transport.js`
2. Verify Gmail API is enabled in Google Cloud Console
3. Check refresh token is valid (regenerate if expired)
4. Ensure `GMAIL_USER` matches the OAuth-authorized account
5. Check firewall/antivirus blocking SMTP connections

### Database Connection Issues
**Problem**: `PrismaClientInitializationError`

**Solutions**:
1. Verify `DATABASE_URL` in `.env` is correct
2. Test connection: `npx prisma db pull`
3. Check Supabase project is active (not paused)
4. Regenerate Prisma client: `npx prisma generate`
5. Check firewall allows connection to Supabase

### Python Scripts Fail
**Problem**: Python scripts return `{"success": false}`

**Solutions**:
1. Verify Python path: `which python3` (or `python`)
2. Check dependencies: `pip list | grep -E "librosa|whisper|spacy"`
3. Verify SpaCy model: `python -m spacy validate`
4. Test individual scripts (see Testing Python Scripts section)
5. Check audio file exists and is readable

### Audio Upload Issues
**Problem**: Upload fails or audio not processed

**Solutions**:
1. Check file size < 10MB (`MAX_FILE_SIZE` in `.env`)
2. Verify audio format is supported (webm, wav, mp3, ogg)
3. Check `backend/storage/temp/` directory exists and is writable
4. Review upload middleware logs
5. Test with smaller audio file (30 seconds)

### Supabase Storage Upload Fails
**Problem**: Audio URL is null after processing

**Solutions**:
1. Verify Supabase credentials in `.env`
2. Check bucket `meeting-audio` exists in Supabase dashboard
3. Verify bucket policies allow authenticated uploads
4. Test service: Check `supabase-storage.service.js` logs
5. Ensure `SUPABASE_SERVICE_KEY` has storage permissions

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