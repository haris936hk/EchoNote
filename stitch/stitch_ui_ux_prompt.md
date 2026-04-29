# EchoNote — Complete Application UI Design

---

## ROLE

You are a world-class Principal Product Designer specializing in premium AI-powered SaaS tools. Your design work carries the caliber of products like Linear, Vercel, Raycast, and Arc Browser — interfaces that feel instantly premium, information-dense, and purposeful. Every pixel must earn its place.

---

## THE PRODUCT

**EchoNote** is an AI-powered meeting intelligence platform. It solves the problem that 90% of meeting content is forgotten within a week.

### What It Does
1. **Captures** up to 10 minutes of meeting audio (live recording or file upload)
2. **Transcribes** speech to text via OpenAI Whisper ASR (88%+ accuracy)
3. **Analyzes** the transcript with SpaCy NLP (entities, key phrases, sentiment, topics)
4. **Summarizes** with a custom fine-tuned Qwen2.5-7B AI model producing:
   - Executive Summary
   - Key Decisions
   - Action Items (with assignee, deadline, priority)
   - Next Steps
   - Key Topics
   - Sentiment (positive / neutral / negative / mixed)
5. **Notifies** the user via email when summary is ready

### The AI Pipeline (Sequential)
```
Audio Capture (10-min max)
  → Audio Optimization (16kHz mono PCM) — ~5-10s  
    → Transcription (Whisper) — ~60s
      → NLP Processing (SpaCy) — ~2s
        → Summarization (Qwen2.5-7B) — ~5s
          → Email Notification

Total: ~70-80 seconds per meeting
```

### Target Users
Professionals, managers, and teams who attend multiple meetings daily and need structured, reliable notes without manual effort.

### Authentication
Google OAuth 2.0 only. No email/password system exists.

### Meeting Statuses (Pipeline Stages)
`UPLOADING` → `PROCESSING_AUDIO` → `TRANSCRIBING` → `PROCESSING_NLP` → `SUMMARIZING` → `COMPLETED` | `FAILED`

### Meeting Categories
`SALES` | `PLANNING` | `STANDUP` | `ONE_ON_ONE` | `OTHER`

---

## DESIGN BRIEF

Design a **complete, high-fidelity UI** for EchoNote across 8 pages. The aesthetic should be **OLED dark mode** as the primary theme with support for light mode. The design must feel refined, intelligent, and data-dense — a productivity tool, not a consumer toy.

### Aesthetic Direction
- **Tone**: Refined minimalism with intelligent depth. Think "Linear meets Vercel."
- **Differentiator**: AI intelligence is made tangible — every AI-generated element has a subtle visual signature (a small sparkle icon or faint indigo glow) that creates a consistent "AI produced this" language.
- **Personality**: Confident, calm, precise. Zero frivolity.

---

## DESIGN SYSTEM

### Color Palette

**Dark Mode (Primary)**:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#020617` | Page background — deep near-black |
| `bg-surface` | `#0F172A` | Cards, panels, containers |
| `bg-surface-hover` | `#1E293B` | Hovered surfaces |
| `bg-elevated` | `#1E293B` | Modals, dropdowns, popovers |
| `accent-primary` | `#818CF8` | Primary actions, active links (Indigo 400) |
| `accent-secondary` | `#A78BFA` | AI-specific elements (Violet 400) |
| `accent-glow` | `rgba(129,140,248,0.12)` | Subtle AI aura / glow behind active elements |
| `cta-color` | `#22C55E` | Primary CTA buttons — green stands out on dark (Green 500) |
| `text-primary` | `#F8FAFC` | Headings, primary content |
| `text-secondary` | `#94A3B8` | Body text, descriptions (Slate 400) |
| `text-muted` | `#64748B` | Timestamps, metadata, labels (Slate 500) |
| `border-default` | `rgba(255,255,255,0.06)` | Card and panel borders |
| `border-subtle` | `rgba(255,255,255,0.03)` | Inner dividers, separators |
| `status-success` | `#34D399` | Completed |
| `status-warning` | `#FBBF24` | Processing / pending |
| `status-danger` | `#F87171` | Failed / errors |
| `status-info` | `#60A5FA` | Informational |

