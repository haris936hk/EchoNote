# EchoNote - Functional Requirements Specification

## 3.3.1 User Authentication & Account Management
- **FR.01**: User shall be able to sign up using Google OAuth authentication.
- **FR.02**: User shall be able to log in using Google account credentials.
- **FR.03**: User shall be able to view and update their profile information (name, email, profile picture from Google).
- **FR.04**: User shall be able to log out from the system securely.
- **FR.05**: System shall maintain user session using JWT tokens.
- **FR.06**: User shall be able to delete their account and all associated data permanently.
- **FR.07**: System shall update the user's last login timestamp upon successful authentication.

## 3.3.2 Meeting Management
- **FR.08**: User shall be able to create a new meeting with title, date, and category.
- **FR.09**: User shall be able to select a meeting category from a predefined list (SALES, PLANNING, STANDUP, ONE_ON_ONE, RETROSPECTIVE, INTERVIEW, OTHER).
- **FR.10**: User shall be able to view a paginated list of all their meetings.
- **FR.11**: User shall be able to filter meetings by category, date range, and status.
- **FR.12**: User shall be able to search meetings by title and content keywords.
- **FR.13**: User shall be able to view detailed meeting information (title, date, duration, category, status, transcript, summary, action items).
- **FR.14**: User shall be able to update meeting title and category after creation.
- **FR.15**: User shall be able to delete a meeting permanently (audio, transcript, and summary).
- **FR.16**: User shall be able to select multiple meetings via checkboxes to perform bulk deletion operations.
- **FR.17**: System shall track meeting processing status through sequential pipeline stages (UPLOADING, PROCESSING_AUDIO, TRANSCRIBING, PROCESSING_NLP, SUMMARIZING, COMPLETED, and FAILED).
- **FR.18**: User shall be able to see processing progress and estimated completion time on the frontend.
- **FR.19**: System shall poll for and update processing status on the frontend in real-time.
- **FR.20**: User shall be able to trigger a manual reprocessing of a meeting to regenerate its transcript or summary.
- **FR.21**: User shall be able to rename generic speaker labels in the transcript.

## 3.3.3 Dashboard, Analytics & System Preferences
- **FR.22**: System shall calculate and display aggregate meeting statistics on the user dashboard.
- **FR.23**: System shall aggregate and display Total Meetings, Processing count, Completed count, and Total Duration metrics.
- **FR.24**: User shall be able to view detailed metrics regarding engagement, sentiment, and topic usage on the global Analytics page.
- **FR.25**: User shall be able to toggle the application theme between Dark Mode and Light Mode.
- **FR.26**: User shall be able to toggle processing completion email notifications on or off.
- **FR.27**: System shall automatically redirect the user to the Meeting Detail page immediately upon a successful audio upload.
- **FR.28**: System shall visually distinguish all AI-generated insights with a consistent visual indicator.
- **FR.29**: User shall be able to access the Decisions module to view a global list of key decisions across all historic meetings.
- **FR.30**: User shall be able to view their personal cloud storage usage compared to their allocated limit via the user settings.

## 3.3.4 AI Processing & Transcription
- **FR.31**: System shall automatically sequence uploaded audio through the processing pipeline.
- **FR.32**: System shall apply noise reduction and audio optimization heuristics.
- **FR.33**: System shall convert source audio to 16kHz mono PCM format.
- **FR.34**: System shall transcribe audio using the Whisper base.en model targeting >88% verification accuracy.
- **FR.35**: System shall pass the generated transcript through the SpaCy NLP pipeline for extraction logic mapping.
- **FR.36**: System shall identify predefined semantic named entities (people, organizations, dates, locations).
- **FR.37**: System shall categorize overall meeting sentiment strictly as Positive, Neutral, Negative, or Mixed.
- **FR.38**: System shall generate a structured summary utilizing the cloud-hosted Groq LLM API.
- **FR.39**: System shall instruct the LLM to extract an executive summary.
- **FR.40**: System shall instruct the LLM to extract key decisions.
- **FR.41**: System shall instruct the LLM to extract next steps.
- **FR.42**: System shall adjust summarization parameters based on the meeting's selected Category.
- **FR.43**: System shall return specific error codes if any stage in the AI pipeline fails.
- **FR.44**: System shall notify the user via email when processing status changes to COMPLETED or FAILED.

