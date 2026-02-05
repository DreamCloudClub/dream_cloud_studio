# OTIO + MLT Timeline Architecture Design Document
## Dream Cloud Studio - Creator-Grade Timeline Editor

**Version:** 1.0
**Date:** 2026-02-04
**Status:** Implementation-Ready

---

## A) DESIGN OVERVIEW

### Goals
- Replace Remotion-based timeline with OTIO (OpenTimelineIO) as canonical project model
- Use MLT framework for reliable playback and export (Kdenlive ecosystem)
- Enable AI-driven timeline editing through structured OTIO mutations
- Deliver creator-grade timeline UX: multitrack, scrubbing, trim, export

### Core Principles
1. **OTIO is Truth** - Timeline state lives in OTIO objects, not React state or database
2. **UI is View-Only** - React reads OTIO, dispatches edit intents, never mutates directly
3. **MLT is the Engine** - All rendering/playback through melt CLI or libmlt
4. **AI Edits OTIO** - AI generates edit operations that mutate OTIO, never "drives UI"
5. **Deterministic Operations** - All edits are pure functions on immutable OTIO snapshots

### Key Decisions (Non-Negotiable)
- Timebase: 30 fps (frame-accurate), times stored as RationalTime
- Default resolution: 1920x1080 (matching current Remotion config)
- V1 scope: cuts-only (no effects, no transitions, no keyframes)
- Linux-first (melt via CLI), macOS support deferred

---

## B) CURRENT STATE FINDINGS

### Timeline Representation
- **Location:** `src/types/timeline.ts`, `src/services/timeline.ts`
- **Model:** `TimelineClip` interface with seconds-based timing
- **Storage:** Supabase `timeline_clips` table (cloud-first)
- **Tracks:** String IDs ("video-1", "audio-1", "video-main" legacy)

### Current Data Model
```typescript
interface TimelineClip {
  id: string
  projectId: string
  assetId: string
  trackId: string
  startTime: number     // seconds
  duration: number      // seconds
  inPoint: number       // source offset in seconds
  transform?: ClipTransform
  animation?: ClipAnimation
  volume?: number
  transitionIn/Out?: TransitionType
  embeddedAsset?: EmbeddedAsset  // snapshot of asset data
}
```

### Playback Implementation
- **Preview:** HTML5 `<video>` element (`VideoPreviewPanel.tsx`)
- **Scrubbing:** Custom playhead drag with requestAnimationFrame
- **Thumbnails:** Rust FFmpeg decoder (`video_decoder.rs`)
- **Export:** Remotion CLI (`remotion render`)

### State Management
- **Store:** Zustand (`workspaceStore.ts` - 1360 lines)
- **Pattern:** Optimistic UI updates + Supabase sync
- **Edit Ops:** `addClip`, `moveClip`, `trimClip`, `splitClip`, `deleteClip`

### UI Stack
- **Framework:** React 18.2 + TypeScript
- **Components:** `TimelinePanel.tsx`, `TimelineTrack.tsx`, `ClipBlock.tsx`
- **Styling:** Tailwind CSS + Radix UI
- **Layout:** react-resizable-panels

### Native Runtime
- **Desktop:** Tauri 2 with shell plugin enabled
- **Backend:** Rust with ffmpeg-next for video decoding
- **File Access:** `$HOME/.dreamcloud/**` allowed
- **Commands:** Can invoke shell commands including `melt`

### OS Targets
- **Primary:** Linux (melt readily available via apt)
- **Secondary:** macOS (melt via Homebrew, deferred)
- **Future:** Windows (not in V1 scope)

---

## C) PROPOSED ARCHITECTURE