**Light Mode (Secondary)**:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#FAFAFA` | Page background |
| `bg-surface` | `#FFFFFF` | Cards, panels |
| `bg-surface-hover` | `#F5F5F5` | Hovered surfaces |
| `accent-primary` | `#6366F1` | Primary actions (Indigo 500) |
| `cta-color` | `#16A34A` | CTA buttons (Green 600) |
| `text-primary` | `#0F172A` | Headings (Slate 900) |
| `text-secondary` | `#475569` | Body text (Slate 600) |
| `text-muted` | `#64748B` | Metadata (Slate 500) |
| `border-default` | `rgba(0,0,0,0.08)` | Borders |

**Semantic Colors (Sentiment)**:

| Sentiment | Color |
|-----------|-------|
| Positive | `#34D399` (Green) |
| Neutral | `#818CF8` (Indigo) |
| Negative | `#F87171` (Red) |
| Mixed | `#FBBF24` (Amber) |

### Typography

| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| Display (hero headings) | **Plus Jakarta Sans** | 800 (ExtraBold) | 48-64px | -0.025em |
| H1 (page titles) | **Plus Jakarta Sans** | 700 (Bold) | 28-32px | -0.02em |
| H2 (section titles) | **Plus Jakarta Sans** | 600 (SemiBold) | 20-24px | -0.01em |
| H3 (card titles) | **Plus Jakarta Sans** | 600 | 16-18px | 0 |
| Body | **Plus Jakarta Sans** | 400 (Regular) | 14-15px | 0 |
| Body Small | **Plus Jakarta Sans** | 400 | 13px | 0 |
| Caption / Meta | **Plus Jakarta Sans** | 500 (Medium) | 12px | 0.01em |
| Monospace (timecodes, code) | **JetBrains Mono** | 400 | 13-14px | 0.02em |

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Spacing & Radii

| Token | Value |
|-------|-------|
| Page padding | 24-32px horizontal |
| Section gap | 48-64px vertical |
| Card gap | 16-20px |
| Card internal padding | 20-24px |
| Card radius | 16px |
| Button radius | 10px |
| Input radius | 10px |
| Chip/tag radius | 999px (pill) |
| Max content width | 1200px |

### Core Components

**Glass Card**: `bg-surface` + `border-default` + `backdrop-filter: blur(12px)` on elevated surfaces. Refined, not heavy — use 10-15% opacity for glass overlays.

