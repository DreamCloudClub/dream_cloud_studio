/**
 * MLT Module - Public API
 *
 * This module provides MLT (Multimedia Framework) integration
 * for rendering OTIO timelines to video.
 */

// Types
export type {
  MLTProfile,
  RenderPreset,
  RenderOptions,
  RenderProgress,
  RenderStatus,
  RenderJob,
  MeltCheckResult,
  MLTServiceConfig,
} from './types'

export {
  DEFAULT_MLT_PROFILE,
  PREVIEW_MLT_PROFILE,
  RENDER_PRESETS,
} from './types'

// XML Generation
export {
  generateMLTXML,
  generateMLTXMLForRange,
  validateMLTXML,
} from './xml-generator'

// Render Service
export {
  checkMeltAvailability,
  getMeltVersion,
  renderTimeline,
  renderPreview,
  renderExport,
  getJob,
  getActiveJobs,
  cancelJob,
  handleProgressUpdate,
  generateOutputPath,
  getTempDir,
  cleanupTempFiles,
  runMeltRaw,
  validateMLTWithMelt,
} from './render-service'
