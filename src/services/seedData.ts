import { supabase } from '@/lib/supabase'
import type { AssetCategory, AssetType } from '@/types/database'

// ============================================
// SEED DATA DEFINITIONS
// ============================================

interface SeedPlatform {
  name: string
  description: string
  color_palette: string[]
}

interface SeedProject {
  name: string
  status: 'draft' | 'in_progress' | 'completed'
  brief: {
    name: string
    description: string
    audience: string
    tone: string
    duration: string
    goals: string[]
  }
}

interface SeedAsset {
  name: string
  type: AssetType
  category: AssetCategory
  url: string
  duration?: number
}

// Platforms (Foundations in UI)
const seedPlatforms: SeedPlatform[] = [
  {
    name: "Corporate Clean",
    description: "Professional and minimal aesthetic with blue accents",
    color_palette: ["#1e3a5f", "#3b82f6", "#f8fafc", "#64748b"],
  },
  {
    name: "Playful Social",
    description: "Vibrant colors and dynamic compositions for social media",
    color_palette: ["#ec4899", "#8b5cf6", "#f97316", "#22c55e"],
  },
  {
    name: "Tech Minimal",
    description: "Dark mode aesthetic with neon highlights",
    color_palette: ["#0f0f0f", "#18181b", "#22d3ee", "#a855f7"],
  },
  {
    name: "Warm Natural",
    description: "Earth tones and organic textures",
    color_palette: ["#854d0e", "#a16207", "#fef3c7", "#365314"],
  },
]

// Projects
const seedProjects: SeedProject[] = [
  {
    name: "Product Launch Video",
    status: "in_progress",
    brief: {
      name: "Product Launch Video",
      description: "A dynamic product launch video showcasing our new smart home device with sleek visuals and modern aesthetics.",
      audience: "Tech-savvy consumers, 25-45 years old",
      tone: "Modern, innovative, exciting",
      duration: "60 seconds",
      goals: ["Generate buzz for product launch", "Highlight key features", "Drive pre-orders"],
    },
  },
  {
    name: "Brand Story",
    status: "draft",
    brief: {
      name: "Brand Story",
      description: "Company history and values documentary showcasing our journey from startup to industry leader.",
      audience: "Investors, partners, and potential employees",
      tone: "Inspirational, authentic, professional",
      duration: "3 minutes",
      goals: ["Build brand awareness", "Communicate company values", "Attract talent"],
    },
  },
  {
    name: "Tutorial Series Ep.1",
    status: "completed",
    brief: {
      name: "Tutorial Series Ep.1",
      description: "How to use our product - Episode 1: Getting Started guide for new users.",
      audience: "New customers and potential buyers",
      tone: "Friendly, helpful, clear",
      duration: "2 minutes",
      goals: ["Reduce support tickets", "Improve user onboarding", "Increase product adoption"],
    },
  },
  {
    name: "Social Media Ad",
    status: "in_progress",
    brief: {
      name: "Social Media Ad",
      description: "15-second Instagram ad for summer campaign featuring lifestyle shots.",
      audience: "Young adults, 18-30 years old",
      tone: "Fun, energetic, trendy",
      duration: "15 seconds",
      goals: ["Increase social engagement", "Drive website traffic", "Build brand awareness"],
    },
  },
  {
    name: "Customer Testimonial",
    status: "draft",
    brief: {
      name: "Customer Testimonial",
      description: "Interview with satisfied customer highlighting their success story.",
      audience: "Prospective customers considering purchase",
      tone: "Authentic, relatable, trustworthy",
      duration: "90 seconds",
      goals: ["Build social proof", "Address common objections", "Increase conversions"],
    },
  },
  {
    name: "Event Highlight Reel",
    status: "completed",
    brief: {
      name: "Event Highlight Reel",
      description: "Annual conference highlights video capturing key moments and speakers.",
      audience: "Event attendees and industry professionals",
      tone: "Exciting, professional, memorable",
      duration: "2 minutes",
      goals: ["Document the event", "Promote next year's conference", "Share on social media"],
    },
  },
]

