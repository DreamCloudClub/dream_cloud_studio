// Service exports for Dream Cloud Studio
// Import from '@/services' for cleaner imports

// Auth
export * from './auth'

// Projects and related entities
export * from './projects'

// Assets and file management
export * from './assets'

// Local storage (Tauri file system operations)
export * from './localStorage'

// Platforms
export * from './platforms'

// Scripts (characters and sections)
export {
  getScriptCharacters,
  getScriptCharactersWithAssets,
  getScriptCharacter,
  createScriptCharacter,
  updateScriptCharacter,
  deleteScriptCharacter,
  linkCharacterToAsset,
  getScriptSections,
  getScriptSectionsWithCharacters,
  getScriptSection,
  createScriptSection,
  createScriptSections,
  updateScriptSection,
  deleteScriptSection,
  reorderScriptSections,
  clearScriptSections,
  subscribeToScriptSections,
  subscribeToScriptCharacters,
} from './scripts'

// Seed data (dev tools)
export * from './seedData'

// AI Generation Services
// ElevenLabs - Voice synthesis and sound effects
export {
  generateVoice as generateVoiceElevenLabs,
  streamVoice,
  generateSoundEffect,
  getVoices,
  getUserInfo as getElevenLabsUserInfo,
  cloneVoice,
  DEFAULT_VOICES,
  estimateAudioDuration,
  getUsagePercentage as getElevenLabsUsagePercentage,
} from './elevenlabs'
export type {
  Voice,
  VoiceSettings,
  GenerateVoiceOptions as ElevenLabsVoiceOptions,
  GenerateSoundEffectOptions,
  CloneVoiceOptions,
  UserSubscription as ElevenLabsSubscription,
  UserInfo as ElevenLabsUserInfo,
} from './elevenlabs'

// Replicate - Image, video, and music generation
export {
  generateImages,
  generateVideo,
  generateMusic,
  generateVoice as generateVoiceReplicate,
  // Asset-aware generation functions
  generateImageAssets,
  generateVideoAsset,
  generateMusicAsset,
  generateVoiceAsset,
} from './replicate'
export type {
  GenerateImageOptions,
  GenerateVideoOptions,
  GenerateMusicOptions,
  GenerateVoiceOptions as ReplicateVoiceOptions,
  // Asset-aware generation option types
  GenerateImageAssetOptions,
  GenerateImageAssetResult,
  GenerateVideoAssetOptions,
  GenerateVideoAssetResult,
  GenerateMusicAssetOptions,
  GenerateVoiceAssetOptions,
} from './replicate'

// Claude AI Assistant
export * from './claude'

// Re-export Supabase client and helpers
export { supabase, getStorageBucket, getStoragePath, getPublicUrl, getSignedUrl } from '@/lib/supabase'

// Re-export database types
export type {
  Database,
  Profile,
  Platform,
  Project,
  ProjectBrief,
  MoodBoard,
  Storyboard,
  StoryboardCard,
  Scene,
  Shot,
  Asset,
  ExportSettings,
  UsageTracking,
  ProjectWithRelations,
  SceneWithShots,
  ShotWithAssets,
  // Script types
  ScriptCharacter,
  ScriptCharacterWithAsset,
  ScriptSection,
  ScriptSectionType,
  ScriptSectionWithCharacter,
  ScriptCharacterInsert,
  ScriptSectionInsert,
  // Enums and base types
  AspectRatio,
  SubscriptionTier,
  ProjectStatus,
  AssetType,
  AssetCategory,
  AssetStorageType,
  ExportResolution,
  ExportFormat,
  ExportQuality,
} from '@/types/database'

export { SUBSCRIPTION_LIMITS } from '@/types/database'