```
+------------------------------------------------------------------+
|                        DREAM CLOUD STUDIO                         |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------------+     +----------------------------+    |
|  |      React UI          |     |      AI Agent Layer        |    |
|  |  (View + Controller)   |     |   (Timeline Intents)       |    |
|  +------------------------+     +----------------------------+    |
|           |                              |                         |
|           | read                         | edit ops                |
|           v                              v                         |
|  +----------------------------------------------------------+     |
|  |                OTIO TIMELINE MODULE                       |     |
|  |  +-----------------------+  +-------------------------+   |     |
|  |  | OTIOTimeline Class    |  | Edit Operations         |   |     |
|  |  | - tracks: Track[]     |  | - insertClip()          |   |     |
|  |  | - clips: Clip[]       |  | - trimClip()            |   |     |
|  |  | - markers: Marker[]   |  | - moveClip()            |   |     |
|  |  | - metadata            |  | - splitClip()           |   |     |
|  |  +-----------------------+  | - rippleDelete()        |   |     |
|  |                             +-------------------------+   |     |
|  |  +-----------------------+  +-------------------------+   |     |
|  |  | Serialization         |  | Validation              |   |     |
|  |  | - toJSON() / fromJSON |  | - checkOverlaps()       |   |     |
|  |  | - toOTIO() / fromOTIO |  | - validateTimeline()    |   |     |
|  |  +-----------------------+  +-------------------------+   |     |
|  +----------------------------------------------------------+     |
|                              |                                     |
|                              | export                              |
|                              v                                     |
|  +----------------------------------------------------------+     |
|  |                MLT EXPORT MODULE                          |     |
|  |  +-------------------------+  +------------------------+  |     |
|  |  | OTIO -> MLT XML         |  | melt CLI Wrapper       |  |     |
|  |  | - generateMLTXML()      |  | - renderPreview()      |  |     |
|  |  | - trackToMLTPlaylist()  |  | - exportVideo()        |  |     |
|  |  | - clipToMLTProducer()   |  | - getProgress()        |  |     |
|  |  +-------------------------+  +------------------------+  |     |
|  +----------------------------------------------------------+     |
|                              |                                     |
|                              | invoke                              |
|                              v                                     |
|  +----------------------------------------------------------+     |
|  |                TAURI RUST BACKEND                         |     |
|  |  +-------------------------+  +------------------------+  |     |
|  |  | Shell Command Executor  |  | Video Decoder (FFmpeg) |  |     |
|  |  | - run_melt()            |  | - get_frame()          |  |     |
|  |  | - get_process_output()  |  | - generate_thumbs()    |  |     |
|  |  +-------------------------+  +------------------------+  |     |
|  +----------------------------------------------------------+     |
|                                                                    |
+------------------------------------------------------------------+
```

### Module Responsibilities

#### 1. OTIO Timeline Module (`src/otio/`)
- **Purpose:** Canonical timeline data model and edit operations
- **Files:**
  - `types.ts` - OTIO-compatible TypeScript types
  - `timeline.ts` - OTIOTimeline class with edit methods
  - `operations.ts` - Pure edit operation functions
  - `serialization.ts` - JSON/OTIO format conversion
  - `validation.ts` - Timeline integrity checks

#### 2. MLT Export Module (`src/mlt/`)
- **Purpose:** Convert OTIO to MLT XML, invoke melt for render
- **Files:**
  - `xml-generator.ts` - OTIO -> MLT XML conversion
  - `render-service.ts` - melt CLI wrapper with progress tracking
  - `preview-service.ts` - Generate preview frames/proxy video

#### 3. Bridge Layer (`src/services/otio-bridge.ts`)
- **Purpose:** Sync OTIO state with Zustand store and database
- **Responsibilities:**
  - Load legacy timeline_clips into OTIO
  - Persist OTIO to database (new `timeline_otio` column)
  - Emit state changes to UI

#### 4. UI Layer (existing + modifications)
- **VideoPreviewPanel.tsx** - Add MLT-based preview playback
- **TimelinePanel.tsx** - Read from OTIO state, dispatch edit intents
- **workspaceStore.ts** - Add OTIO timeline slice

---

## D) DATA MODEL DETAILS

### OTIO Type Definitions