## 3.3.5 Tasks & Action Items Management
- **FR.45**: System shall extract action items from the transcript, detailing the task description.
- **FR.46**: System shall assign specific Assignees to action items, if explicitly mentioned in the text.
- **FR.47**: System shall assign exact Deadlines to action items, if explicitly mentioned in the text.
- **FR.48**: System shall assign Priority Levels (High, Medium, Low) to each extracted action item.
- **FR.49**: System shall assign a Confidence metric to each extracted action item.
- **FR.50**: System shall document a verbatim source quote linking the action item to the transcript.
- **FR.51**: User shall be able to monitor all Action Items in a global Kanban/Task Board view.
- **FR.52**: User shall be able to manually transition Action Items statuses between TODO, IN_PROGRESS, and DONE.

## 3.3.6 File Management & Downloads
- **FR.53**: User shall be able to download the processed audio file in MP3 format.
- **FR.54**: User shall be able to download the meeting transcript in TXT format.
- **FR.55**: User shall be able to download the meeting transcript in JSON format.
- **FR.56**: User shall be able to download the meeting summary in TXT format.
- **FR.57**: User shall be able to download the meeting summary in JSON format.
- **FR.58**: User shall be able to download a single ZIP archive containing the audio, transcript, and summary.
- **FR.59**: System shall append the meeting title and creation timestamp to generated download filenames.
- **FR.60**: System shall restrict file download access exclusively to the authenticated meeting owner.
- **FR.61**: System shall permanently delete the raw audio blob off local storage after successful pipeline completion.
- **FR.62**: System shall execute scheduled cron jobs to automatically purge orphaned temporary files.

## 3.3.7 Privacy & Data control
- **FR.63**: User shall be able to select a global data retention period of 7 days, 30 days, 90 days, 6 months, 1 year, or never.
- **FR.64**: System shall automatically soft-delete meetings that exceed the configured retention period.
- **FR.65**: User shall receive an automated email notification 7 days prior to their meeting data being automatically deleted.
- **FR.66**: User shall be able to manually delete any meeting immediately.
- **FR.67**: User shall be able to export all their account data (meetings, transcripts, summaries, profile) as a compiled JSON payload.
- **FR.68**: System shall display a comprehensive privacy policy outlining data handling terms.

## 3.3.8 Audio Recording & Upload Requirements
- **FR.69**: User shall be able to record live audio directly in the browser using the RecordRTC library.
- **FR.70**: System shall reject recordings or uploads exceeding a maximum aggregate duration of 10 minutes.
- **FR.71**: User shall be able to Start, Pause, Resume, Stop, and Discard a live recording.
- **FR.72**: System shall display a live recording timer formatted as MM:SS.
- **FR.73**: User shall be able to preview playback of their recording before submitting it for processing.
- **FR.74**: User shall be able to explicitly upload pre-recorded audio files.
- **FR.75**: System shall accept pre-recorded files strictly mapped to MP3, WAV, M4A, WEBM, and OGG formats.
- **FR.76**: System shall reject uploaded files exceeding 50MB and return a granular validation error message.

## 3.3.9 API Architecture Requirements
- **FR.77**: System shall expose RESTful API endpoints internally prefixed cleanly (e.g., /api/v1).
- **FR.78**: System shall return all successful API responses in JSON format encapsulated in a standard success boolean wrapper.
- **FR.79**: System shall return consistent JSON error structures without exposing stack traces to the client DOM.
- **FR.80**: System shall require a valid signature JWT token transmitted in the Authorization HTTP header for all protected endpoints.
- **FR.81**: System shall rate-limit user requests to 100 requests per clock hour to prevent service exhaustion abuse.
- **FR.82**: System shall limit strictly generic file upload endpoints to 5 requests per minute using isolated upload limiters.
- **FR.83**: System shall return native HTTP status codes corresponding accurately to the REST operation outcome.

## 3.3.10 Data Management & Storage
- **FR.84**: System shall maintain a relational User table storing the Google OAuth profile mapping data natively.
- **FR.85**: System shall maintain a Meeting table utilizing foreign key relational constraints tied back to the User table.
- **FR.86**: System shall externally upload processed media into Supabase storage buckets and reference the active URL within the relational database.
- **FR.87**: System shall write temporal records tracking specific queuedAt, processingStartedAt, and processingCompletedAt pipeline timestamps.
- **FR.88**: System shall maintain strict database audit logs tracking backend records via the ProcessingLogs table.
- **FR.89**: System shall store heavy string values (Transcripts and Summaries) utilizing database structures permitting immediate full-text search query constraints.

