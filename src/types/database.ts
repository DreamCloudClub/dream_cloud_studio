// Database types for Dream Cloud Studio
// These types match the Supabase schema defined in supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9'
export type SubscriptionTier = 'trial' | 'lite' | 'basic' | 'enterprise'
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type AssetType = 'image' | 'video' | 'audio'
export type AssetCategory = 'scene' | 'stage' | 'character' | 'weather' | 'prop' | 'effect' | 'audio' | 'voiceover' | 'soundtrack' | 'sfx'
export type ExportResolution = '720p' | '1080p' | '4k'
export type ExportFormat = 'mp4' | 'webm' | 'mov'
export type ExportQuality = 'draft' | 'standard' | 'high'

// Row types (what you get back from queries)
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
}

export interface Platform {
  id: string
  user_id: string
  name: string
  description: string | null
  logo_url: string | null
  color_palette: Json
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  platform_id: string | null
  name: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export interface ProjectBrief {
  id: string
  project_id: string
  name: string
  description: string | null
  audience: string | null
  tone: string | null
  duration: string | null
  aspect_ratio: AspectRatio
  goals: Json
  created_at: string
  updated_at: string
}

export interface MoodBoard {
  id: string
  project_id: string
  images: Json
  colors: Json
  keywords: Json
  created_at: string
  updated_at: string
}

export interface Storyboard {
  id: string
  project_id: string
  acts: Json
  created_at: string
  updated_at: string
}

export interface StoryboardCard {
  id: string
  project_id: string
  title: string
  description: string | null
  content: string | null
  thumbnail_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Scene {
  id: string
  project_id: string
  name: string
  description: string | null
  sort_order: number
  voiceover_script: string | null
  voiceover_audio_url: string | null
  voiceover_duration: number | null
  created_at: string
  updated_at: string
}

export interface Shot {
  id: string
  scene_id: string
  name: string
  description: string | null
  duration: number
  sort_order: number
  shot_type: string | null
  notes: string | null
  asset_config: Json
  media_type: AssetType | null
  media_url: string | null
  media_thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  user_id: string
  project_id: string | null
  name: string
  type: AssetType
  category: AssetCategory | null
  url: string
  thumbnail_url: string | null
  duration: number | null
  file_size: number | null
  metadata: Json
  created_at: string
}

export interface ExportSettings {
  id: string
  project_id: string
  resolution: ExportResolution
  format: ExportFormat
  frame_rate: number
  quality: ExportQuality
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  user_id: string
  period_start: string
  period_end: string
  images_generated: number
  videos_generated: number
  audio_minutes_used: number
  storage_bytes_used: number
  created_at: string
  updated_at: string
}

// Insert types (for creating new records)
export interface ProfileInsert {
  id: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
  subscription_tier?: SubscriptionTier
}

export interface PlatformInsert {
  id?: string
  user_id: string
  name: string
  description?: string | null
  logo_url?: string | null
  color_palette?: Json
}

export interface ProjectInsert {
  id?: string
  user_id: string
  platform_id?: string | null
  name: string
  status?: ProjectStatus
}

export interface ProjectBriefInsert {
  id?: string
  project_id: string
  name: string
  description?: string | null
  audience?: string | null
  tone?: string | null
  duration?: string | null
  aspect_ratio?: AspectRatio
  goals?: Json
}

export interface MoodBoardInsert {
  id?: string
  project_id: string
  images?: Json
  colors?: Json
  keywords?: Json
}

export interface StoryboardInsert {
  id?: string
  project_id: string
  acts?: Json
}

export interface StoryboardCardInsert {
  id?: string
  project_id: string
  title: string
  description?: string | null
  content?: string | null
  thumbnail_url?: string | null
  sort_order?: number
}

export interface SceneInsert {
  id?: string
  project_id: string
  name: string
  description?: string | null
  sort_order?: number
  voiceover_script?: string | null
  voiceover_audio_url?: string | null
  voiceover_duration?: number | null
}

export interface ShotInsert {
  id?: string
  scene_id: string
  name: string
  description?: string | null
  duration?: number
  sort_order?: number
  shot_type?: string | null
  notes?: string | null
  asset_config?: Json
  media_type?: AssetType | null
  media_url?: string | null
  media_thumbnail_url?: string | null
}

export interface AssetInsert {
  id?: string
  user_id: string
  project_id?: string | null
  name: string
  type: AssetType
  category?: AssetCategory | null
  url: string
  thumbnail_url?: string | null
  duration?: number | null
  file_size?: number | null
  metadata?: Json
}

export interface ExportSettingsInsert {
  id?: string
  project_id: string
  resolution?: ExportResolution
  format?: ExportFormat
  frame_rate?: number
  quality?: ExportQuality
}

// Update types (for updating existing records)
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
export type PlatformUpdate = Partial<Omit<Platform, 'id' | 'user_id' | 'created_at'>>
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>
export type ProjectBriefUpdate = Partial<Omit<ProjectBrief, 'id' | 'project_id' | 'created_at'>>
export type MoodBoardUpdate = Partial<Omit<MoodBoard, 'id' | 'project_id' | 'created_at'>>
export type StoryboardUpdate = Partial<Omit<Storyboard, 'id' | 'project_id' | 'created_at'>>
export type StoryboardCardUpdate = Partial<Omit<StoryboardCard, 'id' | 'project_id' | 'created_at'>>
export type SceneUpdate = Partial<Omit<Scene, 'id' | 'project_id' | 'created_at'>>
export type ShotUpdate = Partial<Omit<Shot, 'id' | 'scene_id' | 'created_at'>>
export type AssetUpdate = Partial<Omit<Asset, 'id' | 'user_id' | 'created_at'>>
export type ExportSettingsUpdate = Partial<Omit<ExportSettings, 'id' | 'project_id' | 'created_at'>>

// Extended types with relations (for client-side use)
export interface ProjectWithRelations extends Project {
  brief?: ProjectBrief
  mood_board?: MoodBoard
  storyboard?: Storyboard
  storyboard_cards?: StoryboardCard[]
  scenes?: SceneWithShots[]
  assets?: Asset[]
  export_settings?: ExportSettings
  platform?: Platform
}

export interface SceneWithShots extends Scene {
  shots: Shot[]
}

// Subscription limits by tier
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, {
  images_per_month: number
  videos_per_month: number
  audio_minutes_per_month: number
  storage_gb: number
  export_4k: boolean
}> = {
  trial: {
    images_per_month: 20,
    videos_per_month: 5,
    audio_minutes_per_month: 5,
    storage_gb: 0.5,
    export_4k: false,
  },
  lite: {
    images_per_month: 100,
    videos_per_month: 25,
    audio_minutes_per_month: 30,
    storage_gb: 5,
    export_4k: false,
  },
  basic: {
    images_per_month: 500,
    videos_per_month: 150,
    audio_minutes_per_month: 120,
    storage_gb: 50,
    export_4k: true,
  },
  enterprise: {
    images_per_month: Infinity,
    videos_per_month: Infinity,
    audio_minutes_per_month: Infinity,
    storage_gb: Infinity,
    export_4k: true,
  },
}

// Database type for Supabase client (simplified version that works)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      platforms: {
        Row: Platform
        Insert: PlatformInsert
        Update: PlatformUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      project_briefs: {
        Row: ProjectBrief
        Insert: ProjectBriefInsert
        Update: ProjectBriefUpdate
      }
      mood_boards: {
        Row: MoodBoard
        Insert: MoodBoardInsert
        Update: MoodBoardUpdate
      }
      storyboards: {
        Row: Storyboard
        Insert: StoryboardInsert
        Update: StoryboardUpdate
      }
      storyboard_cards: {
        Row: StoryboardCard
        Insert: StoryboardCardInsert
        Update: StoryboardCardUpdate
      }
      scenes: {
        Row: Scene
        Insert: SceneInsert
        Update: SceneUpdate
      }
      shots: {
        Row: Shot
        Insert: ShotInsert
        Update: ShotUpdate
      }
      assets: {
        Row: Asset
        Insert: AssetInsert
        Update: AssetUpdate
      }
      export_settings: {
        Row: ExportSettings
        Insert: ExportSettingsInsert
        Update: ExportSettingsUpdate
      }
      usage_tracking: {
        Row: UsageTracking
        Insert: Omit<UsageTracking, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UsageTracking, 'id' | 'user_id' | 'period_start' | 'created_at'>>
      }
    }
    Functions: {
      get_or_create_usage_tracking: {
        Args: { p_user_id: string }
        Returns: UsageTracking
      }
    }
  }
}