**Buttons**:
- **Primary CTA**: Solid `cta-color` (#22C55E) fill, white text, subtle inner shadow
- **Secondary**: Solid `accent-primary` fill, white text
- **Ghost**: Transparent bg, `accent-primary` text, border appears on hover
- **Danger**: Solid `status-danger` fill
- All: `border-radius: 10px`, `transition: all 150ms ease`, luminosity increase on hover (no scale transforms)

**Status Chips**: Pill shape, tinted background + colored text matching status semantic colors.

**AI Indicator**: A tiny gradient dot (indigo→violet, 6px) that subtly pulses next to any AI-generated content element. Consistent across all pages.

**Skeleton Loaders**: Shimmer effect — sweeping linear gradient animation across `bg-surface-hover` placeholder shapes matching content layout.

**Effects**: Minimal text glow (`text-shadow: 0 0 10px`) on key accent elements. Dark-to-light transitions. High readability focus. Visible focus rings for accessibility.

---

## PAGES TO DESIGN

Design **high-fidelity screens at 1440×900** (desktop). For each page, include relevant states (empty, loaded, hover, active, error).

---

### PAGE 1: HomePage (Landing Page) — Route: `/`
**Purpose**: Convert unauthenticated visitors. Public marketing page.

**Layout & Sections**:

**Navigation Bar** (shared component):
- Fixed top, full-width
- Left: EchoNote logo (mic SVG icon + "EchoNote" wordmark in Plus Jakarta Sans 700)
- Center: Nav links — `Features` · `How It Works` · `Benefits`
- Right: "Get Started" CTA button (solid `cta-color`)
- Glass background: `bg-surface/80` + `backdrop-filter: blur(12px)` + thin bottom `border-subtle`

**Hero Section** (full viewport height):
- Deep `bg-base` background with a single, subtle ambient gradient mesh positioned top-right (indigo/violet, very low opacity ~8%)
- Display heading: **"Your meetings, perfectly remembered."** — `Plus Jakarta Sans` 800, 56px. Apply text-gradient (indigo→violet) only on the word "perfectly"
- Subheading (1 line, 18px, `text-secondary`): "Record. Transcribe. Summarize. Powered by a custom AI model."
- Single CTA: "Get Started Free →" (solid `cta-color`, large)
- Below: A stylized product screenshot of the Meeting Detail page (split-view showing transcript + summary) rendered inside a minimal browser chrome mockup with soft shadow and 2° perspective tilt

**Stats Strip** (between hero and features):
- Thin horizontal bar, inline layout, no card borders
- 3 stats separated by `·` dots: `88%+ Summary Accuracy` · `10 min Max Recording` · `~70s Processing`
- Monospace numbers (`JetBrains Mono`), rest in `text-muted`

**Features Section** (id="features"):
- Section heading: "Built for meeting intelligence" (H2 centered)
- 6 features in a 3×2 grid (desktop), 1-column (mobile)
- Each: Lucide SVG icon (20px, `accent-primary`) + H3 title + 1-line description (`text-secondary`)
  1. **Whisper Transcription** — 88%+ accuracy speech-to-text
  2. **NLP Entity Extraction** — People, topics, actions identified automatically
  3. **Custom AI Summaries** — Fine-tuned model structures your meeting notes
  4. **Action Item Detection** — Tasks with assignees, deadlines, priority levels
  5. **Sentiment Analysis** — Meeting tone detected automatically
  6. **Email Notifications** — Summary delivered to your inbox when ready

**How It Works** (id="how-it-works"):
- 3 steps connected by a thin horizontal line with step number badges
- Step 1: Record (mic icon) → Step 2: AI Processes (sparkle icon) → Step 3: Get Insights (document icon)
- Each: Circle number + icon + title + 1-line description

**Final CTA Card**:
- Centered card with animated gradient border (1px, indigo→violet, slow rotation)
- "Ready to transform your meetings?" (H2)
- CTA button + "No credit card required • Free to start" caption

**Footer**:
- 4-column grid: Brand info | Product links | Company links | Support links
- Bottom bar: `© 2025 EchoNote. Made by Riphah Students`

---

### PAGE 2: LoginPage — Route: `/login`
**Purpose**: Authenticate users. Google OAuth is the ONLY method.

**Layout**:
- Full viewport centered layout
- `bg-base` background with a single large, soft radial gradient blob (indigo, positioned bottom-left, ~15% opacity)
- Centered glass card (max-width 420px):
  - EchoNote logo (mic icon + wordmark) — top center
  - H2: "Sign in to EchoNote"
  - Subtitle: "Your meeting intelligence awaits" (`text-secondary`)
  - **"Continue with Google" button** — white background, Google "G" logo (official SVG), dark text. This is the ONLY interactive element. Make it feel confident and primary.
  - Caption: "By continuing, you agree to our Terms and Privacy Policy" (`text-muted`)
  - Privacy badge: Lock icon + "Secured with Google OAuth" (`text-muted`)

**Constraint**: No email/password fields exist. The single Google button must feel complete, not like something is missing.

---

### PAGE 3: DashboardPage — Route: `/dashboard`
**Purpose**: Mission control. Overview of meetings + quick access to recording.

**Components**:

**Page Header**:
- H1: "Dashboard"
- Subtitle: "Good morning, [User Name]" or time-appropriate greeting (`text-secondary`)
- Right-aligned: "New Recording" CTA button (solid `cta-color`, mic icon)

**Stats Strip**:
- Single container (card), horizontal layout with thin internal dividers
- 4 data points inline: `Total Meetings` | `Processing` | `Completed` | `Total Duration`
- Each: Large bold number + small label below

**Processing Alert** (conditional — visible when meetings are being processed):
- Slim inline banner: animated indigo dot + "2 meetings are being processed…"
- Compact, not a separate card — part of the flow

**Failed Alert** (conditional — visible when meetings have failed):
- Danger-tinted banner: danger icon + "{N} meetings failed to process"

**Search & Filter Bar** (inline, not in a separate container):
- Full-width search input with search icon
- Horizontal category filter chips: `All` · `Sales` · `Planning` · `Standup` · `One-on-One` · `Other` — with count badges

**Meeting Cards Grid** (3 columns desktop, 2 tablet, 1 mobile):
- Each card (`bg-surface`, `border-default`, `radius: 16px`):
  - Top row: Category chip (left) + Status indicator dot (right: green=completed, amber-animated=processing, red=failed)
  - Title (H3, truncate 2 lines max)
  - Date + Duration metadata (`text-muted`, small)
  - If completed: 2-3 AI-extracted topic chips (indigo tinted pills)
  - Left border accent: Subtle color based on sentiment (green/indigo/red/amber)
  - Hover: Shadow deepens + border shifts to `accent-primary` at 20% opacity, `transition: 150ms`
- Pagination below grid

**Empty State** (when no meetings):
- Centered: Large mic icon in a circular container
- H2: "No meetings yet"
- Body: "Record your first meeting and let AI handle the rest."
- CTA: "Record Your First Meeting" (solid `cta-color`)
- Below: 3 inline feature hints: "10 min recordings" · "AI summaries" · "Email alerts"

**Quick Actions Sidebar** (right column, 1/5 width on desktop):
- Card with actions: New Recording, View All Meetings, Settings
- Each as a text button with icon

---

### PAGE 4: RecordPage — Route: `/record` (The Capture Room)
**Purpose**: Record audio or upload a file. Multi-step wizard: Record → Details → Uploading → Success.

**Overall Layout**: Full viewport, true immersive experience. Deeper background than normal pages — pure `#020617`. Minimal chrome.

**Step 1: Idle (Ready to Record)**:
- Centered vertically + horizontally
- **Recording Halo**: 128px circular ring with gradient stroke (indigo→violet), centered. Mic icon (32px) inside.
- Below halo: "Ready to record" (text-muted)
- Timer: `00:00` — `JetBrains Mono`, 48px, `text-primary`
- Two buttons side by side:
  - "Start Recording" (solid `cta-color`, mic icon)
  - "Upload File" (ghost, upload icon)
- Tips area: Minimal text — "Up to 10 minutes · MP3, WAV, M4A, WEBM, OGG · 50MB max"
- Hidden file input triggered by Upload button (accepts: .mp3, .wav, .m4a, .webm, .ogg)

**Step 1: Recording Active**:
- Halo **pulses**: scale oscillation 1.0→1.05→1.0 with indigo glow shadow behind it (CSS animation, 2s cycle ease-in-out)
- Audio visualizer: Clean minimal bar waveform below the halo (CSS bars reflecting real-time audio level, not a canvas/WebGL visualization)
- Timer counting up: `03:47` (large mono) + "6:13 remaining" (small, `text-muted`)
- Thin progress bar (full container width) — shows progress toward 10:00 limit
- Controls: "Pause" button (warning color) + "Stop" button (danger color)
- As time approaches 10:00, halo gradient shifts from indigo→violet to amber→red

**Step 1: Paused**:
- Halo stops pulsing, static amber border
- "Recording paused" label
- "Resume" (success) + "Stop" (danger) buttons

**Step 1: Recording/Upload Complete (Pre-Submit)**:
- Success card: green accent, checkmark icon, file details (duration, size)
- Embedded audio player for playback
- "Re-record" / "Choose Different File" (ghost) + "Continue" (primary) buttons

**Step 2: Meeting Details Form**:
- Smooth transition from recording view
- Form fields:
  - Title input (required, placeholder: "e.g., Q1 Planning Session")
  - Description textarea (optional)
  - Category dropdown: Sales, Planning, Standup, One-on-One, Other
- Audio preview below form
- Actions: "← Back" (ghost) + "Upload & Process" (solid `cta-color`)
- Error display area for validation/upload errors

**Step 3: Uploading**:
- Centered spinner (clean circular, indigo) — NOT a bouncing icon
- "Uploading your meeting…" + "This may take a few moments" (`text-secondary`)
- Indeterminate progress bar

**Step 4: Success**:
- Green checkmark with subtle success glow
- "Meeting uploaded successfully!"
- "Your meeting is now being processed. We'll email you when it's ready."
- Auto-redirects to Meeting Detail page after 2 seconds

---

### PAGE 5: MeetingsPage — Route: `/meetings`
**Purpose**: Full directory of all meetings. Browse, search, filter.

**Page Header**:
- H1: "Meetings" + count badge (`text-muted`): "(23)"
- Right: "Export All" (ghost button) + "New Recording" (solid `cta-color`)

**Filter Toolbar** (single inline strip, seamless):
- Left: Search input (search icon + "Search meetings…" placeholder)
- Center: Status filter tabs — `All` | `Completed` | `Processing` | `Failed` — underlined active style, each with count badge
- Right: Category dropdown + "Clear filters" text link (only visible when filters are active)

**Meeting Cards Grid**:
- Same card component as Dashboard
- 12 per page, pagination at bottom
- Sorted by newest first

**Bulk Actions Bar** (conditional):
- When checkboxes select meetings: sticky bottom bar — "X selected" + "Cancel" + "Delete Selected" (danger)

**Empty State**:
- If filters return nothing: "No meetings match your filters" + "Clear filters" button
- If no meetings at all: Same empty state as Dashboard

---

### PAGE 6: MeetingDetailPage — Route: `/meeting/:id` (The Insight Hub)
**Purpose**: The most important page. Display transcript + AI summary for a completed meeting.

**Header Section**:
-  "← Back to Dashboard" navigation link
- Meeting title (H1)
- Metadata row: Category chip · Date chip · Duration chip · Status chip
- Actions: "Download Audio" (ghost) + kebab menu (Edit, Download All ZIP, Delete)

**Processing State** (when meeting is still being processed):
- Full-width pipeline step indicator:
  ```
  ● Upload  →  ● Audio Processing  →  ○ Transcribing  →  ○ NLP  →  ○ Summarizing
  ```
  - Completed steps: green checkmark
  - Active step: indigo glow pulse animation
  - Pending steps: muted dots
- "Estimated ~45 seconds remaining" (`text-muted`)
- Auto-polls every 5 seconds for status updates

**Failed State** (when processing failed):
- Danger banner: alert icon + "Processing Failed" + error message
- "Retry Processing" button (danger variant)

**Completed State — Split View Layout**:
Two-column layout: **60% transcript (left)** + **40% AI insights (right, sticky on desktop)**. Stacks vertically on mobile.

**Left Column — Transcript**:
- Header: "Transcript" label + word count chip + "Copy" icon button
- Clean text block: `Plus Jakarta Sans` 14px, line-height 1.7
- AI-highlighted elements: Entity names and action phrases get subtle `accent-glow` background highlight

**Right Column — AI Insights** (sticky sidebar):
Each widget is a distinct card within the column:

1. **Executive Summary**:
   - AI sparkle icon + "Executive Summary" label
   - 2-3 sentence summary text in elevated mini-card

2. **Key Decisions**:
   - Icon + "Key Decisions" label
   - Blockquote-style with `accent-primary` left-border

3. **Action Items**:
   - Icon + "Action Items" label + count badge
   - List with each item: visual checkbox + task text + assignee chip + deadline text + priority badge (high=red, medium=amber, low=green)
   - Subtle row dividers between items

4. **Next Steps**:
   - Icon + label + text block

5. **Key Topics**:
   - Horizontal wrapping topic chips (indigo-tinted pills)

6. **Sentiment**:
   - Colored dot + text label: "Positive" / "Neutral" / "Negative" / "Mixed" — no emojis

**Audio Player** (when audio URL exists, completed meetings):
- Slim inline player: play/pause button + progress scrubber + duration display
- Placed below the header or at the top of the transcript column

---

### PAGE 7: SettingsPage — Route: `/settings`
**Purpose**: Manage account, preferences, privacy, and get help.

**Layout**: Left sidebar (200px, sticky) + right content area. NOT tabs inside a card.

**Left Sidebar**:
- User avatar (64px, from Google picture, circular) + name + email (`text-muted`)
- Navigation links (vertical, icon + label):
  - Profile
  - Preferences
  - Privacy & Data
  - Help & FAQ

**Profile Section**:
- Large avatar (80px)
- Name field (editable)
- Email (read-only, muted)
- "Authenticated via Google" badge (lock icon + text)

**Preferences Section**:
- Toggle switches (proper switch design, not custom HTML):
  - Dark Mode (on/off)
  - Email Notifications — "Receive email when meeting processing is complete" (on/off)
  - Auto-delete Recordings — when enabled, reveals retention period dropdown (7 days / 30 days / 90 days / 6 months / 1 year)
- "Save Preferences" button

**Privacy & Data Section**:
- Data Storage card with real stats: Total Meetings | Completed | Storage Used | Total Duration
- Data Processing transparency: Bullet list of AI models used — Whisper ASR, SpaCy NLP, Custom Qwen2.5-7B
- Privacy notice card (accent-tinted, shield icon): "We never share your meeting data with third parties."
- Export Data button (ghost, download icon)
- Logout button (ghost)
- Danger zone (visually separated): "Delete Account" button (danger variant) with confirmation copy

**Help & FAQ Section**:
- FAQ accordion (5 items, Lucide chevron for expand/collapse, NO emojis):
  - "How long can my recordings be?" — Up to 10 minutes
  - "How accurate is the transcription?" — 90%+ for clear English
  - "Can I edit transcripts?" — Read-only currently
  - "How is my data secured?" — Encrypted in transit and at rest
  - "Can I delete my meetings?" — Yes, anytime from dashboard or settings
- Quick links (SVG icons, not emojis): Documentation, Contact Support, Report Bug, Request Feature
- Contact card: "Still need help?" + "Contact Support" button

---

### PAGE 8: NotFoundPage — Route: `*` (404)
**Purpose**: Graceful error for invalid routes.

**Layout**:
- Full viewport centered
- "404" in display font (`Plus Jakarta Sans` 800, 120px), `text-muted` — understated
- H2: "Page not found"
- Body: "The page you're looking for doesn't exist or has been moved."
- Two buttons: "Go to Dashboard" (solid `cta-color`) + "Go Back" (ghost)
- Optional: Small abstract geometric scatter illustration suggesting fragmentation

---

## SHARED NAVIGATION (MainLayout)

All authenticated pages (Dashboard, Record, Meetings, MeetingDetail, Settings) share a top navigation bar.

**Top Navbar**:
- Fixed top, full width, 64px height
- Glass: `bg-surface/80` + `backdrop-filter: blur(12px)` + thin bottom `border-subtle`
- Left: EchoNote logo (mic icon + wordmark)
- Center: Nav links — Dashboard · Record · Meetings (text links, underline on active page)
- Right: User avatar (round, 32px, from Google OAuth) → click reveals dropdown: Settings, Logout
- On mobile: Hamburger menu

---

## INTERACTION DESIGN

| Element | Hover State | Timing |
|---------|-------------|--------|
| Cards | Shadow deepens + border becomes `accent-primary/20` | `150ms ease` |
| Buttons | Background lightens ~10% | `150ms ease` |
| Nav links | Underline appears | `150ms ease` |
| Recording halo | Pulsing glow: scale(1.0→1.05→1.0) + box-shadow oscillation | `2s ease-in-out infinite` |
| Pipeline steps | Active step has indigo glow pulse | `1.5s ease-in-out infinite` |
| Toast notifications | Slide in from top-right, auto-dismiss 5s | `200ms ease-out` |
| Skeleton loaders | Sweeping gradient shimmer | `1.5s linear infinite` |
| Page transitions | Simple fade-in | `200ms ease-out` |

**Never**: Change border-width, padding, or margin on hover. Use only opacity, box-shadow, and transform.

---

## CONSTRAINTS

1. **Dark Mode Primary** — Design dark mode first. All elements must have 4.5:1 minimum text contrast.
2. **No Emojis as UI Elements** — Use Lucide or Heroicons SVGs exclusively. Never use ❤️ 📚 💬 🐛 💡 ✅ ❌ as interface elements.
3. **No Layout Shift on Hover** — Only use opacity, box-shadow, and transform for hover states.
4. **Responsive** — All pages support: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
5. **No Background Parallax** — No moving/animated background blobs. Use static, subtle gradient meshes only.
6. **Professional Radii** — Cards: 16px. Buttons/inputs: 10px. Chips: 999px. No rounded-full on cards.
7. **Information Dense** — This is a productivity tool. Users need meaningful data above the fold.
8. **Google OAuth Only** — Never design email/password fields.
9. **10-Minute Limit** — Always surfaced in recording UI (timer, progress bar, tips).
10. **Consistent AI Language** — Every AI-produced element gets the same visual treatment: sparkle icon and/or indigo left-border accent.
11. **No font-display: block** — Always use `font-display: swap` to prevent FOIT.
12. **Skeleton loading** — Use skeleton screens matching content shape for any async operation >300ms.
13. **prefers-reduced-motion** — Respect reduced motion preference; disable all animations when set.

---

## QUALITY BENCHMARK

The final designs should look like they belong in the same product galaxy as **Linear** (information density, dark mode mastery), **Vercel Dashboard** (typography, spatial depth), and **Raycast** (purposeful motion, premium feel). If someone screenshots any page, it should be immediately obvious this is a high-end AI SaaS product designed by professionals.