## 3.3.11 Calendar Integration
- **FR.90**: System shall connect specifically to the user's Google Calendar using OAuth scope bounds.
- **FR.91**: User shall be able to view a parsed list of their upcoming integrated Google Calendar events on the dedicated Calendar route.
- **FR.92**: System shall link processed meetings structurally to integrated Google Calendar events via the backend googleEventId.
- **FR.93**: System shall natively fetch attendees mapped from linked Google Calendar events to enhance semantic speaker-tracing summarization.

## 3.3.12 Communications & Sharing Integration
- **FR.94**: User shall be able to configure and link to explicit Slack Webhook URLs securely within user settings.
- **FR.95**: User shall be able to trigger HTTP dispatches pushing a generated meeting summary straight to a connected Slack channel via the frontend.
- **FR.96**: System shall generate intelligent rough-draft follow-up emails structurally derived from the extracted meeting decisions using the Groq LLM endpoints.
- **FR.97**: User shall be able to constrain the tone of the drafted follow-up email strictly between Formal and Casual outputs dynamically.

## 3.3.13 Real-time Collaboration (Liveblocks)
- **FR.98**: System shall support real-time collaborative editing for transcripts and notes within shared Workspace sessions.
- **FR.99**: System shall utilize the Liveblocks engine to provide synchronized presence indicators, including active user names and avatars.
- **FR.100**: System shall assign unique, dynamic cursor colors to all active participants in a collaborative session.
- **FR.101**: System shall authorize users for specific collaborative rooms using a secure `workspace_id:meeting_id` authentication payload.
- **FR.102**: System shall enforce granular session control (Full Access vs Read-only) based on the user's workspace role.

## 3.3.14 Group Workspaces & Team Management
- **FR.103**: User shall be able to create, manage, and delete collaborative Workspaces.
- **FR.104**: Workspace Owner shall be able to invite members by email (EchoNote account required).
- **FR.105**: System shall dispatch automated invitation emails to teammates when added to a Workspace.
- **FR.106**: Workspace Owner shall be able to update member roles strictly between OWNER, EDITOR, and VIEWER roles.
- **FR.107**: Workspace Owner shall be able to attach their completed personal meetings to a Workspace for team visibility.
- **FR.108**: System shall prevent a meeting record from being linked to multiple Workspaces simultaneously.

## 3.3.15 Advanced Speaker Coaching & Performance
- **FR.109**: System shall aggregate communication data across the 10 most recent completed sessions for the Speaker Coach.
- **FR.110**: System shall calculate and visualize the "Participation Split" (Talk-to-Silence ratio) for all identified speakers.
- **FR.111**: System shall detect "Interruptions" based on a speech overlap threshold of 300ms.
- **FR.112**: System shall measure "Longest Monologue" and "Speaking Pace" (Words per Minute - WPM) for every participant.
- **FR.113**: System shall provide "Collaboration Insights" highlighting dominant participants and suggesting better session balance.
- **FR.114**: System shall compute a "Total Questions" metric to measure curiosity and engagement level across sessions.

## 3.3.16 Centralized Decision Log (Truth Repository)
- **FR.115**: System shall maintain a global "Decision Log" aggregating all key decisions extracted across the user's entire meeting history.
- **FR.116**: User shall be able to search the Decision Log by keyword and navigate directly to the source meeting.
- **FR.117**: System shall visualize the Decision Log as a chronological "Truth Stream" using a vertical timeline architecture.

## 3.3.17 Design System & Visual Standards
- **FR.118**: System shall strictly adhere to the "Luminous Archive" design specification, utilizing OLED Black (#020617) as the primary background.
- **FR.119**: System shall avoid 1px solid borders for sectioning, using tonal transitions or "Ghost Borders" (15% opacity) exclusively.
- **FR.120**: System shall utilize Plus Jakarta Sans for all UI textual content and JetBrains Mono for all technical metadata (timestamps, file sizes).
- **FR.121**: System shall visually distinguish AI-generated insights using subtle indigo/violet pulsing glows or specific Lucide AI icons.