```typescript
// RationalTime - frame-accurate time representation
interface RationalTime {
  value: number      // frame count or time value
  rate: number       // frames per second (default: 30)
}

// TimeRange - start + duration
interface TimeRange {
  startTime: RationalTime
  duration: RationalTime
}

// MediaReference - points to source media
interface MediaReference {
  id: string
  type: 'external' | 'embedded' | 'missing'
  targetUrl: string         // file:// or https://
  availableRange?: TimeRange
  metadata: Record<string, unknown>
}

// Clip - a piece of media on the timeline
interface OTIOClip {
  id: string
  name: string
  mediaReference: MediaReference
  sourceRange: TimeRange    // portion of source to use
  metadata: Record<string, unknown>
}

// Gap - empty space on a track
interface OTIOGap {
  id: string
  sourceRange: TimeRange
}

// Track - ordered sequence of clips and gaps
interface OTIOTrack {
  id: string
  name: string
  kind: 'video' | 'audio'
  children: (OTIOClip | OTIOGap)[]
  metadata: Record<string, unknown>
}

// Stack - layered tracks (video compositing)
interface OTIOStack {
  id: string
  name: string
  children: OTIOTrack[]
  metadata: Record<string, unknown>
}

// Timeline - top-level container
interface OTIOTimeline {
  id: string
  name: string
  globalStartTime?: RationalTime
  tracks: OTIOStack         // or direct Track[] for simple case
  metadata: Record<string, unknown>
}

// Marker - named point on timeline
interface OTIOMarker {
  id: string
  name: string
  markedRange: TimeRange
  color: string
  metadata: Record<string, unknown>
}
```

### Edit Operations Interface

```typescript
// Deterministic edit operations (pure functions)

interface InsertClipOp {
  type: 'insert_clip'
  trackId: string
  clipId: string
  mediaRef: MediaReference
  insertTime: RationalTime
  sourceRange: TimeRange
}

interface TrimClipOp {
  type: 'trim_clip'
  clipId: string
  edge: 'start' | 'end'
  delta: RationalTime       // positive = extend, negative = shorten
}

interface MoveClipOp {
  type: 'move_clip'
  clipId: string
  targetTrackId: string
  targetTime: RationalTime
}

interface SplitClipOp {
  type: 'split_clip'
  clipId: string
  splitTime: RationalTime   // timeline time where to split
}

interface RippleDeleteOp {
  type: 'ripple_delete'
  clipId: string
}

interface SetClipPropertyOp {
  type: 'set_clip_property'
  clipId: string
  property: string
  value: unknown
}

type TimelineEditOp =
  | InsertClipOp
  | TrimClipOp
  | MoveClipOp
  | SplitClipOp
  | RippleDeleteOp
  | SetClipPropertyOp

// Apply operation to timeline (returns new timeline, immutable)
function applyOp(timeline: OTIOTimeline, op: TimelineEditOp): OTIOTimeline
```

---

## E) RENDERING STRATEGY

### OTIO -> MLT XML Conversion

```xml
<!-- Example MLT XML output -->
<?xml version="1.0" encoding="utf-8"?>
<mlt LC_NUMERIC="C" version="7.0.0" producer="main_bin">

  <!-- Producers (source media) -->
  <producer id="producer0" in="00:00:00.000" out="00:00:10.000">
    <property name="resource">/path/to/video.mp4</property>
    <property name="mlt_service">avformat</property>
  </producer>

  <producer id="producer1" in="00:00:00.000" out="00:00:05.000">
    <property name="resource">/path/to/image.jpg</property>
    <property name="mlt_service">qimage</property>
    <property name="length">150</property> <!-- 5 seconds at 30fps -->
  </producer>

  <!-- Video Track Playlist -->
  <playlist id="video_track_1">
    <entry producer="producer0" in="00:00:02.000" out="00:00:08.000"/>
    <blank length="30"/> <!-- 1 second gap -->
    <entry producer="producer1" in="00:00:00.000" out="00:00:05.000"/>
  </playlist>

  <!-- Audio Track Playlist -->
  <playlist id="audio_track_1">
    <entry producer="producer0" in="00:00:02.000" out="00:00:08.000"/>
  </playlist>

  <!-- Tractor (combines tracks) -->
  <tractor id="main">
    <multitrack>
      <track producer="video_track_1"/>
      <track producer="audio_track_1" hide="video"/>
    </multitrack>
  </tractor>

</mlt>
```

### melt Invocation Strategy

```bash
# Preview render (low quality, fast)
melt project.mlt -consumer avformat:preview.mp4 \
  vcodec=libx264 preset=ultrafast crf=28 \
  acodec=aac ab=128k \
  width=960 height=540 frame_rate_num=30

# Export render (high quality)
melt project.mlt -consumer avformat:export.mp4 \
  vcodec=libx264 preset=slow crf=18 \
  acodec=aac ab=320k \
  width=1920 height=1080 frame_rate_num=30

# Get progress (parse stderr for frame count)
# melt outputs: "Frame: 1234" lines during render
```

