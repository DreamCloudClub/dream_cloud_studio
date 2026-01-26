// Service exports for Dream Cloud Studio
// Import from '@/services' for cleaner imports

// Auth
export * from './auth'

// Projects and related entities
export * from './projects'

// Assets and file management
export * from './assets'

// Platforms
export * from './platforms'

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
} from './replicate'
export type {
  GenerateImageOptions,
  GenerateVideoOptions,
  GenerateMusicOptions,
  GenerateVoiceOptions as ReplicateVoiceOptions,
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
  AspectRatio,
  SubscriptionTier,
  ProjectStatus,
  AssetType,
  AssetCategory,
  ExportResolution,
  ExportFormat,
  ExportQuality,
} from '@/types/database'

export { SUBSCRIPTION_LIMITS } from '@/types/database'