// Assets
const seedAssets: SeedAsset[] = [
  // Scenes
  { name: "Sunset Beach", type: "image", category: "scene", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
  { name: "City Skyline", type: "image", category: "scene", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800" },
  { name: "Mountain Vista", type: "image", category: "scene", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
  { name: "Office Interior", type: "image", category: "scene", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800" },
  { name: "Forest Path", type: "video", category: "scene", url: "https://example.com/forest.mp4", duration: 10 },
  // Stages
  { name: "Presentation Stage", type: "image", category: "stage", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800" },
  { name: "Modern Table", type: "image", category: "stage", url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800" },
  // Characters
  { name: "Business Professional", type: "image", category: "character", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800" },
  { name: "Tech Enthusiast", type: "image", category: "character", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800" },
  { name: "Walking Person", type: "video", category: "character", url: "https://example.com/walking.mp4", duration: 5 },
  // Weather
  { name: "Sunny Day", type: "image", category: "weather", url: "https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800" },
  { name: "Rain Effect", type: "video", category: "weather", url: "https://example.com/rain.mp4", duration: 8 },
  // Props
  { name: "Laptop", type: "image", category: "prop", url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800" },
  { name: "Coffee Mug", type: "image", category: "prop", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800" },
  { name: "Smartphone", type: "image", category: "prop", url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800" },
  // Effects
  { name: "Lens Flare", type: "video", category: "effect", url: "https://example.com/flare.mp4", duration: 3 },
  { name: "Particle Burst", type: "video", category: "effect", url: "https://example.com/particles.mp4", duration: 2 },
  // Audio - Music
  { name: "Upbeat Background", type: "audio", category: "music", url: "https://example.com/upbeat.mp3", duration: 120 },
  { name: "Ambient Office", type: "audio", category: "music", url: "https://example.com/ambient.mp3", duration: 60 },
  { name: "Corporate Inspire", type: "audio", category: "music", url: "https://example.com/corporate.mp3", duration: 180 },
  // Audio - Sound Effects
  { name: "Click Sound", type: "audio", category: "sound_effect", url: "https://example.com/click.mp3", duration: 1 },
  { name: "Whoosh", type: "audio", category: "sound_effect", url: "https://example.com/whoosh.mp3", duration: 2 },
  { name: "Notification Ding", type: "audio", category: "sound_effect", url: "https://example.com/ding.mp3", duration: 1 },
  // Audio - Voice
  { name: "Male Narrator", type: "audio", category: "voice", url: "https://example.com/narrator-male.mp3", duration: 30 },
  { name: "Female Narrator", type: "audio", category: "voice", url: "https://example.com/narrator-female.mp3", duration: 30 },
]

// ============================================
// SEED FUNCTIONS
// ============================================

export async function seedPlatformsData(userId: string): Promise<number> {
  let count = 0

  for (const platform of seedPlatforms) {
    const { error } = await supabase.from('platforms').insert({
      user_id: userId,
      name: platform.name,
      description: platform.description,
      color_palette: platform.color_palette,
    })

    if (!error) count++
  }

  return count
}

export async function seedProjectsData(userId: string): Promise<number> {
  let count = 0

  for (const project of seedProjects) {
    // Create project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: project.name,
        status: project.status,
      })
      .select()
      .single()

    if (projectError || !projectData) continue

    // Create brief
    const { error: briefError } = await supabase.from('project_briefs').insert({
      project_id: projectData.id,
      name: project.brief.name,
      description: project.brief.description,
      audience: project.brief.audience,
      tone: project.brief.tone,
      duration: project.brief.duration,
      goals: project.brief.goals,
    })

    if (!briefError) count++
  }

  return count
}

export async function seedAssetsData(userId: string): Promise<number> {
  let count = 0

  for (const asset of seedAssets) {
    const { error } = await supabase.from('assets').insert({
      user_id: userId,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      url: asset.url,
      duration: asset.duration,
    })

    if (!error) count++
  }

  return count
}

export async function seedAllData(userId: string): Promise<{
  platforms: number
  projects: number
  assets: number
}> {
  const platforms = await seedPlatformsData(userId)
  const projects = await seedProjectsData(userId)
  const assets = await seedAssetsData(userId)

  return { platforms, projects, assets }
}

// ============================================
// CLEAR FUNCTIONS (for resetting)
// ============================================

export async function clearUserData(userId: string): Promise<void> {
  // Delete in order due to foreign key constraints
  await supabase.from('assets').delete().eq('user_id', userId)
  await supabase.from('projects').delete().eq('user_id', userId)
  await supabase.from('platforms').delete().eq('user_id', userId)
}

export async function clearAndReseed(userId: string): Promise<{
  platforms: number
  projects: number
  assets: number
}> {
  await clearUserData(userId)
  return seedAllData(userId)
}