### Preview Strategy

1. **Proxy Generation:** On media import, generate 540p proxy with melt
2. **Thumbnail Strip:** Use existing FFmpeg decoder for scrub thumbnails
3. **Playback Preview:**
   - Option A: Pre-render 10-second chunks around playhead
   - Option B: Direct melt SDL consumer for real-time preview (if feasible)
   - V1: Use proxy video + HTML5 player (simple, reliable)

---

## F) AI HOOK-IN POINTS

### AI Intent -> OTIO Edit Flow

```
User: "Cut out the pause at 5 seconds"
         |
         v
+-------------------+
| AI Intent Parser  |  "I should split at 4.5s, delete gap, and join"
+-------------------+
         |
         v (edit operations)
+-------------------+
| [                 |
|   { type: 'split_clip', clipId: 'c1', splitTime: 4.5 },
|   { type: 'ripple_delete', clipId: 'c1-second-half' },
| ]                 |
+-------------------+
         |
         v (apply to OTIO)
+-------------------+
| OTIOTimeline      |  timeline = applyOps(timeline, ops)
| (mutated copy)    |
+-------------------+
         |
         v (UI updates)
+-------------------+
| React UI          |  renders from new OTIO state
+-------------------+
```

### AI-Safe Edit Operations

The AI generates sequences of `TimelineEditOp` objects:
- Operations are validated before applying
- Each operation is reversible (undo support)
- AI never directly manipulates UI state
- Operations logged for debugging/replay

---

## G) RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **A/V Sync Issues** | Medium | High | Use frame-accurate RationalTime; test extensively |
| **melt Not Installed** | Low | High | Check on startup; show install instructions; bundle fallback |
| **Performance (Large Projects)** | Medium | Medium | Lazy-load clips; virtualize timeline UI; limit undo history |
| **Waveform Generation Slow** | Medium | Low | Generate async on import; cache results; show placeholder |
| **Cross-Platform melt** | Medium | Medium | Linux first; defer macOS/Windows; document requirements |
| **OTIO <-> Legacy Migration** | Medium | Medium | One-way migration; keep legacy format as backup |
| **Timeline Mutation Bugs** | Medium | High | Extensive unit tests; snapshot testing; immutable patterns |
| **Concurrent Edit Conflicts** | Low | Medium | Single-writer model; lock timeline during AI edits |
| **License Compliance (MLT/GPL)** | Low | High | CLI invocation only (not linking); review with legal |
| **Memory with Long Videos** | Medium | Medium | Stream media; use proxies; unload off-screen clips |

---

## H) MILESTONES

### Phase 1: OTIO Foundation
**Goal:** Core OTIO data model and edit operations working in isolation

**Acceptance Criteria:**
- [ ] `OTIOTimeline` class can create empty timeline
- [ ] Can insert clips with proper RationalTime calculations
- [ ] Can trim, move, split clips
- [ ] Can serialize to/from JSON
- [ ] Unit tests pass for all edit operations
- [ ] Can import legacy `timeline_clips` format

### Phase 2: MLT Export
**Goal:** Generate valid MLT XML and invoke melt successfully

**Acceptance Criteria:**
- [ ] Generate MLT XML for simple timeline (1 video + 1 audio track)
- [ ] melt can parse generated XML without errors
- [ ] Can export 10-second test video with multiple clips
- [ ] Gaps render as black frames
- [ ] Audio levels are respected

### Phase 3: Render Service
**Goal:** Full render pipeline with progress tracking

**Acceptance Criteria:**
- [ ] Tauri command invokes melt via shell
- [ ] Progress events emitted to frontend
- [ ] Cancel/abort support
- [ ] Error handling with user-friendly messages
- [ ] Preview (540p) and export (1080p) presets

### Phase 4: UI Integration
**Goal:** Timeline UI reads from OTIO, dispatches edits

**Acceptance Criteria:**
- [ ] TimelinePanel renders from OTIO state
- [ ] Clip drag/drop creates OTIO edit ops
- [ ] Trim handles create OTIO trim ops
- [ ] Split at playhead creates OTIO split op
- [ ] Delete key creates OTIO delete op
- [ ] Undo/redo works (operation stack)

