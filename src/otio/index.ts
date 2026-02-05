/**
 * OTIO Module - Public API
 *
 * This module provides the OpenTimelineIO-based timeline model
 * for Dream Cloud Studio.
 */

// Types
export type {
  RationalTime,
  TimeRange,
  MediaReference,
  ExternalReference,
  MissingReference,
  GeneratorReference,
  OTIOClip,
  OTIOGap,
  OTIOTransition,
  OTIOTrack,
  OTIOStack,
  OTIOTimeline,
  OTIOMarker,
  TrackItem,
  TrackKind,
  MarkerColor,
  TimelineSettings,
  TimelineEditOp,
  InsertClipOp,
  TrimClipOp,
  MoveClipOp,
  SplitClipOp,
  DeleteClipOp,
  SetClipPropertyOp,
  AddTrackOp,
  RemoveTrackOp,
  AddMarkerOp,
  RemoveMarkerOp,
  EditResult,
  OTIOProject,
  AssetMetadata,
} from './types'

export { DEFAULT_TIMELINE_SETTINGS } from './types'

// RationalTime utilities
export * as RT from './rational-time'
export {
  fromFrames,
  fromSeconds,
  toSeconds,
  toFrames,
  toTimecode,
  toMLTTimecode,
  fromTimecode,
  toHumanDuration,
  rangeFromSeconds,
  rangeFromStartEnd,
  rangeEndTime,
  rangeDurationSeconds,
  isTimeInRange,
  rangesOverlap,
  rangeContains,
  DEFAULT_RATE,
} from './rational-time'

// Timeline creation and manipulation
export {
  createTimeline,
  createTrack,
  createClip,
  createGap,
  createExternalRef,
} from './timeline'

// Timeline queries
export {
  getSettings,
  getFrameRate,
  getTracks,
  getTrack,
  getTrackByIndex,
  findClip,
  getAllClips,
  getItemStartTime,
  getClipPosition,
  getTrackDuration,
  getTimelineDuration,
  findClipAtTime,
} from './timeline'

// Edit operations
export {
  insertClip,
  appendClip,
  trimClip,
  moveClip,
  splitClip,
  deleteClip,
  addTrack,
  removeTrack,
  addMarker,
  removeMarker,
  setClipProperty,
} from './timeline'

// Validation
export {
  hasOverlaps,
  validateTimeline,
} from './timeline'

// Serialization
export {
  serializeProject,
  deserializeProject,
  toJSON,
  fromJSON,
  toOTIOFormat,
  exportOTIO,
  extractAssetRefs,
  collectAssetMetadata,
  validateJSON,
} from './serialization'

// Migration from legacy format
export {
  migrateFromLegacy,
  toLegacyFormat,
  applyLegacyChange,
} from './migration'
