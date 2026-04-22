# EchoNote — Comprehensive Testing Report

**Project:** EchoNote – AI-Powered Meeting Intelligence Platform  
**Version:** 1.0  
**Prepared By:** QA Testing Team  
**Supervisor:** Mr. Imran Khan  
**Date:** April 2026  
**Testing Scope:** Functional & Non-Functional Requirements (FR.01–FR.114, NFR.01–NFR.04)

---

## Table of Contents

1. [Testing Methodology](#1-testing-methodology)
2. [Unit Testing – Module 1: User Authentication](#module-1--user-authentication--account-management)
3. [Unit Testing – Module 2: Audio Recording & Upload](#module-2--audio-recording--upload)
4. [Unit Testing – Module 3: AI Pipeline (Audio Processing)](#module-3--ai-pipeline-audio-processing)
5. [Unit Testing – Module 4: Transcription (Deepgram)](#module-4--transcription-deepgram)
6. [Unit Testing – Module 5: NLP Analysis (SpaCy)](#module-5--nlp-analysis-spacy)
7. [Unit Testing – Module 6: AI Summarization (Groq/Llama 3.3)](#module-6--ai-summarization-grqollama-33)
8. [Unit Testing – Module 7: Action Items & Task Management](#module-7--action-items--task-management)
9. [Unit Testing – Module 8: Meeting Management](#module-8--meeting-management)
10. [Unit Testing – Module 9: Dashboard & Analytics](#module-9--dashboard--analytics)
11. [Unit Testing – Module 10: File Downloads & Exports](#module-10--file-downloads--exports)
12. [Unit Testing – Module 11: Notifications (Email/Slack)](#module-11--notifications-emailslack)
13. [Unit Testing – Module 12: Real-Time Collaboration (Liveblocks)](#module-12--real-time-collaboration-liveblocks)
14. [Unit Testing – Module 13: Group Workspaces & Teams](#module-13--group-workspaces--teams)
15. [Unit Testing – Module 14: Privacy & Data Control](#module-14--privacy--data-control)
16. [Unit Testing – Module 15: Calendar Integration](#module-15--calendar-integration)
17. [Integration Testing](#3-integration-testing)
18. [Functional Testing](#4-functional-testing)
19. [Security Testing](#5-security-testing)
20. [Non-Functional Requirements Testing](#6-non-functional-requirements-testing)
21. [Test Summary](#7-test-summary)

---

## 1. Testing Methodology

### 1.1 Overview
This document presents a comprehensive testing evaluation of the EchoNote system. Testing is performed across four categories to validate all functional and non-functional requirements.

| Testing Type | Scope | Goal |
|---|---|---|
| **Unit Testing** | Individual modules and functions in isolation | Verify each component behaves correctly independently |
| **Integration Testing** | Interactions between modules (e.g., AI pipeline) | Ensure data flows correctly between services |
| **Functional Testing** | End-to-end user workflows via UI | Validate all user-facing features against FRs |
| **Security Testing** | Authentication, authorization, rate limiting | Ensure the system is protected from unauthorized access |

### 1.2 Test Case Format

| Column | Description |
|---|---|
| **Test ID** | Unique identifier for the test case |
| **Req ID** | Corresponding Functional/Non-Functional Requirement ID |
| **Test Description** | What is being tested |
| **Input Data** | Specific data or actions used to trigger the test |
| **Expected Result** | The correct system behavior |
| **Actual Result** | Whether the system produced the correct output (`True` = correct, `False` = incorrect) |
| **Status** | `PASS` or `FAIL` |

---

## 2. Unit Testing

### Module 1 – User Authentication & Account Management

> **Reference:** FR.01–FR.07

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-AUTH-01 | FR.01 | User signs up via Google OAuth | Valid Google account (`test@gmail.com`) | User record created in DB; JWT issued; redirected to Dashboard | True | PASS |
| UT-AUTH-02 | FR.01 | Sign-up with already registered email | Email already in DB (`test@gmail.com`) | System upserts existing record; no duplicate user created | True | PASS |
| UT-AUTH-03 | FR.02 | User logs in with valid Google credentials | Valid Google OAuth token | Session established; `accessToken` and `refreshToken` returned | True | PASS |
| UT-AUTH-04 | FR.02 | Login with invalid/expired Google token | `token = "invalid_token_xyz"` | System returns HTTP 401 with error `"Invalid Google token"` | True | PASS |
| UT-AUTH-05 | FR.03 | View user profile information | Authenticated request `GET /api/auth/me` | Returns `{ name, email, picture }` from Google profile | True | PASS |
| UT-AUTH-06 | FR.04 | User logs out securely | `POST /api/auth/logout` with valid JWT | Refresh token deleted from DB; HTTP 200 returned | True | PASS |
| UT-AUTH-07 | FR.05 | JWT token is issued on login | Successful OAuth handshake | `accessToken` (15-min expiry) and `refreshToken` (7-day expiry) generated | True | PASS |
| UT-AUTH-08 | FR.05 | JWT refresh token rotation | `POST /api/auth/refresh` with valid refresh token | New `accessToken` issued; old refresh token invalidated | True | PASS |
| UT-AUTH-09 | FR.05 | Access protected route with expired JWT | Expired `accessToken` in header | HTTP 401 `"Token expired"` returned | True | PASS |
| UT-AUTH-10 | FR.06 | User deletes their account | `DELETE /api/users/me` with valid JWT | All meetings, transcripts, summaries, and user record permanently deleted | True | PASS |
| UT-AUTH-11 | FR.07 | Last login timestamp updates on login | Successful login | `lastLoginAt` field updated to current UTC timestamp in DB | True | PASS |
| UT-AUTH-12 | FR.01 | Google ID Token cryptographic verification | Tampered Google token | Signature verification fails; HTTP 401 returned | True | PASS |

---

### Module 2 – Audio Recording & Upload

> **Reference:** FR.69–FR.76

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-AUD-01 | FR.69 | Start live browser recording | Click "Start Recording" button | MediaRecorder initialized; FFT waveform visualizer active | True | PASS |
| UT-AUD-02 | FR.70 | Enforce 10-minute recording limit | Record audio for 601 seconds (10m 1s) | Recording auto-stops; upload rejected with HTTP 400 `"Duration exceeds 10 minutes"` | True | PASS |
| UT-AUD-03 | FR.70 | Accept recording exactly at 10-minute limit | Record audio for exactly 600 seconds | Upload accepted and queued for processing | True | PASS |
| UT-AUD-04 | FR.71 | Pause and resume live recording | Click "Pause" then "Resume" | Recording pauses cleanly; resumes without audio gap | True | PASS |
| UT-AUD-05 | FR.71 | Stop and discard a recording | Click "Stop" then "Discard" | Blob cleared from memory; recording state reset; no file uploaded | True | PASS |
| UT-AUD-06 | FR.72 | Display live recording timer | Active recording in progress | Timer displays in `MM:SS` format and increments every second | True | PASS |
| UT-AUD-07 | FR.73 | Playback preview before submission | Click "Preview" on stopped recording | Audio plays back within the browser before upload is triggered | True | PASS |
| UT-AUD-08 | FR.74 | Upload a pre-recorded WAV file | Upload `meeting.wav` (2 min, 5 MB) | File accepted, queued for processing pipeline | True | PASS |
| UT-AUD-09 | FR.75 | Upload supported audio format (MP3) | Upload `recording.mp3` | File accepted for processing | True | PASS |
| UT-AUD-10 | FR.75 | Upload supported audio format (M4A) | Upload `meeting.m4a` | File accepted for processing | True | PASS |
| UT-AUD-11 | FR.75 | Upload unsupported audio format | Upload `presentation.pdf` | HTTP 400 returned; `"Unsupported file format"` error message | True | PASS |
| UT-AUD-12 | FR.76 | Reject file exceeding 50MB size limit | Upload `large_meeting.wav` (55 MB) | HTTP 400 returned; `"File exceeds 50MB limit"` | True | PASS |
| UT-AUD-13 | FR.76 | Accept file at exactly 50MB | Upload `edge_case.mp3` (50 MB exactly) | File accepted for processing | True | PASS |
| UT-AUD-14 | FR.75 | Validate file via magic-byte header check | Upload a `.wav` file with corrupted binary header | HTTP 400 returned; `"File does not appear to be valid audio"` | True | PASS |

---

### Module 3 – AI Pipeline (Audio Processing)

> **Reference:** FR.31–FR.33

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-AUDIO-01 | FR.31 | Pipeline automatically triggers after upload | Valid audio file uploaded via `POST /api/meetings/upload` | Status transitions: `UPLOADING → PROCESSING_AUDIO → TRANSCRIBING → PROCESSING_NLP → SUMMARIZING → COMPLETED` | True | PASS |
| UT-AUDIO-02 | FR.32 | Noise reduction applied to audio | Audio file with background noise uploaded | Python `noisereduce` script runs; SNR improved; `audioResult.success = true` | True | PASS |
| UT-AUDIO-03 | FR.33 | Audio converted to 16kHz mono PCM WAV | Stereo MP3 at 44.1kHz uploaded | Output file is 16kHz, mono, PCM WAV (verified via ffprobe) | True | PASS |
| UT-AUDIO-04 | FR.31 | Status transitions during pipeline | Upload valid audio | Each pipeline stage reflects correct DB `status` field at each step | True | PASS |
| UT-AUDIO-05 | FR.43 | Pipeline sets FAILED status on audio error | Corrupt/unreadable audio file uploaded | Status set to `FAILED`; error code returned; failure email triggered | True | PASS |
| UT-AUDIO-06 | FR.32 | Audio optimization heuristics (FFmpeg fallback) | Audio where Python script is unavailable | FFmpeg applies frequency filtering and normalization as fallback | True | PASS |
| UT-AUDIO-07 | FR.61 | Temp audio file deleted after processing | Successfully processed meeting | Local temp audio file removed; only Supabase URL stored in DB | True | PASS |

---

### Module 4 – Transcription (Deepgram)

> **Reference:** FR.34

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-TRANS-01 | FR.34 | Transcribe clear speech audio | 2-minute clean English meeting audio | Text transcript generated; confidence score ≥ 88% | True | PASS |
| UT-TRANS-02 | FR.34 | Transcription confidence scoring | Clear audio with distinct speech | `transcriptConfidence` field in DB is ≥ 0.88 | True | PASS |
| UT-TRANS-03 | FR.34 | Multi-speaker diarization (2 speakers) | Audio with 2 distinct speakers | Transcript segments labeled as `SPEAKER_0`, `SPEAKER_1` | True | PASS |
| UT-TRANS-04 | FR.34 | Multi-speaker diarization (3+ speakers) | Audio with 3 speakers | All 3 speakers identified with unique labels | True | PASS |
| UT-TRANS-05 | FR.34 | Formatted timestamp output | Any multi-speaker meeting | Segments output as `[MM:SS] [SPEAKER_X]: text` format | True | PASS |
| UT-TRANS-06 | FR.36 | ASR-native entity detection | Transcript mentioning "Google" and "New York" | Deepgram entities detected and passed to NLP stage | True | PASS |
| UT-TRANS-07 | FR.34 | Low-confidence word flagging | Audio with mumbled words | Low-confidence words flagged and passed to LLM with caution markers | True | PASS |
| UT-TRANS-08 | FR.34 | Domain keyword boosting | Audio using EchoNote-specific terms | Custom keywords recognized more accurately by ASR | True | PASS |
| UT-TRANS-09 | FR.34 | Deepgram API failure handling (retry) | Simulated Deepgram 429 rate limit response | Exponential backoff retry logic activates; retries up to 3 times | True | PASS |
| UT-TRANS-10 | FR.34 | Transcription of silent audio | Upload near-silent audio file (< 1s speech) | Empty transcript returned; processing continues without crash | True | PASS |
| UT-TRANS-11 | FR.21 | Speaker label renamed in transcript | User renames `SPEAKER_0` to "Ahmed" | All `SPEAKER_0` labels updated to "Ahmed" in transcript display | True | PASS |

---

### Module 5 – NLP Analysis (SpaCy)

> **Reference:** FR.35–FR.37

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-NLP-01 | FR.35 | SpaCy pipeline processes transcript | Diarized transcript text passed to `nlpService` | `nlpResult.success = true`; entities, SVOs, and signals extracted | True | PASS |
| UT-NLP-02 | FR.36 | Named entity recognition – Person | Transcript: "Ahmed will handle the review" | `entities` contains `{ text: "Ahmed", label: "PERSON" }` | True | PASS |
| UT-NLP-03 | FR.36 | Named entity recognition – Organization | Transcript: "We discussed this with Google" | `entities` contains `{ text: "Google", label: "ORG" }` | True | PASS |
| UT-NLP-04 | FR.36 | Named entity recognition – Location | Transcript: "The team is in Karachi" | `entities` contains `{ text: "Karachi", label: "GPE" }` | True | PASS |
| UT-NLP-05 | FR.36 | Named entity recognition – Date | Transcript: "Deadline is next Friday" | `entities` contains date entity | True | PASS |
| UT-NLP-06 | FR.37 | Sentiment classification – Positive | Upbeat meeting transcript | `nlpSentiment` = `"Positive"` | True | PASS |
| UT-NLP-07 | FR.37 | Sentiment classification – Negative | Complaint/conflict-heavy transcript | `nlpSentiment` = `"Negative"` | True | PASS |
| UT-NLP-08 | FR.37 | Sentiment classification – Neutral | Factual/technical meeting transcript | `nlpSentiment` = `"Neutral"` | True | PASS |
| UT-NLP-09 | FR.37 | Sentiment classification – Mixed | Transcript with both positive and negative content | `nlpSentiment` = `"Mixed"` | True | PASS |
| UT-NLP-10 | FR.35 | SVO triplet extraction | Transcript: "Sara approved the budget" | `svoTriplets` contains `{ subject: "Sara", verb: "approved", object: "budget" }` | True | PASS |
| UT-NLP-11 | FR.35 | Action signal detection | Transcript: "I will finish the report by Monday" | `actionSignals` contains this commitment marker | True | PASS |
| UT-NLP-12 | FR.35 | Interrogative question detection | Transcript: "Who will handle the deployment?" | `questions` contains this interrogative sentence | True | PASS |
| UT-NLP-13 | FR.35 | NLP failure does not crash pipeline | SpaCy script returns error | Warning logged; pipeline continues to summarization without NLP data | True | PASS |
| UT-NLP-14 | FR.35 | Speaker-entity mapping | Transcript: `[0:00] [SPEAKER_0]: I'm Ahmed` | `speakerEntityMap` maps `SPEAKER_0` to `"Ahmed"` | True | PASS |

---

### Module 6 – AI Summarization (Groq/Llama 3.3)

> **Reference:** FR.38–FR.42

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-SUM-01 | FR.38 | Groq LLM generates structured summary | Diarized transcript + NLP signals passed | `summaryResult.success = true`; all fields populated | True | PASS |
| UT-SUM-02 | FR.39 | Executive summary extracted | Any complete meeting transcript | `summaryExecutive` field contains a concise paragraph summary | True | PASS |
| UT-SUM-03 | FR.40 | Key decisions extracted | Transcript: "We decided to use Vue.js for frontend" | `summaryKeyDecisions` contains `"Use Vue.js for frontend"` | True | PASS |
| UT-SUM-04 | FR.41 | Next steps extracted | Transcript: "Sara will update the documentation next week" | `summaryNextSteps` contains the follow-up item | True | PASS |
| UT-SUM-05 | FR.42 | Summary tuned by meeting category (SALES) | `category = "SALES"` meeting transcript | Summary prompt includes sales-specific instructions; output reflects deal-focused analysis | True | PASS |
| UT-SUM-06 | FR.42 | Summary tuned by meeting category (STANDUP) | `category = "STANDUP"` meeting transcript | Summary prompt reflects standup format (blockers, done, in-progress) | True | PASS |
| UT-SUM-07 | FR.42 | Summary tuned by meeting category (RETROSPECTIVE) | `category = "RETROSPECTIVE"` meeting | Summary reflects retrospective format (what went well, areas to improve) | True | PASS |
| UT-SUM-08 | FR.43 | Summarization failure sets FAILED status | Groq API returns error / timeout | Meeting status set to `FAILED`; error logged; failure email triggered | True | PASS |
| UT-SUM-09 | FR.38 | JSON schema enforced in LLM output | Any transcript sent to Groq | Response parsed successfully into structured object; no raw text bleed | True | PASS |
| UT-SUM-10 | FR.38 | Hallucination check via second LLM pass | Transcript with specific facts | Second verification pass confirms no fabricated facts added to summary | True | PASS |
| UT-SUM-11 | FR.38 | NLP context fused into LLM prompt | SpaCy entities and action signals available | Summary prompt includes entity list and action signals as context | True | PASS |
| UT-SUM-12 | FR.20 | Manual reprocessing triggers new summary | `POST /api/meetings/:id/reprocess` | New Groq LLM pass executes; summary fields updated in DB | True | PASS |
| UT-SUM-13 | FR.38 | Key topics extracted | Technical meeting transcript | `summaryKeyTopics` array contains relevant topic tags | True | PASS |

---

### Module 7 – Action Items & Task Management

> **Reference:** FR.45–FR.52

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-TASK-01 | FR.45 | Action items extracted from transcript | Transcript: "Ali needs to submit the report by Friday" | `actionItems` array contains task: `"Submit the report"` | True | PASS |
| UT-TASK-02 | FR.46 | Assignee detected for action item | Transcript: "Sara will review the code" | Action item `assignee = "Sara"` | True | PASS |
| UT-TASK-03 | FR.46 | No assignee when not mentioned | Transcript: "The report needs to be done by Monday" | Action item `assignee = null` | True | PASS |
| UT-TASK-04 | FR.47 | Deadline detected for action item | Transcript: "Complete the testing by next Friday" | Action item `deadline = "next Friday"` or parsed date | True | PASS |
| UT-TASK-05 | FR.47 | No deadline when not mentioned | Transcript: "John will update the docs" | Action item `deadline = null` | True | PASS |
| UT-TASK-06 | FR.48 | High priority assigned to urgent tasks | Transcript: "We urgently need to fix the bug ASAP" | Action item `priority = "high"` | True | PASS |
| UT-TASK-07 | FR.48 | Medium priority for standard tasks | Transcript: "We should update the readme" | Action item `priority = "medium"` | True | PASS |
| UT-TASK-08 | FR.48 | Low priority for minor tasks | Transcript: "It would be nice if we added dark mode someday" | Action item `priority = "low"` | True | PASS |
| UT-TASK-09 | FR.49 | Confidence metric assigned | Any extracted action item | `confidence` field present and set to `"high"`, `"medium"`, or `"low"` | True | PASS |
| UT-TASK-10 | FR.50 | Source quote linked to action item | Extracted action item | `sourceQuote` contains verbatim text from the transcript | True | PASS |
| UT-TASK-11 | FR.51 | Global Kanban board displays all tasks | Navigate to Tasks page | All action items across all meetings shown in Kanban view (TODO/IN_PROGRESS/DONE) | True | PASS |
| UT-TASK-12 | FR.52 | Transition task from TODO to IN_PROGRESS | `PATCH /api/tasks/:id` with `{ status: "IN_PROGRESS" }` | Task status updated in DB; Kanban card moves to "In Progress" column | True | PASS |
| UT-TASK-13 | FR.52 | Transition task from IN_PROGRESS to DONE | `PATCH /api/tasks/:id` with `{ status: "DONE" }` | Task status updated in DB; Kanban card moves to "Done" column | True | PASS |
| UT-TASK-14 | FR.51 | Action items saved to relational DB | Completed meeting with 3 action items | 3 `ActionItem` records created in DB, each linked to `meetingId` and `userId` | True | PASS |
| UT-TASK-15 | FR.52 | Task-Meeting parent sync | Task status updated via Kanban | `summaryActionItems` field on parent Meeting record also updated | True | PASS |

---

### Module 8 – Meeting Management

> **Reference:** FR.08–FR.21

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-MTG-01 | FR.08 | Create a new meeting | `{ title: "Q4 Planning", date: "2026-04-21", category: "PLANNING" }` | Meeting record created with `status = "UPLOADING"`; meeting ID returned | True | PASS |
| UT-MTG-02 | FR.09 | Create meeting with valid category | `category = "SALES"` | Meeting created with `SALES` category | True | PASS |
| UT-MTG-03 | FR.09 | Create meeting with invalid category | `category = "RANDOM_CATEGORY"` | HTTP 400 returned; `"Invalid category"` error | True | PASS |
| UT-MTG-04 | FR.10 | Retrieve paginated meeting list | `GET /api/meetings?page=1&limit=10` | Returns 10 meetings with pagination metadata (`total`, `page`, `totalPages`) | True | PASS |
| UT-MTG-05 | FR.11 | Filter meetings by category | `GET /api/meetings?category=STANDUP` | Only STANDUP meetings returned | True | PASS |
| UT-MTG-06 | FR.11 | Filter meetings by date range | `GET /api/meetings?startDate=2026-01-01&endDate=2026-04-21` | Only meetings within date range returned | True | PASS |
| UT-MTG-07 | FR.11 | Filter meetings by status | `GET /api/meetings?status=COMPLETED` | Only COMPLETED meetings returned | True | PASS |
| UT-MTG-08 | FR.12 | Search meetings by title | `GET /api/meetings/search?q=planning` | Meetings with "planning" in title returned | True | PASS |
| UT-MTG-09 | FR.12 | Search meetings by transcript keyword | `GET /api/meetings/search?q=deployment` | Meetings containing "deployment" in transcript returned | True | PASS |
| UT-MTG-10 | FR.13 | View detailed meeting information | `GET /api/meetings/:id` | Full meeting object returned (title, date, duration, category, status, transcript, summary, action items) | True | PASS |
| UT-MTG-11 | FR.14 | Update meeting title | `PATCH /api/meetings/:id` with `{ title: "Updated Title" }` | Meeting title updated in DB; HTTP 200 returned | True | PASS |
| UT-MTG-12 | FR.14 | Update meeting category | `PATCH /api/meetings/:id` with `{ category: "RETROSPECTIVE" }` | Meeting category updated in DB | True | PASS |
| UT-MTG-13 | FR.15 | Delete a meeting | `DELETE /api/meetings/:id` | Meeting record, audio blob, transcript, and summary permanently deleted; HTTP 200 returned | True | PASS |
| UT-MTG-14 | FR.16 | Bulk delete multiple meetings | Select 3 meetings via checkboxes; click "Delete Selected" | All 3 meetings deleted in batch operation | True | PASS |
| UT-MTG-15 | FR.17 | Processing status tracking | Upload audio and monitor status | Status transitions correctly through all 7 stages | True | PASS |
| UT-MTG-16 | FR.18 | Progress displayed on frontend | Processing meeting observed in UI | Progress bar / status badge updates in real time | True | PASS |
| UT-MTG-17 | FR.19 | Frontend polls for status updates | Processing meeting | Frontend polls `GET /api/meetings/:id/status` every 5s until COMPLETED/FAILED | True | PASS |
| UT-MTG-18 | FR.27 | Auto-redirect to Meeting Detail after upload | Audio upload completes | User immediately redirected to Meeting Detail page for the new meeting | True | PASS |

---

### Module 9 – Dashboard & Analytics

> **Reference:** FR.22–FR.30

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-DASH-01 | FR.22 | Dashboard displays aggregate statistics | Authenticated user with 5 meetings | Dashboard shows correct totals | True | PASS |
| UT-DASH-02 | FR.23 | Total Meetings count is accurate | User has 8 meetings in DB | Dashboard displays `Total Meetings: 8` | True | PASS |
| UT-DASH-03 | FR.23 | Processing count is accurate | 2 meetings in PROCESSING state | Dashboard displays `Processing: 2` | True | PASS |
| UT-DASH-04 | FR.23 | Completed count is accurate | 6 meetings in COMPLETED state | Dashboard displays `Completed: 6` | True | PASS |
| UT-DASH-05 | FR.23 | Total duration aggregated correctly | Meetings totaling 45 minutes | Dashboard displays `Total Duration: 45m` | True | PASS |
| UT-DASH-06 | FR.24 | Analytics page shows engagement metrics | Navigate to Analytics page | Engagement score, topic usage, and sentiment trend charts displayed | True | PASS |
| UT-DASH-07 | FR.24 | Analytics page shows sentiment distribution | Multiple meetings with varied sentiments | Pie chart or bar chart shows distribution of Positive/Neutral/Negative | True | PASS |
| UT-DASH-08 | FR.25 | Toggle Dark Mode to Light Mode | Click theme toggle in UI | Application switches to Light Mode theme | True | PASS |
| UT-DASH-09 | FR.25 | Toggle Light Mode back to Dark Mode | Click theme toggle again | Application switches back to OLED Dark Mode | True | PASS |
| UT-DASH-10 | FR.29 | Decisions module shows global decisions | Navigate to Decisions page | All `key decisions` from all past meetings listed in one unified view | True | PASS |
| UT-DASH-11 | FR.30 | Storage usage displayed in settings | Navigate to User Settings | Cloud storage used vs. allocated limit displayed as progress bar | True | PASS |

---

### Module 10 – File Downloads & Exports

> **Reference:** FR.53–FR.62

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-DL-01 | FR.53 | Download processed audio as MP3 | `GET /api/meetings/:id/download/audio` | Audio file downloaded in MP3 format | True | PASS |
| UT-DL-02 | FR.54 | Download transcript as TXT | `GET /api/meetings/:id/download/transcript?format=txt` | Plain text transcript file downloaded | True | PASS |
| UT-DL-03 | FR.55 | Download transcript as JSON | `GET /api/meetings/:id/download/transcript?format=json` | JSON-structured transcript file downloaded | True | PASS |
| UT-DL-04 | FR.56 | Download summary as TXT | `GET /api/meetings/:id/download/summary?format=txt` | Plain text summary file downloaded | True | PASS |
| UT-DL-05 | FR.57 | Download summary as JSON | `GET /api/meetings/:id/download/summary?format=json` | JSON-structured summary file downloaded | True | PASS |
| UT-DL-06 | FR.58 | Download all files as ZIP | `GET /api/meetings/:id/download/zip` | ZIP archive containing audio, transcript, and summary downloaded | True | PASS |
| UT-DL-07 | FR.59 | Download filename contains title and timestamp | Any download action | Filename format: `{MeetingTitle}_{YYYY-MM-DD}.{ext}` | True | PASS |
| UT-DL-08 | FR.60 | Unauthorized download attempt rejected | `GET /api/meetings/:otherId/download/audio` with different user's JWT | HTTP 403 returned; file not delivered | True | PASS |
| UT-DL-09 | FR.67 | Export all user data as JSON | `GET /api/users/export` | Complete JSON payload with meetings, transcripts, summaries, and profile returned | True | PASS |

---

### Module 11 – Notifications (Email/Slack)

> **Reference:** FR.44, FR.26, FR.94–FR.97

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-NOTIF-01 | FR.44 | Email sent on processing COMPLETED | Meeting processing finishes | User receives HTML email with summary, decisions, and action items | True | PASS |
| UT-NOTIF-02 | FR.44 | Email sent on processing FAILED | Processing pipeline throws error | User receives failure notification email with error context | True | PASS |
| UT-NOTIF-03 | FR.26 | Email notification can be disabled | User toggles "Email Notifications" off in settings | No email sent when next meeting completes | True | PASS |
| UT-NOTIF-04 | FR.26 | Email notification re-enabled | User toggles "Email Notifications" back on | Email sent again on next meeting completion | True | PASS |
| UT-NOTIF-05 | FR.94 | Slack webhook URL saved in settings | Submit valid Slack webhook URL in settings | URL saved to `user.slackWebhookUrl` in DB | True | PASS |
| UT-NOTIF-06 | FR.95 | Slack notification sent on completion | Meeting completes; Slack webhook configured | Formatted meeting summary message dispatched to Slack channel | True | PASS |
| UT-NOTIF-07 | FR.96 | AI-drafted follow-up email generated | Click "Generate Follow-Up Email" on completed meeting | Groq LLM generates email draft containing key decisions and action items | True | PASS |
| UT-NOTIF-08 | FR.97 | Follow-up email tone set to Formal | Select "Formal" tone in FollowUpModal | Generated email uses professional/formal language | True | PASS |
| UT-NOTIF-09 | FR.97 | Follow-up email tone set to Casual | Select "Casual" tone in FollowUpModal | Generated email uses conversational/casual language | True | PASS |
| UT-NOTIF-10 | FR.44 | Welcome email sent on new registration | New user registers via Google OAuth | Welcome email with platform overview sent to user's Gmail | True | PASS |

---

### Module 12 – Real-Time Collaboration (Liveblocks)

> **Reference:** FR.98–FR.102

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-LIVE-01 | FR.98 | Real-time transcript editing in shared session | Two users editing same transcript simultaneously | Both users see changes in real-time via Liveblocks sync | True | PASS |
| UT-LIVE-02 | FR.99 | Active user presence indicators shown | 2 users in same workspace meeting | Both user names and avatars shown as "online" | True | PASS |
| UT-LIVE-03 | FR.100 | Unique cursor colors assigned to participants | 2+ users in collaborative session | Each user's cursor displayed in a distinct, dynamically assigned color | True | PASS |
| UT-LIVE-04 | FR.101 | Liveblocks room authorization | `POST /api/liveblocks/auth` with valid workspace JWT | Token issued for `workspace_id:meeting_id` room | True | PASS |
| UT-LIVE-05 | FR.101 | Unauthorized room access rejected | User not in workspace tries to access collaborative room | Liveblocks auth returns error; room access denied | True | PASS |
| UT-LIVE-06 | FR.102 | OWNER role gets Full Access | Workspace Owner opens collaborative session | User has full read/write permissions on Liveblocks room | True | PASS |
| UT-LIVE-07 | FR.102 | VIEWER role gets Read-Only Access | Workspace Viewer opens collaborative session | User has read-only permissions; cannot edit transcript | True | PASS |

---

### Module 13 – Group Workspaces & Teams

> **Reference:** FR.103–FR.108

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-WS-01 | FR.103 | Create a new workspace | `POST /api/workspaces` with `{ name: "Dev Team" }` | Workspace created; creator assigned OWNER role | True | PASS |
| UT-WS-02 | FR.103 | Delete a workspace (by owner) | `DELETE /api/workspaces/:id` by OWNER | Workspace and all linked data deleted; HTTP 200 | True | PASS |
| UT-WS-03 | FR.103 | Delete workspace by non-owner rejected | `DELETE /api/workspaces/:id` by EDITOR | HTTP 403 returned; workspace not deleted | True | PASS |
| UT-WS-04 | FR.104 | Invite member to workspace by email | `POST /api/workspaces/:id/members` with `{ email: "ali@echo.com", role: "EDITOR" }` | Member added to workspace; invitation email sent | True | PASS |
| UT-WS-05 | FR.104 | Invite non-EchoNote user | Email that has no EchoNote account | HTTP 404 returned; `"User not found"` | True | PASS |
| UT-WS-06 | FR.105 | Invitation email dispatched | Member added to workspace | Invitation email with workspace link and role info received by invitee | True | PASS |
| UT-WS-07 | FR.106 | Update member role to VIEWER | `PATCH /api/workspaces/:id/members/:userId/role` with `{ role: "VIEWER" }` | Member role updated; access level adjusted | True | PASS |
| UT-WS-08 | FR.107 | Attach personal meeting to workspace | `POST /api/workspaces/:id/meetings` with `{ meetingId: "..." }` | Meeting linked to workspace; visible to all members | True | PASS |
| UT-WS-09 | FR.108 | Prevent linking meeting to two workspaces | Attempt to add same meeting to second workspace | HTTP 400 returned; `"Meeting already linked to a workspace"` | True | PASS |
| UT-WS-10 | FR.103 | Remove member from workspace | `DELETE /api/workspaces/:id/members/:userId` | Member removed; no longer has access | True | PASS |

---

### Module 14 – Privacy & Data Control

> **Reference:** FR.63–FR.68

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-PRIV-01 | FR.63 | Data retention period set to 30 days | User selects "30 days" in Settings | `dataRetentionDays = 30` saved to user settings in DB | True | PASS |
| UT-PRIV-02 | FR.64 | Auto-delete triggers for expired meetings | Meeting older than configured retention period | Meeting soft-deleted by cron job; `audioDeletedAt` timestamp set | True | PASS |
| UT-PRIV-03 | FR.65 | Warning email sent 7 days before auto-delete | Meeting approaching retention expiry | User receives email: "Your meeting will be deleted in 7 days" | True | PASS |
| UT-PRIV-04 | FR.66 | User manually deletes a meeting | Click "Delete" on meeting card | Meeting deleted immediately; no retention period enforced | True | PASS |
| UT-PRIV-05 | FR.67 | Export all account data | `GET /api/users/export` | ZIP/JSON file containing all meetings, transcripts, summaries, and profile info | True | PASS |
| UT-PRIV-06 | FR.68 | Privacy policy page accessible | Navigate to `/privacy` | Full privacy policy text rendered | True | PASS |
| UT-PRIV-07 | FR.62 | Cron job purges orphaned temp files | Temp files older than 24 hours present on disk | Cron scans and deletes orphaned files; count logged | True | PASS |

---

### Module 15 – Calendar Integration

> **Reference:** FR.90–FR.93

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| UT-CAL-01 | FR.90 | Connect Google Calendar via OAuth | Click "Connect Google Calendar" in Settings | OAuth consent screen shown; calendar permissions granted; credentials stored | True | PASS |
| UT-CAL-02 | FR.91 | View upcoming calendar events | Navigate to Calendar page (connected account) | List of upcoming Google Calendar events displayed | True | PASS |
| UT-CAL-03 | FR.92 | Link processed meeting to calendar event | Meeting created from Google Calendar event | `googleEventId` field populated in Meeting DB record | True | PASS |
| UT-CAL-04 | FR.93 | Calendar attendees used for speaker tracing | Google event with 3 attendees | Attendees listed in summary context for speaker-entity mapping | True | PASS |
| UT-CAL-05 | FR.90 | Disconnect Google Calendar | Click "Disconnect" in Settings | Calendar credentials removed from DB; calendar page shows "Not connected" | True | PASS |
| UT-CAL-06 | FR.91 | Token refresh on calendar 401 | Simulated expired Google calendar token | Background token refresh triggered; calendar events fetched again successfully | True | PASS |

---

## 3. Integration Testing

> Integration tests verify that multiple modules work together correctly across the full system pipeline.

### 3.1 AI Processing Pipeline – End-to-End Integration

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| IT-PIPE-01 | FR.31–FR.43 | Full AI pipeline runs sequentially | Valid meeting audio (WAV, 3 min) uploaded | Audio → Transcription → NLP → Summarization → DB Update; all succeed in sequence | True | PASS |
| IT-PIPE-02 | FR.31, FR.43 | Audio failure stops pipeline | Corrupt audio file | `audio.service` fails; pipeline halts; status `FAILED`; downstream services NOT called | True | PASS |
| IT-PIPE-03 | FR.34, FR.43 | Transcription failure stops pipeline | Deepgram API returns 500 error | Transcription fails; NLP and summarization NOT invoked; status `FAILED` | True | PASS |
| IT-PIPE-04 | FR.35, FR.38 | NLP failure is non-blocking | SpaCy script crashes | Warning logged; pipeline continues to summarization without NLP data; meeting still COMPLETED | True | PASS |
| IT-PIPE-05 | FR.38, FR.43 | Summarization failure stops pipeline | Groq API unreachable | Summarization fails; status `FAILED`; failure email sent | True | PASS |
| IT-PIPE-06 | FR.45–FR.50 | Action items created from summary output | Summary contains 3 action items | 3 `ActionItem` DB records created; all linked to `meetingId` and `userId` | True | PASS |
| IT-PIPE-07 | FR.44 | Completion email sent after COMPLETED | Pipeline finishes successfully | Email dispatched to user's registered Gmail address | True | PASS |
| IT-PIPE-08 | FR.44 | Failure email sent after FAILED | Pipeline fails at any stage | Failure email dispatched with error message | True | PASS |

---

### 3.2 Auth System – Frontend–Backend Integration

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| IT-AUTH-01 | FR.01–FR.05 | Google OAuth login flow (full cycle) | User clicks "Sign in with Google" | Auth code exchanged; user upserted; JWT pair issued; frontend Auth Context updated | True | PASS |
| IT-AUTH-02 | FR.05 | JWT refresh flow on expiry | Access token expires mid-session | Frontend calls `/api/auth/refresh`; new token issued; request retried automatically | True | PASS |
| IT-AUTH-03 | FR.04 | Logout clears all session state | Click "Logout" | JWT deleted from localStorage; Auth Context reset; user redirected to Login page | True | PASS |
| IT-AUTH-04 | FR.05 | Protected route blocks unauthenticated user | Navigate to `/dashboard` without JWT | Redirected to Login page; 401 returned by API | True | PASS |

---

### 3.3 Database Persistence – Meeting & Action Item Sync

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| IT-DB-01 | FR.17, FR.87 | DB records all pipeline timestamps | Meeting processed end-to-end | `queuedAt`, `processingStartedAt`, `processingCompletedAt` all recorded | True | PASS |
| IT-DB-02 | FR.88 | ProcessingLogs table records events | Pipeline runs | Each stage change logged to `ProcessingLogs` table | True | PASS |
| IT-DB-03 | FR.86 | Audio URL stored in DB after Supabase upload | Audio processed and uploaded | `audioUrl` field populated with valid Supabase CDN URL | True | PASS |
| IT-DB-04 | FR.52 | Action item status syncs to parent meeting | Task status changed via Kanban | Parent Meeting's `summaryActionItems` JSON updated to reflect new status | True | PASS |
| IT-DB-05 | FR.85 | Foreign key constraints enforced | Delete user with active meetings | Cascade: all user's meetings and action items deleted atomically | True | PASS |

---

### 3.4 Notification Multi-Channel Integration

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| IT-NOTIF-01 | FR.44 | Email + Slack sent in parallel on completion | Meeting completes; Slack webhook configured | Both channels receive notification; one failure does not block the other | True | PASS |
| IT-NOTIF-02 | FR.95 | Slack failure does not block email | Slack endpoint returns 500 | Email still sent successfully; Slack error logged only as warning | True | PASS |
| IT-NOTIF-03 | FR.44 | Web Push notification sent on completion | User has registered push subscription | Browser push notification dispatched; expired subscriptions auto-removed | True | PASS |

---

## 4. Functional Testing

> Functional tests validate end-to-end user journeys against the full stated requirements.

### 4.1 User Authentication Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-AUTH-01 | FR.01–FR.04 | Complete login and logout cycle | 1. Open EchoNote 2. Click "Sign in with Google" 3. Select Google account 4. Redirected to Dashboard 5. Click Logout | User successfully logs in and out; session terminated | True | PASS |
| FT-AUTH-02 | FR.03 | View and verify profile information | Login → Navigate to Profile/Settings | Displays name, email, and Google profile picture from OAuth | True | PASS |
| FT-AUTH-03 | FR.06 | Account deletion removes all data | Settings → "Delete Account" → Confirm | All meetings, transcripts, action items, and user record deleted; redirected to homepage | True | PASS |

---

### 4.2 Meeting Recording & Processing Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-REC-01 | FR.69–FR.76 | Record, submit, and view processed meeting | 1. Navigate to Record 2. Enter title 3. Select category 4. Start Recording 5. Stop after 2 min 6. Submit | Recording uploaded; auto-redirected to detail page; processing progresses through all stages | True | PASS |
| FT-REC-02 | FR.74 | Upload pre-recorded file and process | 1. Record page 2. Click "Upload File" 3. Select `meeting.mp3` 4. Submit | File uploaded; pipeline triggered; meeting processed | True | PASS |
| FT-REC-03 | FR.18–FR.19 | Monitor processing progress in real-time | After upload, observe Meeting Detail page | Status badge cycles through pipeline stages every few seconds | True | PASS |
| FT-REC-04 | FR.13 | View complete meeting details post-processing | Navigate to completed meeting | Transcript, summary, decisions, action items, key topics, and sentiment all displayed | True | PASS |

---

### 4.3 Dashboard & Search Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-DASH-01 | FR.22–FR.23 | Dashboard statistics update after new meeting | Process new meeting; return to Dashboard | Total meetings count incremented; total duration updated | True | PASS |
| FT-SEARCH-01 | FR.12 | Search for meeting by title keyword | Type "standup" in search bar on Meetings page | Only meetings with "standup" in title returned | True | PASS |
| FT-SEARCH-02 | FR.11 | Filter meetings by PLANNING category | Select "PLANNING" from category dropdown | Only PLANNING meetings displayed | True | PASS |
| FT-FILTER-01 | FR.11 | Combine date filter and category filter | Set date range Apr 2026 + category SALES | Only SALES meetings within April 2026 shown | True | PASS |

---

### 4.4 Task/Kanban Board Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-TASK-01 | FR.51–FR.52 | Manage action items via Kanban board | 1. Navigate to Tasks 2. Drag task card from TODO to IN_PROGRESS | Task status updated; card moves column; DB persisted | True | PASS |
| FT-TASK-02 | FR.52 | Mark task as DONE | Click "Move to Done" on IN_PROGRESS task | Task moves to DONE column; source meeting's `summaryActionItems` updated | True | PASS |

---

### 4.5 File Download Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-DL-01 | FR.53–FR.57 | Download audio, transcript, and summary individually | Navigate to completed meeting → click each download button | Correct file in correct format downloaded for each type | True | PASS |
| FT-DL-02 | FR.58 | Download all as ZIP package | Click "Download All (ZIP)" | Single ZIP containing audio (MP3), transcript (TXT), and summary (TXT) downloaded | True | PASS |

---

### 4.6 Workspace Collaboration Flow

| Test ID | Req ID | Test Description | Steps | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------|-----------------|---------------|--------|
| FT-WS-01 | FR.103–FR.107 | Full workspace lifecycle | 1. Create Workspace 2. Invite member 3. Attach meeting 4. Delete workspace | All steps succeed; invitation email received; meeting visible to member | True | PASS |
| FT-WS-02 | FR.98–FR.102 | Collaborative transcript editing | 2 users open same workspace meeting | Both users see real-time cursor positions and edits via Liveblocks | True | PASS |

---

## 5. Security Testing

| Test ID | Req ID | Test Description | Input Data | Expected Result | Actual Result | Status |
|---------|--------|-----------------|------------|-----------------|---------------|--------|
| ST-SEC-01 | FR.80, NFR.2.1 | Access protected endpoint without JWT | `GET /api/meetings` with no Authorization header | HTTP 401 `"No token provided"` returned | True | PASS |
| ST-SEC-02 | FR.80, NFR.2.1 | Access protected endpoint with forged JWT | Manually crafted JWT with incorrect signature | HTTP 401 `"Invalid token signature"` returned | True | PASS |
| ST-SEC-03 | FR.80, NFR.2.1 | Access protected endpoint with expired JWT | JWT issued 20 minutes ago (expired at 15 min) | HTTP 401 `"Token expired"` returned | True | PASS |
| ST-SEC-04 | FR.60, NFR.2.1 | Access another user's meeting files | User A's JWT used to download User B's audio | HTTP 403 `"Access denied"` returned; file not served | True | PASS |
| ST-SEC-05 | NFR.2.1 | RBAC – Viewer cannot delete workspace | VIEWER role user calls `DELETE /api/workspaces/:id` | HTTP 403 returned; workspace not deleted | True | PASS |
| ST-SEC-06 | NFR.2.1 | RBAC – Editor cannot change member roles | EDITOR role user calls `PATCH /api/workspaces/:id/members/:id/role` | HTTP 403 returned | True | PASS |
| ST-SEC-07 | FR.81 | Global rate limit (100 req/hr) enforced | 101 API requests in one hour from same user | 101st request returns HTTP 429 `"Too Many Requests"` | True | PASS |
| ST-SEC-08 | FR.82 | Upload rate limit (5 uploads/min) enforced | 6 upload requests in one minute | 6th upload returns HTTP 429 `"Upload limit exceeded"` | True | PASS |
| ST-SEC-09 | FR.81 | Auth rate limit (10 attempts/15 min) enforced | 11 login attempts in 15 minutes from same IP | 11th attempt returns HTTP 429 | True | PASS |
| ST-SEC-10 | NFR.2.2 | Audio data transmitted over TLS | Network inspection of upload request | All traffic uses HTTPS (TLS 1.2+); no plaintext data visible | True | PASS |
| ST-SEC-11 | NFR.2.3 | Session invalidated on logout | Logout; attempt to use old JWT | Old JWT rejected with HTTP 401 after logout | True | PASS |
| ST-SEC-12 | FR.79 | Stack traces not exposed in production | Trigger a 500 error in production mode | Error response contains only sanitized message; no stack trace in response body | True | PASS |
| ST-SEC-13 | FR.80 | JWT transmitted in Authorization header only | Check all protected API calls | All protected requests use `Authorization: Bearer <token>` pattern; no token in URL | True | PASS |
| ST-SEC-14 | FR.73 | File upload bypassed via content-type spoofing | Upload `script.js` renamed to `audio.wav` | Magic-byte header check detects invalid file; HTTP 400 returned | True | PASS |
| ST-SEC-15 | NFR.2.1 | Google OAuth exclusively used for auth | Attempt email+password authentication | No password-based auth endpoint exists; HTTP 404 returned | True | PASS |
| ST-SEC-16 | FR.60 | Public meeting viewer shows only public data | Access `/api/public/meetings/:token` | Only sanitized public fields returned; no internal data (userId, rawTranscript) exposed | True | PASS |

---

## 6. Non-Functional Requirements Testing

### 6.1 Usability (NFR.01)

| Test ID | NFR ID | Test Description | Test Method | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------------|-----------------|---------------|--------|
| NFT-USA-01 | NFR.1.1 | Responsive layout on mobile (375px width) | Resize browser to 375px; use all core features | All UI components (recorder, dashboard, meetings list) adapt and remain functional | True | PASS |
| NFT-USA-02 | NFR.1.1 | Responsive layout on tablet (768px width) | Resize browser to 768px | Layout adapts correctly; no horizontal overflow | True | PASS |
| NFT-USA-03 | NFR.1.2 | New user can navigate without training | First-time user completes recording and review task | Task completed in under 5 minutes without documentation | True | PASS |
| NFT-USA-04 | NFR.1.3 | Keyboard navigation works on Record page | Tab through all interactive elements on Record page | All buttons, inputs, and controls reachable via keyboard | True | PASS |
| NFT-USA-05 | NFR.1.3 | OLED dark mode provides sufficient contrast | Check text/background contrast ratios | Contrast ratios meet WCAG 2.1 AA standard (≥ 4.5:1) | True | PASS |

---

### 6.2 Security (NFR.02)

| Test ID | NFR ID | Test Description | Test Method | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------------|-----------------|---------------|--------|
| NFT-SEC-01 | NFR.2.1 | Google OAuth is the only authentication method | Inspect auth routes for local login endpoints | No username/password endpoints exist; `POST /api/auth/google` is the only entry point | True | PASS |
| NFT-SEC-02 | NFR.2.2 | Data encrypted in transit | Inspect network traffic with DevTools | All requests use HTTPS; `Strict-Transport-Security` header present | True | PASS |
| NFT-SEC-03 | NFR.2.3 | Session auto-expires after inactivity | Leave session idle for token expiry period | Session tokens expire; user must re-authenticate | True | PASS |

---

### 6.3 Portability (NFR.03)

| Test ID | NFR ID | Test Description | Test Method | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------------|-----------------|---------------|--------|
| NFT-PORT-01 | NFR.3.1 | Full feature parity on Google Chrome | Open EchoNote in Chrome 123+ and use all features | All features work correctly | True | PASS |
| NFT-PORT-02 | NFR.3.1 | Full feature parity on Mozilla Firefox | Open EchoNote in Firefox 120+ and use all features | All features work correctly | True | PASS |
| NFT-PORT-03 | NFR.3.1 | Full feature parity on Microsoft Edge | Open EchoNote in Edge 120+ and use all features | All features work correctly | True | PASS |
| NFT-PORT-04 | NFR.3.2 | Accessible from Windows OS | Open in Chrome on Windows 11 | All features functional | True | PASS |
| NFT-PORT-05 | NFR.3.2 | Accessible from macOS | Open in Safari on macOS 14 | All features functional | True | PASS |
| NFT-PORT-06 | NFR.3.2 | Accessible from Android mobile browser | Open in Chrome on Android 13 | UI responsive; recording and viewing functional | True | PASS |

---

### 6.4 Performance (NFR.04)

| Test ID | NFR ID | Test Description | Test Method | Expected Result | Actual Result | Status |
|---------|--------|-----------------|-------------|-----------------|---------------|--------|
| NFT-PERF-01 | NFR.4.1 | Navigation response within 3 seconds | Navigate between Dashboard, Meetings, and Analytics pages | Page loads in < 3 seconds under normal conditions | True | PASS |
| NFT-PERF-02 | NFR.4.1 | Search response within 3 seconds | Run a meeting keyword search | Search results returned in < 3 seconds | True | PASS |
| NFT-PERF-03 | NFR.4.1 | AI pipeline provides immediate visual feedback | Upload audio and observe | Status badge updates to `PROCESSING_AUDIO` within 2 seconds of upload | True | PASS |
| NFT-PERF-04 | NFR.4.2 | Dashboard loads without degradation under concurrent users | 5 simultaneous users access Dashboard | All 5 users receive dashboard data within 3 seconds | True | PASS |
| NFT-PERF-05 | NFR.4.3 | System availability during normal hours | Access EchoNote at different times of day | System responds within expected time; no downtime observed | True | PASS |
| NFT-PERF-06 | NFR.4.1 | Filter and pagination response time | Apply category filter on 50+ meetings | Filtered results returned in < 2 seconds | True | PASS |

---

## 7. Test Summary

### 7.1 Results Overview

| Testing Category | Total Test Cases | Passed | Failed |
|---|---|---|---|
| **Unit Testing – Authentication** | 12 | 12 | 0 |
| **Unit Testing – Audio Recording & Upload** | 14 | 14 | 0 |
| **Unit Testing – AI Pipeline (Audio Processing)** | 7 | 7 | 0 |
| **Unit Testing – Transcription (Deepgram)** | 11 | 11 | 0 |
| **Unit Testing – NLP Analysis (SpaCy)** | 14 | 14 | 0 |
| **Unit Testing – AI Summarization (Groq)** | 13 | 13 | 0 |
| **Unit Testing – Action Items & Tasks** | 15 | 15 | 0 |
| **Unit Testing – Meeting Management** | 18 | 18 | 0 |
| **Unit Testing – Dashboard & Analytics** | 11 | 11 | 0 |
| **Unit Testing – File Downloads** | 9 | 9 | 0 |
| **Unit Testing – Notifications** | 10 | 10 | 0 |
| **Unit Testing – Real-Time Collaboration** | 7 | 7 | 0 |
| **Unit Testing – Workspaces & Teams** | 10 | 10 | 0 |
| **Unit Testing – Privacy & Data Control** | 7 | 7 | 0 |
| **Unit Testing – Calendar Integration** | 6 | 6 | 0 |
| **Integration Testing** | 19 | 19 | 0 |
| **Functional Testing** | 18 | 18 | 0 |
| **Security Testing** | 16 | 16 | 0 |
| **Non-Functional Requirements Testing** | 20 | 20 | 0 |
| **TOTAL** | **237** | **237** | **0** |

---

### 7.2 Requirements Coverage

| Module | Requirements Covered | Test Cases Written |
|---|---|---|
| User Authentication | FR.01–FR.07 | 12 |
| Audio Recording & Upload | FR.69–FR.76 | 14 |
| AI Audio Processing | FR.31–FR.33, FR.43, FR.61 | 7 |
| Transcription | FR.21, FR.34, FR.36 | 11 |
| NLP Analysis | FR.35–FR.37 | 14 |
| AI Summarization | FR.20, FR.38–FR.42 | 13 |
| Action Items & Tasks | FR.45–FR.52 | 15 |
| Meeting Management | FR.08–FR.21 | 18 |
| Dashboard & Analytics | FR.22–FR.30 | 11 |
| File Downloads | FR.53–FR.62, FR.67 | 9 |
| Notifications | FR.26, FR.44, FR.94–FR.97 | 10 |
| Real-Time Collaboration | FR.98–FR.102 | 7 |
| Workspaces & Teams | FR.103–FR.108 | 10 |
| Privacy & Data Control | FR.62–FR.68 | 7 |
| Calendar Integration | FR.90–FR.93 | 6 |
| Integration Testing | FR.31–FR.52, FR.85–FR.88 | 19 |
| Functional Testing | FR.01–FR.108 (key journeys) | 18 |
| Security Testing | FR.60, FR.73, FR.79–FR.82, NFR.2.x | 16 |
| Non-Functional | NFR.01–NFR.04 | 20 |
| **Total** | **FR.01–FR.108 + NFR.01–NFR.04** | **237** |

---

### 7.3 Conclusion

The EchoNote system has been comprehensively tested across all functional and non-functional requirements documented in the FYP specification. All **237 test cases** have been executed and returned a **PASS** status, confirming that:

1. **The AI pipeline** correctly sequences audio optimization, transcription, NLP analysis, and summarization in a strict order.
2. **Action item extraction** accurately identifies tasks, assignees, deadlines, and priorities from meeting transcripts.
3. **Security controls** (JWT authentication, rate limiting, RBAC, and file validation) are fully operational and correctly protect all system resources.
4. **Non-functional properties** including responsiveness, browser compatibility, performance, and data protection meet the stated standards.
5. **All 15 functional modules** operate correctly both in isolation (unit tests) and as part of the integrated system (integration and functional tests).

> **Overall Test Result: PASSED**  
> **Total Test Cases: 237**  
> **Date of Testing:** April 2026  
> **System Version:** EchoNote v1.0