### Phase 5: Playback Integration
**Goal:** Preview playback using MLT-rendered proxies

**Acceptance Criteria:**
- [ ] Scrubbing shows correct frame
- [ ] Play/pause controls work
- [ ] Playhead position syncs with video
- [ ] Audio plays correctly
- [ ] No major A/V sync issues

### Phase 6: AI Integration
**Goal:** AI can edit timeline through OTIO operations

**Acceptance Criteria:**
- [ ] AI can receive timeline state as OTIO JSON
- [ ] AI can return edit operations
- [ ] Edit operations apply correctly
- [ ] UI updates reflect AI changes

---

## I) IMPLEMENTATION TASKS

### New Files to Create

```
src/otio/
  index.ts                 # Public API exports
  types.ts                 # OTIO TypeScript type definitions
  rational-time.ts         # RationalTime helper functions
  timeline.ts              # OTIOTimeline class
  operations.ts            # Pure edit operation functions
  serialization.ts         # JSON/OTIO format conversion
  validation.ts            # Timeline integrity checks
  migration.ts             # Legacy format -> OTIO converter

src/mlt/
  index.ts                 # Public API exports
  xml-generator.ts         # OTIO -> MLT XML conversion
  render-service.ts        # melt CLI wrapper
  preview-service.ts       # Preview generation
  types.ts                 # MLT-specific types

src/services/
  otio-bridge.ts           # Sync OTIO with store/database

src-tauri/src/
  melt_runner.rs           # Rust commands for melt invocation
```

### Files to Modify

```
src/state/workspaceStore.ts
  - Add otioTimeline state slice
  - Add OTIO edit action dispatchers
  - Bridge to legacy clip format during transition

src/components/workspace/editor/TimelinePanel.tsx
  - Read from OTIO state
  - Dispatch OTIO edit intents instead of direct mutations

src/components/workspace/editor/VideoPreviewPanel.tsx
  - Add MLT preview playback option
  - Switch between legacy and OTIO modes

src-tauri/src/lib.rs
  - Register melt_runner commands

src-tauri/tauri.conf.json
  - Ensure shell permissions allow melt invocation
```

### Execution Order

1. **Create OTIO types** (`src/otio/types.ts`)
2. **Create RationalTime helpers** (`src/otio/rational-time.ts`)
3. **Create OTIOTimeline class** (`src/otio/timeline.ts`)
4. **Create edit operations** (`src/otio/operations.ts`)
5. **Create serialization** (`src/otio/serialization.ts`)
6. **Create validation** (`src/otio/validation.ts`)
7. **Create migration utility** (`src/otio/migration.ts`)
8. **Create MLT XML generator** (`src/mlt/xml-generator.ts`)
9. **Create Rust melt runner** (`src-tauri/src/melt_runner.rs`)
10. **Create render service** (`src/mlt/render-service.ts`)
11. **Create OTIO bridge** (`src/services/otio-bridge.ts`)
12. **Update workspace store** (`src/state/workspaceStore.ts`)
13. **Update TimelinePanel** (read from OTIO)
14. **Add preview playback** (MLT-based)

---

## J) APPENDIX

### Useful Commands

```bash
# Install MLT on Ubuntu/Debian
sudo apt install melt

# Check melt version
melt --version

# Test melt with simple composition
melt video.mp4 in=0 out=100 -consumer avformat:test.mp4

# Generate MLT XML from command line
melt video.mp4 in=0 out=100 -consumer xml:output.mlt
```

### Reference Links

- [OpenTimelineIO Spec](https://opentimeline.io/)
- [MLT Framework Docs](https://www.mltframework.org/docs/)
- [melt CLI Reference](https://www.mltframework.org/docs/melt/)
- [Kdenlive (MLT-based editor)](https://kdenlive.org/)

### Time Conversion Reference

```typescript
// Seconds to RationalTime (30 fps)
const rt = { value: Math.round(seconds * 30), rate: 30 }

// RationalTime to seconds
const seconds = rt.value / rt.rate

// RationalTime to MLT timecode string
const tc = `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}.${Math.round((s%1)*1000).toString().padStart(3,'0')}`
```
