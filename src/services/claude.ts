// Claude API service for Dream Cloud Studio
// This powers the "Bubble" AI assistant in the project wizard
// API calls are proxied through Supabase edge functions for security

import { anthropicProxy } from '../lib/api-proxy'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface BubbleContext {
  currentStep: string
  currentRoute: string
  initialPrompt?: string
  platform?: {
    type: 'new' | 'existing'
    name?: string
  }
  brief?: {
    name?: string
    description?: string
    audience?: string
    tone?: string
    duration?: string
    aspectRatio?: string
  }
  videoContent?: {
    characters?: string[]
    setting?: string
    timeOfDay?: string
    weather?: string
    action?: string
    props?: string[]
    dialogue?: string
  }
  // Script data (characters and sections)
  script?: {
    characters?: Array<{ id: string; name: string; voiceDescription?: string }>
    sections?: Array<{
      id: string
      type: 'description' | 'dialogue'
      content: string
      characterName?: string
      isNewScene?: boolean
    }>
  }
  moodBoard?: {
    keywords?: string[]
    colors?: string[]
  }
  storyboard?: {
    acts?: Array<{
      name: string
      description: string
      beats?: Array<{ title?: string; description?: string }>
    }>
  }
  shotCount?: number
  composition?: {
    hasTitle?: boolean
    titleText?: string
    hasOutro?: boolean
    outroText?: string
    defaultTransition?: string
    overlayCount?: number
  }
  // Asset Creator wizard data
  assetWizard?: {
    type?: 'image' | 'video' | 'audio' | 'animation'
    category?: string
    name?: string
    userDescription?: string
    aiPrompt?: string
    style?: string
    // Generation state - for knowing when to use refinement vs description
    hasGeneratedImages?: boolean
    batchCount?: number
    // Animation-specific data
    animationConfig?: {
      duration: number
      layerCount: number
      layerTypes: string[]
      hasBackground: boolean
    }
  }
  // Library page data
  library?: {
    assets?: Array<{
      id: string
      name: string
      type: 'image' | 'video' | 'audio'
      category?: string
    }>
    selectedAsset?: {
      id: string
      name: string
      type: 'image' | 'video' | 'audio'
      category?: string
      userDescription?: string
      aiPrompt?: string
    }
  }
  // Foundation wizard data
  foundationWizard?: {
    step?: string
    editingId?: string | null
    name?: string
    description?: string
    colorPalette?: string[]
    style?: string | null
    mood?: string | null
    typography?: string | null
    tone?: string | null
    moodImageCount?: number
  }
  // Workspace data (for editing existing projects)
  workspace?: {
    activeTab?: string
    projectId?: string
    projectName?: string
    selectedClipId?: string | null
    isPlaying?: boolean
    currentTime?: number
    // Timeline clips (flat list)
    clips?: Array<{
      id: string
      assetId: string
      assetName?: string
      assetType?: 'video' | 'image' | 'audio'
      startTime: number
      duration: number
      inPoint: number
    }>
    timelineDuration?: number
    assetCount?: number
    assetsByType?: {
      image?: number
      video?: number
      audio?: number
    }
    // Available assets for adding to timeline
    assets?: Array<{
      id: string
      name: string
      type: 'video' | 'image' | 'audio'
      duration?: number
    }>
  }
}

// Tool definitions for Bubble's actions
const TOOLS = [
  {
    name: 'create_new_project',
    description: 'Create a new blank project and navigate to the Workspace. Use this when user wants to start a new video project.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Set to true to confirm project creation'
        }
      },
      required: ['confirm']
    }
  },
  {
    name: 'navigate',
    description: 'Navigate to a specific page or route in the application. Use this to take the user to different pages.',
    input_schema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          description: `The route to navigate to. Available routes:
- "/" - Home/Dashboard
- "/create/asset" - Create standalone asset wizard
- "/create/foundation" - Create new foundation/brand style guide
- "/create/platform" - Create new platform
- "/create/image/text-to-image" - Text to Image generation
- "/create/image/image-to-image" - Image to Image transformation
- "/create/image/inpaint" - Inpainting (edit parts of image)
- "/create/video/text-to-video" - Text to Video generation
- "/create/video/image-to-video" - Animate an image into video
- "/create/audio/text-to-speech" - Text to Speech
- "/create/audio/music-sfx" - Music and sound effects
- "/library/assets" - Browse asset library
- "/library/projects" - Browse projects
- "/library/foundations" - Browse foundations
- "/library/platforms" - Browse platforms
- "/animations" - Animation library
- "/animations/new" - Create new animation
- "/profile" - User profile settings`
        }
      },
      required: ['route']
    }
  },
  {
    name: 'select_platform',
    description: 'Select the platform type for the project (new or existing). Only use when on the platform step.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['new', 'existing'],
          description: 'Whether to create a new platform or use an existing one'
        },
        platformId: {
          type: 'string',
          description: 'The ID of the existing platform to use (only if type is "existing")'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'update_brief',
    description: 'Update basic project info fields. Only use when on the brief step.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name/title' },
        audience: { type: 'string', description: 'Target audience for the video' },
        tone: { type: 'string', description: 'Tone/mood of the video (e.g., professional, playful, dramatic)' },
        duration: { type: 'string', description: 'Target duration (e.g., "30 seconds", "2 minutes")' },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'],
          description: 'Video aspect ratio'
        }
      }
    }
  },
  {
    name: 'update_video_content',
    description: 'Update structured video content extracted from user description. Use when user describes their video scene. Only use on the brief step.',
    input_schema: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Character names or descriptions mentioned (e.g., ["Marcus", "a young woman", "the narrator"])'
        },
        setting: {
          type: 'string',
          description: 'Location or environment (e.g., "city street", "modern office", "beach at sunset")'
        },
        timeOfDay: {
          type: 'string',
          description: 'Time of day (e.g., "morning", "night", "golden hour", "midday")'
        },
        weather: {
          type: 'string',
          description: 'Weather conditions (e.g., "rainy", "sunny", "foggy", "snowy")'
        },
        action: {
          type: 'string',
          description: 'Main action or story happening in the video (e.g., "A man walks through the city looking for his lost dog")'
        },
        props: {
          type: 'array',
          items: { type: 'string' },
          description: 'Important objects or props mentioned (e.g., ["umbrella", "coffee cup", "vintage car"])'
        },
        dialogue: {
          type: 'string',
          description: 'Any spoken dialogue or narration mentioned'
        }
      }
    }
  },
  {
    name: 'update_mood_board',
    description: 'Update the mood board with keywords or colors. Only use when on the mood step.',
    input_schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Visual style keywords (e.g., "minimalist", "vibrant", "cinematic")'
        },
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Color palette as hex codes (e.g., "#FF5733")'
        }
      }
    }
  },
  // ============================================
  // SCRIPT TOOLS (for the script step)
  // ============================================
  {
    name: 'create_script_character',
    description: 'Create a new character for the script. Characters can be assigned to dialogue sections. Use when on the script step.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Character name (e.g., "Marcus", "Narrator", "Customer")'
        },
        description: {
          type: 'string',
          description: 'Physical appearance and personality description'
        },
        voiceDescription: {
          type: 'string',
          description: 'Voice characteristics for AI voice generation (e.g., "deep, warm, British accent", "young, energetic female")'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'create_script_section',
    description: 'Create a new script section (description or dialogue). Descriptions set the scene, dialogue is spoken lines. Use when on the script step.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['description', 'dialogue'],
          description: 'Section type: "description" for scene-setting/action, "dialogue" for character speech'
        },
        content: {
          type: 'string',
          description: 'The content of the section (scene description or dialogue text)'
        },
        characterName: {
          type: 'string',
          description: 'For dialogue sections: the name of the character speaking (must exist)'
        },
        isNewScene: {
          type: 'boolean',
          description: 'For description sections: true if this starts a new scene/storyboard panel'
        },
        sceneContext: {
          type: 'string',
          description: 'For new scenes: additional context like location, mood, time of day'
        }
      },
      required: ['type', 'content']
    }
  },
  {
    name: 'update_script_section',
    description: 'Update an existing script section. Use to modify content, change character, or toggle new scene marker.',
    input_schema: {
      type: 'object',
      properties: {
        sectionIndex: {
          type: 'number',
          description: 'Index of the section to update (0-based)'
        },
        content: {
          type: 'string',
          description: 'New content for the section'
        },
        characterName: {
          type: 'string',
          description: 'For dialogue: change the speaking character'
        },
        isNewScene: {
          type: 'boolean',
          description: 'Toggle whether this description starts a new scene'
        }
      },
      required: ['sectionIndex']
    }
  },
  {
    name: 'update_storyboard',
    description: 'Update the scenes and shots structure. Use when on the scenes step to outline shots for each scene.',
    input_schema: {
      type: 'object',
      properties: {
        acts: {
          type: 'array',
          description: 'Array of scenes (Scene 1, Scene 2, etc.)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Scene name (e.g., "Scene 1", "Scene 2")' },
              description: { type: 'string', description: 'Brief description of what happens in this scene (optional)' },
              beats: {
                type: 'array',
                description: 'Shots within this scene',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Shot title (e.g., "Hero entrance", "Product reveal")' },
                    description: { type: 'string', description: 'Detailed visual description of the shot - this becomes the image generation prompt' }
                  },
                  required: ['description']
                }
              }
            },
            required: ['name', 'beats']
          }
        }
      },
      required: ['acts']
    }
  },
  {
    name: 'add_scene',
    description: 'Add a new scene to the storyboard. Use this to create a new scene without affecting existing scenes.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Scene name (e.g., "Scene 2", "Opening Scene")' },
        description: { type: 'string', description: 'Brief description of what happens in this scene' },
        shots: {
          type: 'array',
          description: 'Initial shots for this scene (optional)',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Shot title' },
              description: { type: 'string', description: 'Visual description of the shot' }
            },
            required: ['description']
          }
        }
      },
      required: ['name']
    }
  },
  {
    name: 'add_shot_to_scene',
    description: 'Add a shot to an existing scene. Use this to add shots one at a time without replacing existing shots.',
    input_schema: {
      type: 'object',
      properties: {
        sceneName: { type: 'string', description: 'Name of the scene to add the shot to (e.g., "Scene 1")' },
        title: { type: 'string', description: 'Shot title (e.g., "Hero entrance", "Product close-up")' },
        description: { type: 'string', description: 'Detailed visual description of the shot - this becomes the image generation prompt' }
      },
      required: ['sceneName', 'description']
    }
  },
  {
    name: 'update_scene_shot',
    description: 'Update an existing shot in a scene. Use to modify title, description, or append additional details to the description.',
    input_schema: {
      type: 'object',
      properties: {
        sceneName: { type: 'string', description: 'Name of the scene containing the shot (e.g., "Scene 1")' },
        shotTitle: { type: 'string', description: 'Current title of the shot to update (use this OR shotIndex)' },
        shotIndex: { type: 'number', description: 'Index of the shot to update, 0-based (use this OR shotTitle)' },
        newTitle: { type: 'string', description: 'New title for the shot (optional - only if changing title)' },
        newDescription: { type: 'string', description: 'New description for the shot (replaces existing unless append is true)' },
        append: { type: 'boolean', description: 'If true, append newDescription to existing description instead of replacing' }
      },
      required: ['sceneName']
    }
  },
  {
    name: 'update_shots',
    description: 'Create or update the shot list. Use when on the shots step to add planned shots.',
    input_schema: {
      type: 'object',
      properties: {
        shots: {
          type: 'array',
          description: 'Array of shots to create',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'What happens in this shot' },
              duration: { type: 'number', description: 'Shot duration in seconds (default 3)' },
              shotType: {
                type: 'string',
                description: 'Camera shot type (e.g., "Wide shot", "Close-up", "Medium shot", "POV", "Aerial")'
              },
              notes: { type: 'string', description: 'Additional notes for this shot' }
            },
            required: ['description']
          }
        }
      },
      required: ['shots']
    }
  },
  {
    name: 'add_shot',
    description: 'Add a single shot to the shot list.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What happens in this shot' },
        duration: { type: 'number', description: 'Shot duration in seconds (default 3)' },
        shotType: {
          type: 'string',
          description: 'Camera shot type (e.g., "Wide shot", "Close-up", "Medium shot")'
        },
        sceneIndex: { type: 'number', description: 'Which scene this shot belongs to (0-indexed)' },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['description']
    }
  },
  {
    name: 'set_audio',
    description: 'Set audio elements for the project - voiceover script, music style, or sound effects.',
    input_schema: {
      type: 'object',
      properties: {
        voiceoverScript: { type: 'string', description: 'The voiceover narration script' },
        musicStyle: { type: 'string', description: 'Description of background music style (e.g., "upbeat corporate", "emotional piano")' },
        soundEffects: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of sound effects needed (e.g., ["whoosh", "typing sounds", "crowd ambience"])'
        }
      }
    }
  },
  {
    name: 'go_to_next_step',
    description: 'Move to the next step in the wizard. Use after the current step is complete.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'go_to_previous_step',
    description: 'Go back to the previous step in the wizard.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_title_card',
    description: 'Set the opening title card for the video. Use when user describes how the video should open with text/branding.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Main title text (e.g., brand name, video title)' },
        subtitle: { type: 'string', description: 'Optional subtitle text' },
        font: { type: 'string', description: 'Font style hint (e.g., "futuristic", "elegant", "bold")' },
        animation: {
          type: 'string',
          enum: ['fade', 'slide-up', 'zoom', 'typewriter'],
          description: 'How the title animates in'
        },
        backgroundColor: { type: 'string', description: 'Background color (hex code or "transparent")' }
      },
      required: ['text']
    }
  },
  {
    name: 'set_outro_card',
    description: 'Set the closing/outro card for the video. Use when user describes how the video should end with text.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Main outro text (e.g., "Follow us", "Learn more")' },
        subtitle: { type: 'string', description: 'Optional subtitle (e.g., social handle, website)' },
        animation: {
          type: 'string',
          enum: ['fade', 'slide-up', 'zoom', 'typewriter'],
          description: 'How the outro animates in'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'set_transition',
    description: 'Set the default transition style between shots.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['none', 'fade', 'wipe-left', 'wipe-right', 'zoom'],
          description: 'Transition type between shots'
        },
        duration: {
          type: 'number',
          description: 'Transition duration in seconds (default 0.5)'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'add_text_overlay',
    description: 'Add a text overlay to appear on screen during the video. Use for lower thirds, captions, callouts.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to display' },
        position: {
          type: 'string',
          enum: ['top', 'center', 'bottom', 'lower-third'],
          description: 'Where on screen the text appears'
        },
        animation: {
          type: 'string',
          enum: ['fade', 'slide-up', 'slide-left', 'typewriter', 'glitch'],
          description: 'How the text animates in'
        },
        shotId: { type: 'string', description: 'Which shot this overlay appears on (optional)' },
        startTime: { type: 'number', description: 'Seconds into the shot when text appears' },
        duration: { type: 'number', description: 'How long the text stays on screen (seconds)' }
      },
      required: ['text']
    }
  },
  // ============================================
  // ASSET WIZARD TOOLS (for updating the Asset Creator form)
  // ============================================
  {
    name: 'set_asset_type',
    description: 'Set the asset type in the Asset Creator wizard. Use when user specifies what type of asset they want to create.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['image', 'video', 'audio'],
          description: 'The type of asset to create'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'set_asset_category',
    description: 'Set the asset category in the Asset Creator wizard. Use after setting the type to specify what kind of asset.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['scene', 'stage', 'character', 'weather', 'prop', 'effect', 'music', 'sound_effect', 'voice'],
          description: 'The category of asset (scene/stage/character/etc for images, music/sound_effect/voice for audio)'
        }
      },
      required: ['category']
    }
  },
  {
    name: 'update_asset_details',
    description: 'Update the asset details in the Asset Creator wizard. Use to set the name, description, AI prompt, model selection, and other generation parameters.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the asset (e.g., "Hero Character", "Forest Background")'
        },
        user_description: {
          type: 'string',
          description: 'Plain language description of what the user wants'
        },
        ai_prompt: {
          type: 'string',
          description: 'Enhanced technical prompt for AI generation with style, lighting, composition details'
        },
        style: {
          type: 'string',
          enum: ['cinematic', 'photorealistic', 'anime', '3d-render', 'illustration', 'abstract'],
          description: 'Visual style preset (for images/video)'
        },
        refinement: {
          type: 'string',
          description: 'Refinement text to append to the next generation (e.g., "make it more dramatic", "change lighting to sunset"). This gets added to the prompt for the next batch of images.'
        },
        category_option: {
          type: 'string',
          description: 'Category-specific framing/composition option. For characters: "full-body", "torso", "face". For scenes: "wide", "medium", "close-up". For props: "multi", "isometric", "front". For stages: "deep", "mid", "flat". For effects/weather: "subtle", "medium", "dramatic"/"heavy". For music: "calm", "moderate", "energetic". For sound_effect: "realistic", "stylized", "retro".'
        },
        image_model: {
          type: 'string',
          enum: ['flux-pro', 'gpt', 'nano-banana', 'grok', 'sdxl'],
          description: 'Image generation model: "flux-pro" (best quality), "gpt" (best for references), "nano-banana" (Google AI), "grok" (xAI), "sdxl" (faster)'
        },
        video_model: {
          type: 'string',
          enum: ['kling', 'veo-3', 'grok-video', 'minimax'],
          description: 'Video generation model: "kling" (best quality, 5-10s), "veo-3" (Google AI), "grok-video" (xAI), "minimax" (fast, ~6s)'
        },
        aspect_ratio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:3'],
          description: 'Aspect ratio for image/video generation'
        },
        video_duration: {
          type: 'number',
          enum: [5, 10],
          description: 'Video duration in seconds (5 or 10)'
        }
      }
    }
  },
  {
    name: 'trigger_generation',
    description: 'Click the Generate button to start generating the asset. Use this after filling in the name and description fields. Only use when the user confirms they want to generate.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Set to true to confirm generation should start'
        }
      },
      required: ['confirm']
    }
  },
  {
    name: 'continue_to_save',
    description: 'Click the Continue button to proceed to the save step after generation is complete and assets are selected. Only use when user has selected assets and wants to save them.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Set to true to continue to save step'
        }
      },
      required: ['confirm']
    }
  },
  {
    name: 'save_assets',
    description: 'Click the Save button to save the selected assets to the library. Use this on the save/review step after user confirms they want to save.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Set to true to save assets'
        }
      },
      required: ['confirm']
    }
  },
  // ============================================
  // LIBRARY ASSET TOOLS (for viewing/editing existing assets)
  // ============================================
  {
    name: 'view_library_asset',
    description: 'Open the details modal for an asset in the library. Use when user wants to view or edit an existing asset.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to view'
        }
      },
      required: ['asset_id']
    }
  },
  {
    name: 'update_library_asset',
    description: 'Update an existing asset in the library. Use when user wants to rename, change category, or update description of an asset.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to update'
        },
        name: {
          type: 'string',
          description: 'New name for the asset'
        },
        category: {
          type: 'string',
          enum: ['scene', 'stage', 'character', 'weather', 'prop', 'effect', 'music', 'sound_effect', 'voice'],
          description: 'New category for the asset'
        },
        user_description: {
          type: 'string',
          description: 'Updated description of what this asset is'
        },
        ai_prompt: {
          type: 'string',
          description: 'Updated AI generation prompt (for regeneration)'
        }
      },
      required: ['asset_id']
    }
  },
  {
    name: 'delete_library_asset',
    description: 'Delete an asset from the library. Use when user explicitly asks to remove an asset. Always confirm before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to delete'
        }
      },
      required: ['asset_id']
    }
  },
  // ============================================
  // ASSET GENERATION TOOLS
  // ============================================
  {
    name: 'generate_image',
    description: 'Generate an image from a text prompt. Use this when the user wants to create visual assets like character portraits, backgrounds, scenes, or props. The generated image will be saved as a project asset.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A name for this asset (e.g., "Hero character portrait", "City background")'
        },
        user_description: {
          type: 'string',
          description: 'The user\'s plain language description of what they want (e.g., "a friendly robot character")'
        },
        ai_prompt: {
          type: 'string',
          description: 'Enhanced technical prompt for the AI with details about style, lighting, composition, quality (e.g., "A friendly humanoid robot with soft rounded features, warm LED eyes, metallic silver body, cinematic lighting, 8k, detailed")'
        },
        category: {
          type: 'string',
          enum: ['scene', 'stage', 'character', 'weather', 'prop', 'effect'],
          description: 'Asset category for organization'
        },
        style: {
          type: 'string',
          description: 'Visual style hint (e.g., "cinematic", "cartoon", "photorealistic", "anime")'
        },
        aspectRatio: {
          type: 'string',
          enum: ['square', 'landscape', 'portrait'],
          description: 'Image aspect ratio. Default is based on project aspect ratio.'
        }
      },
      required: ['name', 'user_description', 'ai_prompt']
    }
  },
  {
    name: 'generate_voiceover',
    description: 'Generate voiceover audio from text using ElevenLabs. Use this when the user wants to create narration or character dialogue.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A name for this audio asset (e.g., "Scene 1 narration", "Character intro")'
        },
        user_description: {
          type: 'string',
          description: 'What the user asked for (e.g., "narration for the opening scene")'
        },
        text: {
          type: 'string',
          description: 'The actual script/text to convert to speech'
        },
        voiceStyle: {
          type: 'string',
          enum: ['calm_female', 'warm_male', 'deep_male', 'friendly_female', 'authoritative_male', 'energetic_female'],
          description: 'Voice style to use'
        },
        sceneId: {
          type: 'string',
          description: 'Optional scene ID to attach this voiceover to'
        }
      },
      required: ['name', 'user_description', 'text']
    }
  },
  {
    name: 'generate_music',
    description: 'Generate background music from a text description using AI. Use this when the user wants custom background music for their video.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A name for this music asset (e.g., "Intro music", "Background score")'
        },
        user_description: {
          type: 'string',
          description: 'What the user asked for (e.g., "upbeat background music")'
        },
        ai_prompt: {
          type: 'string',
          description: 'Enhanced technical prompt for music generation (e.g., "upbeat corporate music, 120 BPM, light drums, synthesizer melody, positive mood")'
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (5-30 seconds). Default is 10.'
        }
      },
      required: ['name', 'user_description', 'ai_prompt']
    }
  },
  {
    name: 'generate_sound_effect',
    description: 'Generate a sound effect from a text description using ElevenLabs. Use this for whooshes, impacts, ambient sounds, etc.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A name for this sound effect (e.g., "Transition swoosh", "Typing sounds")'
        },
        user_description: {
          type: 'string',
          description: 'What the user asked for (e.g., "a swoosh sound for transitions")'
        },
        ai_prompt: {
          type: 'string',
          description: 'Enhanced technical prompt for sound effect generation (e.g., "smooth swoosh transition sound, medium speed, clean audio, professional")'
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (0.5-22 seconds). Optional.'
        }
      },
      required: ['name', 'user_description', 'ai_prompt']
    }
  },
  // ============================================
  // WORKSPACE TOOLS (for editing existing projects)
  // ============================================
  {
    name: 'switch_workspace_tab',
    description: 'Switch to a different tab in the workspace. Use this to navigate between different sections of the project editor.',
    input_schema: {
      type: 'object',
      properties: {
        tab: {
          type: 'string',
          enum: ['platform', 'brief', 'script', 'moodboard', 'storyboard', 'editor', 'assets', 'export'],
          description: 'The tab to switch to: platform (platform settings), brief (project info), script (script editor), moodboard (visual references), storyboard (story cards), editor (timeline editor), assets (asset library), export (export settings)'
        }
      },
      required: ['tab']
    }
  },
  // ============================================
  // TIMELINE EDITING TOOLS (core video editing)
  // ============================================
  {
    name: 'timeline_add_clip',
    description: 'Add a clip to the timeline. Places an asset at a specific time on the timeline.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to add to the timeline'
        },
        start_time: {
          type: 'number',
          description: 'Where on the timeline to place the clip (seconds from start)'
        },
        duration: {
          type: 'number',
          description: 'Duration of the clip in seconds (defaults to asset duration or 5s for images)'
        },
        in_point: {
          type: 'number',
          description: 'Where to start within the source asset (seconds, default 0)'
        }
      },
      required: ['asset_id', 'start_time']
    }
  },
  {
    name: 'timeline_append_clip',
    description: 'Append a clip to the end of the timeline. Automatically places it after the last clip.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to append to the timeline'
        }
      },
      required: ['asset_id']
    }
  },
  {
    name: 'timeline_move_clip',
    description: 'Move a clip to a new position on the timeline.',
    input_schema: {
      type: 'object',
      properties: {
        clip_id: {
          type: 'string',
          description: 'The ID of the clip to move'
        },
        start_time: {
          type: 'number',
          description: 'New start time on the timeline (seconds)'
        }
      },
      required: ['clip_id', 'start_time']
    }
  },
  {
    name: 'timeline_trim_clip',
    description: 'Trim a clip by adjusting its in-point and/or duration.',
    input_schema: {
      type: 'object',
      properties: {
        clip_id: {
          type: 'string',
          description: 'The ID of the clip to trim'
        },
        in_point: {
          type: 'number',
          description: 'New in-point (where to start within the source asset, in seconds)'
        },
        duration: {
          type: 'number',
          description: 'New duration for the clip (seconds)'
        }
      },
      required: ['clip_id']
    }
  },
  {
    name: 'timeline_split_clip',
    description: 'Split a clip into two clips at a specific time point.',
    input_schema: {
      type: 'object',
      properties: {
        clip_id: {
          type: 'string',
          description: 'The ID of the clip to split'
        },
        split_at: {
          type: 'number',
          description: 'Timeline position where to split the clip (seconds). Must be within the clip.'
        }
      },
      required: ['clip_id', 'split_at']
    }
  },
  {
    name: 'timeline_delete_clip',
    description: 'Delete a clip from the timeline.',
    input_schema: {
      type: 'object',
      properties: {
        clip_id: {
          type: 'string',
          description: 'The ID of the clip to delete'
        }
      },
      required: ['clip_id']
    }
  },
  {
    name: 'timeline_select_clip',
    description: 'Select a clip on the timeline for viewing/editing.',
    input_schema: {
      type: 'object',
      properties: {
        clip_id: {
          type: 'string',
          description: 'The ID of the clip to select (or null to deselect)'
        }
      },
      required: ['clip_id']
    }
  },
  {
    name: 'workspace_play_preview',
    description: 'Control video preview playback in the editor.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['play', 'pause', 'toggle'],
          description: 'Playback action to take'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'workspace_seek',
    description: 'Seek to a specific time in the timeline.',
    input_schema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Time to seek to (seconds)'
        }
      },
      required: ['time']
    }
  },
  {
    name: 'workspace_start_asset_creation',
    description: 'Navigate to the asset creation wizard within the workspace. Use when the user wants to generate new images, videos, or audio.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'workspace_update_export_settings',
    description: 'Update the export settings for the project. Use to change resolution, format, frame rate, or quality.',
    input_schema: {
      type: 'object',
      properties: {
        resolution: {
          type: 'string',
          enum: ['720p', '1080p', '4k'],
          description: 'Video resolution'
        },
        format: {
          type: 'string',
          enum: ['mp4', 'webm', 'mov'],
          description: 'Video format'
        },
        frameRate: {
          type: 'number',
          enum: [24, 30, 60],
          description: 'Frames per second'
        },
        quality: {
          type: 'string',
          enum: ['draft', 'standard', 'high'],
          description: 'Export quality level'
        }
      }
    }
  },
  {
    name: 'workspace_add_storyboard_card',
    description: 'Add a new storyboard card to the project. Storyboard cards are narrative/story elements.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the storyboard card'
        },
        description: {
          type: 'string',
          description: 'Brief description of this story beat'
        },
        content: {
          type: 'string',
          description: 'Full content/narrative for this card'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'workspace_update_storyboard_card',
    description: 'Update an existing storyboard card.',
    input_schema: {
      type: 'object',
      properties: {
        card_id: {
          type: 'string',
          description: 'The ID of the storyboard card to update'
        },
        title: {
          type: 'string',
          description: 'New title for the card'
        },
        description: {
          type: 'string',
          description: 'New description for the card'
        },
        content: {
          type: 'string',
          description: 'New content for the card'
        }
      },
      required: ['card_id']
    }
  },
  {
    name: 'workspace_delete_storyboard_card',
    description: 'Delete a storyboard card from the project. Always confirm with the user before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        card_id: {
          type: 'string',
          description: 'The ID of the storyboard card to delete'
        }
      },
      required: ['card_id']
    }
  },
  // ============================================
  // ANIMATION TOOLS (for Remotion animation creation)
  // ============================================
  {
    name: 'set_animation_config',
    description: 'Create or replace the entire animation configuration. Use this to set up a complete animation with all layers, duration, and background. The animation will be previewed immediately in the Remotion player.',
    input_schema: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: 'Total animation duration in seconds (typically 3-10 seconds)'
        },
        background: {
          type: 'object',
          description: 'Background styling',
          properties: {
            color: { type: 'string', description: 'Background color as hex (e.g., "#000000")' },
            gradient: { type: 'string', description: 'CSS gradient (e.g., "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")' }
          }
        },
        layers: {
          type: 'array',
          description: 'Animation layers (rendered in order, first is bottom)',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['text', 'shape', 'image'],
                description: 'Layer type: text (animated text), shape (rectangle/circle), image (from URL)'
              },
              content: {
                type: 'string',
                description: 'For text: the text content. For shape: "rectangle" or "circle". For image: the URL.'
              },
              animation: {
                type: 'string',
                enum: ['fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scale', 'typewriter'],
                description: 'Animation type to apply'
              },
              timing: {
                type: 'array',
                items: { type: 'number' },
                description: 'Animation timing as [startSeconds, endSeconds]'
              },
              position: {
                type: 'object',
                description: 'Position as percentage (50,50 is center)',
                properties: {
                  x: { type: 'number', description: 'Horizontal position (0-100, 50 is center)' },
                  y: { type: 'number', description: 'Vertical position (0-100, 50 is center)' }
                }
              },
              style: {
                type: 'object',
                description: 'Styling properties',
                properties: {
                  fontSize: { type: 'number', description: 'Font size in pixels (for text)' },
                  fontFamily: { type: 'string', description: 'Font family (e.g., "Inter, sans-serif")' },
                  color: { type: 'string', description: 'Text or shape color as hex' },
                  backgroundColor: { type: 'string', description: 'Background color for text labels' },
                  width: { type: 'number', description: 'Width in pixels (for shapes)' },
                  height: { type: 'number', description: 'Height in pixels (for shapes)' }
                }
              }
            },
            required: ['type', 'content', 'animation', 'timing']
          }
        }
      },
      required: ['duration', 'layers']
    }
  },
  {
    name: 'add_animation_layer',
    description: 'Add a new layer to the current animation. Layers are rendered in order (first added is at the bottom).',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['text', 'shape', 'image'],
          description: 'Layer type'
        },
        content: {
          type: 'string',
          description: 'The layer content (text string, shape type, or image URL)'
        },
        animation: {
          type: 'string',
          enum: ['fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scale', 'typewriter'],
          description: 'Animation type'
        },
        timing: {
          type: 'array',
          items: { type: 'number' },
          description: '[startSeconds, endSeconds]'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          },
          description: 'Position as percentage (50,50 is center)'
        },
        style: {
          type: 'object',
          description: 'Styling (fontSize, fontFamily, color, backgroundColor, width, height)'
        }
      },
      required: ['type', 'content', 'animation', 'timing']
    }
  },
  {
    name: 'update_animation_layer',
    description: 'Update an existing layer in the animation by index.',
    input_schema: {
      type: 'object',
      properties: {
        layerIndex: {
          type: 'number',
          description: 'Index of the layer to update (0-based)'
        },
        content: { type: 'string', description: 'New content (optional)' },
        animation: {
          type: 'string',
          enum: ['fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scale', 'typewriter'],
          description: 'New animation type (optional)'
        },
        timing: {
          type: 'array',
          items: { type: 'number' },
          description: 'New [startSeconds, endSeconds] (optional)'
        },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          description: 'New position (optional)'
        },
        style: { type: 'object', description: 'Style updates to merge (optional)' }
      },
      required: ['layerIndex']
    }
  },
  {
    name: 'remove_animation_layer',
    description: 'Remove a layer from the animation by index.',
    input_schema: {
      type: 'object',
      properties: {
        layerIndex: {
          type: 'number',
          description: 'Index of the layer to remove (0-based)'
        }
      },
      required: ['layerIndex']
    }
  },
  {
    name: 'update_animation_properties',
    description: 'Update animation-level properties like duration and background.',
    input_schema: {
      type: 'object',
      properties: {
        duration: { type: 'number', description: 'New duration in seconds' },
        backgroundColor: { type: 'string', description: 'New background color as hex' },
        backgroundGradient: { type: 'string', description: 'New background gradient (overrides color)' }
      }
    }
  },
  // ============================================
  // FOUNDATION WIZARD TOOLS
  // ============================================
  {
    name: 'update_foundation_basics',
    description: 'Update the foundation name and description. Use when on the foundation basics step.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the foundation (e.g., "Tech Startup Brand", "Lifestyle Blog")'
        },
        description: {
          type: 'string',
          description: 'Description of what this foundation is for'
        }
      }
    }
  },
  {
    name: 'update_foundation_colors',
    description: 'Update the foundation color palette. Use when on the foundation colors step.',
    input_schema: {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of hex color codes (e.g., ["#3b82f6", "#10b981", "#f59e0b"]). Max 8 colors.'
        },
        addColor: {
          type: 'string',
          description: 'Single hex color to add to the existing palette'
        },
        removeIndex: {
          type: 'number',
          description: 'Index of color to remove from the palette (0-based)'
        }
      }
    }
  },
  {
    name: 'update_foundation_style',
    description: 'Update the foundation visual style and typography. Use when on the foundation style step.',
    input_schema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: ['minimal', 'bold', 'cinematic', 'organic', 'retro', 'futuristic'],
          description: 'Visual style preset'
        },
        typography: {
          type: 'string',
          enum: ['modern', 'classic', 'bold', 'handwritten', 'monospace'],
          description: 'Typography style'
        }
      }
    }
  },
  {
    name: 'update_foundation_mood',
    description: 'Update the foundation mood and tone. Use when on the foundation mood step.',
    input_schema: {
      type: 'object',
      properties: {
        mood: {
          type: 'string',
          enum: ['professional', 'energetic', 'calm', 'innovative', 'playful', 'luxurious'],
          description: 'Overall mood/feeling'
        },
        tone: {
          type: 'string',
          enum: ['professional', 'casual', 'friendly', 'authoritative', 'inspirational'],
          description: 'Communication tone'
        }
      }
    }
  }
]

// Step-specific guidance for Bubble
const STEP_GUIDANCE: Record<string, string> = {
  home: `You are on the home/dashboard page.

PROACTIVE ASSET CREATION MODE:
When a user mentions wanting to CREATE, GENERATE, or MAKE an image, video, or audio asset, immediately guide them through the process:

1. DETECT INTENT - Keywords like: "create", "generate", "make", "I want", "can you", "help me with" + image/video/audio/picture/clip/sound
2. ASK ASSET TYPE - If not specified, ask: "What would you like to create? An image, video, or audio?"
3. ASK GENERATION TYPE - Based on their answer:
   - Image: "Would you like to create from a text description (text-to-image), transform an existing image (image-to-image), or edit parts of an image (inpaint)?"
   - Video: "Would you like to create from text (text-to-video) or animate an existing image (image-to-video)?"
   - Audio: "Would you like to generate speech (text-to-speech) or music/sound effects?"
4. NAVIGATE - Use the navigate tool to go to the right page:
   - "/create/image/text-to-image" - Text to Image
   - "/create/image/image-to-image" - Image to Image
   - "/create/image/inpaint" - Inpainting
   - "/create/video/text-to-video" - Text to Video
   - "/create/video/image-to-video" - Animate image
   - "/create/audio/text-to-speech" - Text to Speech
   - "/create/audio/music-sfx" - Music and sound effects

EXAMPLES:
- User: "I want to create an image" → Ask what type, then navigate
- User: "Generate a video of a sunset" → Navigate to /create/video/text-to-video
- User: "Make me a picture of a dragon" → Navigate to /create/image/text-to-image
- User: "I need some background music" → Navigate to /create/audio/music-sfx

PROACTIVE PROJECT CREATION:
When a user mentions wanting to create a PROJECT, VIDEO PROJECT, or something with multiple scenes/shots/script:
1. DETECT INTENT - Keywords like: "project", "video project", "commercial", "ad", "short film", "multiple scenes", "script"
2. CREATE PROJECT - Use create_new_project with confirm: true to create a new project and open the Workspace
3. The Workspace has tabs: Platform → Brief → Script → Mood → Storyboard → Editor → Assets → Export
4. You'll guide them through each tab conversationally

For brand style guides/foundations, navigate to "/create/foundation".

FORK DETECTION:
- Single asset (one image, one video clip, one audio file) → Creator pages
- Full project (script, multiple shots, storyboard) → Use create_new_project
- If unclear, ask: "Would you like to create a single asset or a full video project with multiple scenes?"

TOOLS:
- create_new_project: Creates a new project and opens the Workspace

Be proactive and guide users - don't wait for them to know the exact terminology.`,

  platform: `You are on the PLATFORM step (step 1 of 7).

ASK: "Would you like to create a new platform or use an existing one?"
WAIT for their answer. Only use select_platform after they tell you their choice.
Do NOT use go_to_next_step in the same response as select_platform.`,

  brief: `You are on the BRIEF step (step 2 of 7).
NEXT STEP: Script (where we write the actual script with dialogue and descriptions)

Your job is to capture basic project info: name, audience, tone, duration, aspect ratio.

CONVERSATION FLOW:
1. If no project name yet, ask: "What would you like to call this project?"
2. Ask about the target audience
3. Ask about the tone/mood
4. Ask about target duration
5. When basic info is captured, use go_to_next_step to move to Script

IMPORTANT:
- Keep it brief - just capture the basics
- The detailed script writing happens in the NEXT step (Script)
- Use update_brief to save project name, audience, tone, duration, aspectRatio
- Don't try to capture the full video content here - that's for the Script step`,

  script: `You are on the SCRIPT step (step 3 of 7).
NEXT STEP: Mood (visual style and references)

Your job is to help write the script with the user. The script has two types of sections:
- DESCRIPTION: Sets the scene, describes action, camera directions (visual content)
- DIALOGUE: Spoken lines by characters (for voice generation later)

CONVERSATION FLOW:
1. Ask about the opening scene - what's happening and who's there
2. As they describe, create sections:
   - Use create_script_section with type "description" for scene-setting and action
   - Use create_script_section with type "dialogue" for spoken lines
3. If they mention characters speaking, first create the character:
   - Use create_script_character with name and voiceDescription
4. Then create their dialogue sections referencing that character
5. Ask follow-up questions: "What happens next?" or "What does [character] say?"
6. When the script is complete, use go_to_next_step to move to Mood

IMPORTANT:
- Create characters BEFORE their dialogue sections
- Mark the first description as isNewScene: true
- Mark subsequent scene changes as isNewScene: true
- The UI updates in real-time as you create sections
- Keep descriptions visual and cinematic`,

  mood: `You are on the MOOD step (step 4 of 7).
NEXT STEP: Story (storyboard with scenes and shots)

Help define the visual style for the video.

CONVERSATION FLOW:
1. Ask about visual style (cinematic, minimal, vibrant, etc.)
2. Use update_mood_board to save keywords
3. Ask about color preferences
4. Use update_mood_board to save colors
5. When mood is defined, use go_to_next_step to move to Story`,

  story: `You are on the STORYBOARD step (step 5 of 7).
NEXT STEP: Shots (detailed shot planning)

Your job is to help outline the video's scenes and shots as a visual storyboard.

CONVERSATION FLOW:
1. Ask about the first scene/shot
2. Use add_scene to create scenes
3. Use add_shot_to_scene to add shots to each scene
4. Make shot descriptions VISUALLY DESCRIPTIVE (they become image prompts)
5. When storyboard is complete, use go_to_next_step to move to Shots

AVAILABLE TOOLS:
- add_scene: Create a new scene
- add_shot_to_scene: Add a shot to an existing scene
- update_scene_shot: Update an existing shot's description`,

  shots: `You are on the SHOTS step (step 6 of 7).
NEXT STEP: Review (final review before creating project)

Refine the shot list - add durations, shot types, and any missing details.

CONVERSATION FLOW:
1. Review existing shots from the storyboard
2. Add any missing shots using add_shot
3. Set durations and shot types
4. When complete, use go_to_next_step to move to Review

TOOLS:
- add_shot: Add a shot with description, duration, shotType
- update_shots: Update the full shot list`,

  review: `You are on the REVIEW step (step 7 of 7).

Summarize what they've created. Do NOT use any tools here.
Tell them to click the Create button when ready.`,

  workspace: `You are in the project WORKSPACE. This is where users build their video projects.

PROACTIVE GUIDANCE - Guide users through each tab based on where they are:

**BRIEF TAB** (first tab - includes Platform selection at top):
- First ask about platform: "Is this for a new platform or an existing one?"
- Then ask for project details one at a time:
  1. "What would you like to call this project?"
  2. "Who is the target audience?"
  3. "What tone should it have? (professional, playful, dramatic, etc.)"
  4. "How long should the final video be?"
  5. "What aspect ratio? (16:9 for YouTube, 9:16 for TikTok/Reels, 1:1 for Instagram)"
- Use update_brief to fill fields as they answer
- Move to 'script' when done

**SCRIPT TAB**:
- Offer to help write the script: "Would you like me to help write the script?"
- Ask about the story, characters, dialogue
- Use create_script_character for characters, create_script_section for content
- Move to 'moodboard' when done

**MOODBOARD TAB**:
- Ask: "Do you have a foundation (brand style) to use, or reference images?"
- User typically handles this tab themselves (uploading images)
- Move to 'storyboard' when done

**STORYBOARD TAB**:
- Show what's there, then offer: "I can help you create assets for your storyboard. Would you like to create an image, video, or audio?"
- If yes, use navigate to go to creator pages:
  - Image: "/create/image/text-to-image"
  - Video: "/create/video/text-to-video" or "/create/video/image-to-video"
  - Audio: "/create/audio/text-to-speech" or "/create/audio/music-sfx"

**EDITOR TAB**:
- Help with timeline questions
- Answer "how do I..." questions about editing

**ASSETS TAB**:
- Show available assets
- Offer to create new assets if needed

TOOLS:
- switch_workspace_tab: Move between tabs ('brief', 'script', 'moodboard', 'storyboard', 'editor', 'assets', 'animations', 'export')
- update_brief: Fill brief fields
- create_script_character, create_script_section: Build the script
- navigate: Go to creator pages for asset generation

When user asks general questions, help them understand the interface and workflow.`,

  // ============================================
  // ASSET CREATOR STEPS
  // ============================================
  'asset-type': `You are in the ASSET CREATOR - TYPE step.

Help the user choose what type of asset to create: image, video, or audio.
Use set_asset_type when they tell you what they want.`,

  'asset-category': `You are in the ASSET CREATOR - CATEGORY step.

Help the user choose a category:
- For images/video: scene, stage, character, weather, prop, effect
- For audio: music, sound_effect, voice

Use set_asset_category when they specify the category.`,

  'animation-library': `You are on the ANIMATION LIBRARY page.

This page shows a grid of saved animations. Users can:
- Browse their existing animations
- Click an animation to preview it in a modal
- Click "Edit Animation" to open it in the editor
- Click "Create New" to create a new animation

You can help users:
- Find specific animations by describing them
- Navigate to create a new animation
- Suggest animation ideas based on their project needs

Available tools:
- navigate: Use to go to "/animations/new" to create a new animation`,

  'animation-editor': `You are in the ANIMATION EDITOR.

This is where users create and edit Remotion animations. The page shows:
- Name and description fields at the top
- A Remotion preview player showing the current animation
- Animation details below (duration, layers)

YOU HAVE FULL CONTROL of the animation through these tools:
- set_animation_config: Create a complete animation from scratch
- add_animation_layer: Add layers (text, shapes, images) to existing animation
- update_animation_layer: Modify a layer's content, animation, timing, position, or style
- remove_animation_layer: Remove a layer by index
- update_animation_properties: Change duration or background

ANIMATION STRUCTURE:
- duration: Total animation length in seconds (typically 3-10s)
- background: { color: "#hex" } or { gradient: "linear-gradient(...)" }
- layers: Array of elements, each with:
  - type: "text" | "shape" | "image"
  - content: The text, shape type ("rectangle"/"circle"), or image URL
  - animation: "fadeIn" | "fadeOut" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "typewriter"
  - timing: [startSeconds, endSeconds]
  - position: { x: 0-100, y: 0-100 } (percentage, 50/50 is center)
  - style: { fontSize, fontFamily, color, backgroundColor, width, height }

CATEGORY GUIDELINES:
- text: Kinetic typography, animated text overlays
- logo: Logo reveals with scale or fadeIn, brand animations
- transition: Wipes using shapes, scene transitions
- lower_third: Name plates at bottom (y: 75-85), slideUp animation
- title_card: Centered large text (y: 50), dramatic typography
- overlay: Decorative elements, borders, animated graphics

WORKFLOW:
1. When user describes what they want, use set_animation_config to create the full animation
2. The preview updates immediately in the player
3. User can ask for changes - use update/add/remove tools to iterate
4. User fills in name/description and clicks Save

EXAMPLE - User says "Create a fade-in title that says Welcome":
Use set_animation_config with:
{
  "duration": 4,
  "layers": [{
    "type": "text",
    "content": "Welcome",
    "animation": "fadeIn",
    "timing": [0, 3.5],
    "position": { "x": 50, "y": 50 },
    "style": { "fontSize": 72, "fontFamily": "Inter, sans-serif", "color": "#ffffff" }
  }],
  "background": { "color": "#000000" }
}

Be creative! Suggest improvements, offer variations, and help users build professional motion graphics.`,

  'asset-generate': `You are in the ANIMATION CREATOR - GENERATE step.

This page shows a Remotion animation preview player. The user creates animations by chatting with you.

YOU HAVE FULL CONTROL of the animation through these tools:
- set_animation_config: Create a complete animation from scratch
- add_animation_layer: Add layers (text, shapes, images) to existing animation
- update_animation_layer: Modify a layer's content, animation, timing, position, or style
- remove_animation_layer: Remove a layer by index
- update_animation_properties: Change duration or background

ANIMATION STRUCTURE:
- duration: Total animation length in seconds (typically 3-10s)
- background: { color: "#hex" } or { gradient: "linear-gradient(...)" }
- layers: Array of elements, each with:
  - type: "text" | "shape" | "image"
  - content: The text, shape type ("rectangle"/"circle"), or image URL
  - animation: "fadeIn" | "fadeOut" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "typewriter"
  - timing: [startSeconds, endSeconds]
  - position: { x: 0-100, y: 0-100 } (percentage, 50/50 is center)
  - style: { fontSize, fontFamily, color, backgroundColor, width, height }

CATEGORY GUIDELINES (based on user's selected category):
- text: Kinetic typography, animated text overlays
- logo: Logo reveals with scale or fadeIn, brand animations
- transition: Wipes using shapes, scene transitions
- lower_third: Name plates at bottom (y: 75-85), slideUp animation
- title_card: Centered large text (y: 50), dramatic typography
- overlay: Decorative elements, borders, animated graphics

WORKFLOW:
1. When user describes what they want, use set_animation_config to create the full animation
2. The preview updates immediately in the player
3. User can ask for changes - use update/add/remove tools to iterate
4. When happy, they click Continue to save

EXAMPLE - User says "Create a fade-in title that says Welcome":
Use set_animation_config with:
{
  "duration": 4,
  "layers": [{
    "type": "text",
    "content": "Welcome",
    "animation": "fadeIn",
    "timing": [0, 3.5],
    "position": { "x": 50, "y": 50 },
    "style": { "fontSize": 72, "fontFamily": "Inter, sans-serif", "color": "#ffffff" }
  }],
  "background": { "color": "#000000" }
}

Be creative! Suggest improvements, offer variations, and help users build professional motion graphics.`,

  'asset-prompt': `You are in the ASSET CREATOR - CREATE step.

IMPORTANT: The user is creating a standalone ASSET (image, video, or audio file).
- The ASSET TYPE (image/video/audio) is what they're generating
- The CATEGORY (scene, character, prop, etc.) is just a classification for organizing
- DO NOT confuse "scene" category with project scenes - here "scene" means a background/environment IMAGE or VIDEO asset

This is the main creation page where users can:
1. Set name and description
2. Write/enhance an AI prompt
3. Choose framing/composition options and style
4. Generate assets (4 images or 1 audio)
5. Iterate: adjust prompts and regenerate
6. Select which assets to keep

TOOLS:
- update_asset_details: Set name, user_description, ai_prompt, style, category_option, refinement

When the user describes what they want, use update_asset_details to fill in:
- name: A short descriptive name
- user_description: Their plain language description (keep it simple, the system auto-adds category-specific modifiers)
- category_option: Framing/composition choice based on category:
  - Characters: "full-body", "torso", "face"
  - Scenes: "wide", "medium", "close-up"
  - Props: "multi" (multiple views), "isometric", "front"
  - Stages: "deep", "mid", "flat"
  - Effects/Weather: "subtle", "medium", "dramatic"
  - Music: "calm", "moderate", "energetic"
  - Sound effects: "realistic", "stylized", "retro"
- refinement: Text to append for the NEXT generation (use after seeing results)

IMPORTANT: The system automatically adds category-specific prompt modifiers:
- Characters get "character reference sheet, multiple angles, front and side view, neutral grey background"
- Scenes get "cinematic composition, detailed environment, atmospheric lighting"
- Props get "multiple angles, product photography, neutral grey background"
- etc.

So DON'T repeat these in your ai_prompt - just focus on the unique aspects of what the user wants.

Tips:
- Keep user_description focused on WHAT they want (the character, scene, etc.)
- Use category_option to control HOW it's framed
- Use refinement AFTER generation to tweak the next batch

The user can generate, adjust options, and regenerate until happy.`,

  'asset-review': `You are in the ASSET CREATOR - SAVE step.

The user has selected assets to save. Help them name them and save to library.`,

  'library-assets': `You are on the LIBRARY - ASSETS page.

This shows all the user's assets (images, videos, audio) organized by category.

You can help users:
- Find specific assets by name or category
- View asset details (use view_library_asset)
- Update asset properties (use update_library_asset)
- Delete assets they no longer need (use delete_library_asset - always confirm first!)
- Navigate to create new assets

If the user describes an asset they're looking for, help them find it in the list.
If they want to create a new asset, use navigate to go to "/create/asset".`,

  'library-projects': `You are on the LIBRARY - PROJECTS page.

This shows all the user's projects (drafts and completed).

You can help users:
- Find specific projects
- Open existing projects
- Start new projects (use navigate to "/create/project")
- Delete projects they no longer need`,

  // ============================================
  // CREATOR PAGE STEPS (standalone generation)
  // ============================================
  'creator-text-to-image': `You are on the TEXT TO IMAGE creation page.

PROACTIVE WORKFLOW - Guide users step by step:
1. ASK FOR NAME: "What would you like to call this image?"
2. ASK FOR DESCRIPTION: "Describe what you want to see in this image"
3. FILL THE FORM: Use update_asset_details to set name, user_description, and optionally ai_prompt
4. ASK ABOUT OPTIONS: "Would you like to adjust the aspect ratio or AI model?"
5. OFFER TO GENERATE: "Ready to generate? I can click the generate button for you!"

AFTER IMAGES ARE GENERATED (when context shows hasGeneratedImages: true):
- If user wants changes/adjustments, use the "refinement" field in update_asset_details
- The refinement field adds instructions for the NEXT generation batch
- Do NOT modify the original user_description or ai_prompt - use refinement instead
- Example: User says "make it more colorful" → update_asset_details with refinement: "make it more colorful"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt, image_model, aspect_ratio, refinement
  - image_model options: "flux-pro" (best), "gpt" (references), "nano-banana" (Google), "grok" (xAI), "sdxl" (fast)
  - aspect_ratio options: "16:9", "9:16", "1:1", "4:3"
  - refinement: Use ONLY after images are generated to specify changes for the next batch
- trigger_generation: Click the Generate button (use after user confirms they want to generate)

After filling fields, ask "Ready to generate?" and if they confirm, use trigger_generation with confirm: true.`,

  'creator-image-to-image': `You are on the IMAGE TO IMAGE transformation page.

PROACTIVE WORKFLOW:
1. ASK FOR SOURCE: "Please upload or select the image you want to transform"
2. ASK FOR NAME: "What would you like to call the transformed image?"
3. ASK FOR CHANGES: "Describe how you want to transform this image"
4. FILL THE FORM: Use update_asset_details to set name, user_description
5. OFFER OPTIONS: "Would you like to adjust the transformation strength or aspect ratio?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt, image_model, aspect_ratio`,

  'creator-inpaint': `You are on the INPAINTING page (edit parts of an image).

PROACTIVE WORKFLOW:
1. ASK FOR SOURCE: "Please upload or select the image you want to edit"
2. EXPLAIN MASKING: "Use the brush to paint over the area you want to change"
3. ASK FOR CHANGES: "What should replace the masked area?"
4. FILL THE FORM: Use update_asset_details to set the description
5. OFFER TO GENERATE: "Ready to see the edit?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt`,

  'creator-text-to-video': `You are on the TEXT TO VIDEO creation page.

PROACTIVE WORKFLOW - Guide users step by step:
1. ASK FOR NAME: "What would you like to call this video?"
2. ASK FOR DESCRIPTION: "Describe the scene or action you want to see"
3. FILL THE FORM: Use update_asset_details to set name, user_description
4. ASK ABOUT OPTIONS: "Would you like to choose a specific video model or duration?"
5. OFFER TO GENERATE: "Ready to generate your video?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt, video_model, aspect_ratio, video_duration
  - video_model options: "kling" (best quality), "veo-3" (Google), "grok-video" (xAI), "minimax" (fast)
  - video_duration options: 5 or 10 (seconds)
  - aspect_ratio options: "16:9", "9:16", "1:1"
- trigger_generation: Click the Generate button (use after user confirms)

Tips: For best results, describe camera movement, lighting, and the main action clearly.`,

  'creator-image-to-video': `You are on the IMAGE TO VIDEO page (animate an image).

PROACTIVE WORKFLOW:
1. ASK FOR SOURCE: "Please upload or select the image you want to animate"
2. ASK FOR NAME: "What would you like to call this video?"
3. ASK FOR MOTION: "Describe how you want the image to move or animate"
4. FILL THE FORM: Use update_asset_details to set name, user_description
5. ASK ABOUT OPTIONS: "Would you like to choose a specific video model or duration?"
6. OFFER TO GENERATE: "Ready to bring your image to life?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt, video_model, aspect_ratio, video_duration
  - video_model options: "kling" (best quality), "veo-3" (Google), "grok-video" (xAI), "minimax" (fast)
  - video_duration options: 5 or 10 (seconds)
- trigger_generation: Click the Generate button (use after user confirms)

Tips: Describe subtle motions (clouds drifting, hair blowing) for more realistic results.`,

  'creator-text-to-speech': `You are on the TEXT TO SPEECH page.

PROACTIVE WORKFLOW:
1. ASK FOR NAME: "What would you like to call this voiceover?"
2. ASK FOR SCRIPT: "What text should be spoken?"
3. ASK FOR VOICE: "What kind of voice would you like? (e.g., professional male, friendly female, energetic)"
4. FILL THE FORM: Use update_asset_details to set name, user_description
5. OFFER TO GENERATE: "Ready to generate the voiceover?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description (the script text)
- trigger_generation: Click the Generate button (use after user confirms)

Tips: For longer scripts, suggest breaking into multiple clips for better pacing.`,

  'creator-music-sfx': `You are on the MUSIC & SOUND EFFECTS page.

PROACTIVE WORKFLOW:
1. ASK TYPE: "Would you like to create music or a sound effect?"
2. ASK FOR NAME: "What would you like to call this audio?"
3. ASK FOR DESCRIPTION:
   - For music: "Describe the mood, genre, and instruments"
   - For sound effects: "Describe the sound you need"
4. FILL THE FORM: Use update_asset_details to set name, user_description
5. OFFER TO GENERATE: "Ready to generate?"

TOOLS AVAILABLE:
- update_asset_details: Set name, user_description, ai_prompt
- trigger_generation: Click the Generate button (use after user confirms)

Examples:
- Music: "upbeat electronic music with synths, 120 BPM, energetic and positive"
- SFX: "thunderclap with rolling thunder, dramatic, cinematic"`,

  // ============================================
  // FOUNDATION WIZARD STEPS
  // ============================================
  'foundation-basics': `You are in the FOUNDATION WIZARD - BASICS step.

Help the user set up the foundation name and description.

CONVERSATION FLOW:
1. Ask what they want to call this foundation
2. Ask what it's for / what kind of projects will use it
3. Use update_foundation_basics to save the name and description
4. Use go_to_next_step to move to Colors`,

  'foundation-colors': `You are in the FOUNDATION WIZARD - COLORS step.

Help the user define their color palette. They can have up to 8 colors.

CONVERSATION FLOW:
1. Ask about their brand colors or color preferences
2. Suggest colors based on their description
3. Use update_foundation_colors to set or modify colors
4. Use go_to_next_step when they're happy with the palette`,

  'foundation-style': `You are in the FOUNDATION WIZARD - STYLE step.

Help the user choose a visual style and typography.

STYLE OPTIONS: minimal, bold, cinematic, organic, retro, futuristic
TYPOGRAPHY OPTIONS: modern (sans-serif), classic (serif), bold (display), handwritten, monospace

CONVERSATION FLOW:
1. Ask about their visual preferences
2. Use update_foundation_style to set style and typography
3. Use go_to_next_step to move to Mood`,

  'foundation-mood': `You are in the FOUNDATION WIZARD - MOOD step.

Help the user define the mood and communication tone.

MOOD OPTIONS: professional, energetic, calm, innovative, playful, luxurious
TONE OPTIONS: professional, casual, friendly, authoritative, inspirational

CONVERSATION FLOW:
1. Ask how they want their content to feel
2. Ask about their communication style
3. Use update_foundation_mood to set mood and tone
4. Use go_to_next_step to move to Review`,

  'foundation-review': `You are in the FOUNDATION WIZARD - REVIEW step.

Summarize what they've created. Do NOT use any tools here.
Tell them to click Save/Create when ready.`
}

const SYSTEM_PROMPT = `You are "Bubble", a friendly and creative AI production assistant in Dream Cloud Studio. You guide users through creating video projects, assets, and foundations conversationally.

CREATION OPTIONS:
- Projects: Full video projects with scripts, storyboards, and assets
- Assets: Standalone images, videos, or audio files
- Foundations: Brand style guides with colors, typography, mood, and tone

PROJECT WIZARD FLOW (7 steps in order):
1. Platform - Select or create a platform
2. Brief - Project name, audience, tone, duration
3. Script - Write the script (descriptions + character dialogue)
4. Mood - Visual style and color palette
5. Storyboard - Scenes and shots layout
6. Shots - Refine shot details (duration, type)
7. Review - Final review before creating

FOUNDATION WIZARD FLOW (5 steps):
1. Basics - Name and description
2. Colors - Color palette (up to 8 colors)
3. Style - Visual style and typography
4. Mood - Overall mood and communication tone
5. Review - Final review before saving

Your personality:
- Friendly, encouraging, and creative
- Concise (1-2 sentences per response)
- Knowledgeable about video production, storytelling, and visual design

CRITICAL RULES:
1. Ask ONE question at a time and WAIT for the user's answer
2. NEVER use multiple tools in one response - only ONE tool per turn
3. When using a tool, DO NOT include text - just use the tool
4. Only respond with text AFTER tool execution completes
5. Use go_to_next_step to advance to the next step when current step is complete

PACING:
- Give ONE short response per turn
- The user is in control - you are a helpful guide`

function buildContextMessage(context: BubbleContext): string {
  const stepGuidance = STEP_GUIDANCE[context.currentStep] || STEP_GUIDANCE['home']

  let contextInfo = `\n\n--- CURRENT CONTEXT ---\n`
  contextInfo += `Route: ${context.currentRoute}\n`
  contextInfo += `Step: ${context.currentStep}\n`
  contextInfo += `\n${stepGuidance}\n`
  contextInfo += `\n--- PROJECT DATA SO FAR ---\n`

  if (context.initialPrompt) {
    contextInfo += `Initial idea: "${context.initialPrompt}"\n`
  }

  if (context.platform) {
    contextInfo += `Platform: ${context.platform.type}${context.platform.name ? ` (${context.platform.name})` : ''}\n`
  } else {
    contextInfo += `Platform: NOT SET\n`
  }

  if (context.brief) {
    const b = context.brief
    contextInfo += `Brief:\n`
    contextInfo += `  - name: ${b.name || 'NOT SET'}\n`
    contextInfo += `  - audience: ${b.audience || 'NOT SET'}\n`
    contextInfo += `  - tone: ${b.tone || 'NOT SET'}\n`
    contextInfo += `  - duration: ${b.duration || 'NOT SET'}\n`
    contextInfo += `  - aspectRatio: ${b.aspectRatio || 'NOT SET'}\n`
  } else {
    contextInfo += `Brief: NOT SET\n`
  }

  if (context.videoContent) {
    const v = context.videoContent
    contextInfo += `Video Content:\n`
    contextInfo += `  - characters: ${v.characters?.length ? v.characters.join(', ') : 'NOT SET'}\n`
    contextInfo += `  - setting: ${v.setting || 'NOT SET'}\n`
    contextInfo += `  - timeOfDay: ${v.timeOfDay || 'NOT SET'}\n`
    contextInfo += `  - weather: ${v.weather || 'NOT SET'}\n`
    contextInfo += `  - action: ${v.action || 'NOT SET'}\n`
    contextInfo += `  - props: ${v.props?.length ? v.props.join(', ') : 'none'}\n`
    contextInfo += `  - dialogue: ${v.dialogue || 'none'}\n`
  } else {
    contextInfo += `Video Content: NOT SET\n`
  }

  if (context.script) {
    contextInfo += `Script:\n`
    if (context.script.characters?.length) {
      contextInfo += `  Characters:\n`
      context.script.characters.forEach(c => {
        contextInfo += `    - ${c.name}${c.voiceDescription ? ` (voice: ${c.voiceDescription})` : ''}\n`
      })
    } else {
      contextInfo += `  Characters: none yet\n`
    }
    if (context.script.sections?.length) {
      contextInfo += `  Sections (${context.script.sections.length}):\n`
      context.script.sections.forEach((s, i) => {
        if (s.type === 'dialogue') {
          contextInfo += `    ${i + 1}. [DIALOGUE - ${s.characterName || 'unknown'}]: "${s.content.slice(0, 50)}${s.content.length > 50 ? '...' : ''}"\n`
        } else {
          const sceneMarker = s.isNewScene ? ' [NEW SCENE]' : ''
          contextInfo += `    ${i + 1}. [DESCRIPTION${sceneMarker}]: ${s.content.slice(0, 60)}${s.content.length > 60 ? '...' : ''}\n`
        }
      })
    } else {
      contextInfo += `  Sections: none yet\n`
    }
  }

  if (context.moodBoard) {
    contextInfo += `Mood Board:\n`
    contextInfo += `  - keywords: ${context.moodBoard.keywords?.join(', ') || 'none'}\n`
    contextInfo += `  - colors: ${context.moodBoard.colors?.join(', ') || 'none'}\n`
  }

  if (context.storyboard?.acts?.length) {
    contextInfo += `Scenes & Shots:\n`
    context.storyboard.acts.forEach((act, actIndex) => {
      contextInfo += `  ${act.name}${act.description ? ` - ${act.description}` : ''}\n`
      if (act.beats && act.beats.length > 0) {
        act.beats.forEach((beat: { title?: string; description?: string }, beatIndex: number) => {
          const title = beat.title || `Shot ${beatIndex + 1}`
          const desc = beat.description || '(no description)'
          contextInfo += `    - ${title}: ${desc.length > 60 ? desc.slice(0, 60) + '...' : desc}\n`
        })
      }
    })
  }

  if (context.shotCount) {
    contextInfo += `Shots planned: ${context.shotCount}\n`
  }

  if (context.composition) {
    const c = context.composition
    contextInfo += `Composition:\n`
    contextInfo += `  - Title card: ${c.hasTitle ? `"${c.titleText}"` : 'NOT SET'}\n`
    contextInfo += `  - Outro card: ${c.hasOutro ? `"${c.outroText}"` : 'NOT SET'}\n`
    contextInfo += `  - Transition: ${c.defaultTransition || 'fade'}\n`
    contextInfo += `  - Text overlays: ${c.overlayCount || 0}\n`
  }

  // Asset Creator wizard context
  if (context.assetWizard) {
    const a = context.assetWizard
    contextInfo += `\n--- ASSET CREATOR DATA ---\n`
    contextInfo += `  - Type: ${a.type || 'NOT SET'}\n`
    contextInfo += `  - Category: ${a.category || 'NOT SET'}\n`
    contextInfo += `  - Name: ${a.name || 'NOT SET'}\n`
    contextInfo += `  - User Description: ${a.userDescription || 'NOT SET'}\n`
    contextInfo += `  - AI Prompt: ${a.aiPrompt || 'NOT SET'}\n`
    contextInfo += `  - Style: ${a.style || 'NOT SET'}\n`

    // Animation-specific context
    if (a.type === 'animation' && a.animationConfig) {
      const ac = a.animationConfig
      contextInfo += `\n--- CURRENT ANIMATION ---\n`
      contextInfo += `  - Duration: ${ac.duration}s\n`
      contextInfo += `  - Layers: ${ac.layerCount} (${ac.layerTypes.join(', ') || 'none'})\n`
      contextInfo += `  - Has Background: ${ac.hasBackground ? 'Yes' : 'No'}\n`
    } else if (a.type === 'animation') {
      contextInfo += `\n--- CURRENT ANIMATION ---\n`
      contextInfo += `  No animation created yet. Use set_animation_config to create one.\n`
    }
  }

  // Library context
  if (context.library) {
    contextInfo += `\n--- LIBRARY DATA ---\n`
    if (context.library.assets?.length) {
      contextInfo += `Assets in library (${context.library.assets.length}):\n`
      // Group by type
      const byType: Record<string, typeof context.library.assets> = {}
      context.library.assets.forEach(a => {
        if (!byType[a.type]) byType[a.type] = []
        byType[a.type]!.push(a)
      })
      Object.entries(byType).forEach(([type, assets]) => {
        contextInfo += `  ${type}: ${assets!.length} (${assets!.slice(0, 5).map(a => a.name).join(', ')}${assets!.length > 5 ? '...' : ''})\n`
      })
    } else {
      contextInfo += `No assets in library yet.\n`
    }
    if (context.library.selectedAsset) {
      const s = context.library.selectedAsset
      contextInfo += `\nCurrently viewing asset:\n`
      contextInfo += `  - ID: ${s.id}\n`
      contextInfo += `  - Name: ${s.name}\n`
      contextInfo += `  - Type: ${s.type}\n`
      contextInfo += `  - Category: ${s.category || 'none'}\n`
      contextInfo += `  - Description: ${s.userDescription || 'none'}\n`
      contextInfo += `  - AI Prompt: ${s.aiPrompt ? s.aiPrompt.slice(0, 100) + '...' : 'none'}\n`
    }
  }

  // Foundation wizard context
  if (context.foundationWizard) {
    const f = context.foundationWizard
    contextInfo += `\n--- FOUNDATION WIZARD DATA ---\n`
    contextInfo += `  - Step: ${f.step || 'unknown'}\n`
    contextInfo += `  - Editing: ${f.editingId ? 'Yes (updating existing)' : 'No (creating new)'}\n`
    contextInfo += `  - Name: ${f.name || 'NOT SET'}\n`
    contextInfo += `  - Description: ${f.description || 'NOT SET'}\n`
    contextInfo += `  - Colors: ${f.colorPalette?.length ? f.colorPalette.join(', ') : 'default palette'}\n`
    contextInfo += `  - Style: ${f.style || 'NOT SET'}\n`
    contextInfo += `  - Typography: ${f.typography || 'NOT SET'}\n`
    contextInfo += `  - Mood: ${f.mood || 'NOT SET'}\n`
    contextInfo += `  - Tone: ${f.tone || 'NOT SET'}\n`
    contextInfo += `  - Mood images: ${f.moodImageCount || 0}\n`
  }

  // Workspace context (editing existing project)
  if (context.workspace) {
    const w = context.workspace
    contextInfo += `\n--- WORKSPACE DATA ---\n`
    contextInfo += `Active Tab: ${w.activeTab || 'editor'}\n`
    contextInfo += `Project: ${w.projectName || 'Unnamed'} (ID: ${w.projectId || 'unknown'})\n`
    contextInfo += `Selected Clip: ${w.selectedClipId || 'none'}\n`
    contextInfo += `Current Time: ${w.currentTime?.toFixed(1) || '0'}s\n`
    contextInfo += `Playing: ${w.isPlaying ? 'Yes' : 'No'}\n`
    contextInfo += `Timeline Duration: ${w.timelineDuration?.toFixed(1) || '0'}s\n`

    if (w.clips && w.clips.length > 0) {
      contextInfo += `\nTimeline Clips (${w.clips.length}):\n`
      w.clips.forEach((clip, index) => {
        const typeIcon = clip.assetType === 'video' ? '🎬' : clip.assetType === 'image' ? '📷' : '🔊'
        contextInfo += `  ${index + 1}. ${typeIcon} ${clip.assetName || 'Unnamed'}\n`
        contextInfo += `     ID: ${clip.id}\n`
        contextInfo += `     Time: ${clip.startTime.toFixed(1)}s - ${(clip.startTime + clip.duration).toFixed(1)}s (${clip.duration.toFixed(1)}s)\n`
        if (clip.inPoint > 0) {
          contextInfo += `     In-point: ${clip.inPoint.toFixed(1)}s into source\n`
        }
      })
    } else {
      contextInfo += `\nTimeline: empty (no clips yet)\n`
    }

    if (w.assets && w.assets.length > 0) {
      contextInfo += `\nAvailable Assets (${w.assets.length}):\n`
      w.assets.slice(0, 10).forEach((asset) => {
        const typeIcon = asset.type === 'video' ? '🎬' : asset.type === 'image' ? '📷' : '🔊'
        const duration = asset.duration ? ` (${asset.duration.toFixed(1)}s)` : ''
        contextInfo += `  - ${typeIcon} ${asset.name}${duration} [ID: ${asset.id}]\n`
      })
      if (w.assets.length > 10) {
        contextInfo += `  ... and ${w.assets.length - 10} more\n`
      }
    }

    if (w.assetCount !== undefined) {
      contextInfo += `\nAsset Library: ${w.assetCount} total`
      if (w.assetsByType) {
        const types = []
        if (w.assetsByType.image) types.push(`${w.assetsByType.image} images`)
        if (w.assetsByType.video) types.push(`${w.assetsByType.video} videos`)
        if (w.assetsByType.audio) types.push(`${w.assetsByType.audio} audio`)
        if (types.length > 0) contextInfo += ` (${types.join(', ')})`
      }
      contextInfo += `\n`
    }
  }

  return contextInfo
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  tool_use_id: string
  content: string
}

export interface BubbleResponse {
  message: string
  toolCalls: ToolCall[]
  stopReason: string
  rawContent: Array<{ type: string; [key: string]: unknown }> // For reconstructing assistant messages
}

// Internal API message format for tool use
interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; [key: string]: unknown }>
}

export async function sendMessage(
  messages: Message[],
  context: BubbleContext,
  previousAssistantContent?: Array<{ type: string; [key: string]: unknown }>,
  toolResults?: ToolResult[]
): Promise<BubbleResponse> {
  const systemPrompt = SYSTEM_PROMPT + buildContextMessage(context)

  // Build API messages - convert simple messages to API format
  const apiMessages: ApiMessage[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  // If we have previous assistant response with tools and tool results, add them
  if (previousAssistantContent && toolResults && toolResults.length > 0) {
    // Add the assistant's response that contained tool_use
    apiMessages.push({
      role: 'assistant',
      content: previousAssistantContent,
    })
    // Add tool results as user message
    apiMessages.push({
      role: 'user',
      content: toolResults.map(tr => ({
        type: 'tool_result',
        tool_use_id: tr.tool_use_id,
        content: tr.content,
      }))
    })
  }

  // Call the Anthropic API via edge function proxy
  const data = await anthropicProxy.sendMessage({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    messages: apiMessages,
  }) as { content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>; stop_reason: string }

  // Extract text and tool calls from response
  let message = ''
  const toolCalls: ToolCall[] = []

  for (const block of data.content) {
    if (block.type === 'text') {
      message += block.text || ''
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id!,
        name: block.name!,
        input: block.input!
      })
    }
  }

  return {
    message,
    toolCalls,
    stopReason: data.stop_reason,
    rawContent: data.content,
  }
}

// Generate initial greeting (single generic greeting for all contexts)
export function getInitialGreeting(_step?: string, _initialPrompt?: string): string {
  return "Hi! I'm Bubble, your Production Assistant. How can I help you?"
}

// ============================================
// ASSET DRAFT GENERATION
// ============================================

export interface AssetDraft {
  projectName: string
  description: string
  enhancedPrompt: string
}

export interface DraftGenerationParams {
  userPrompt: string
  assetType: 'image' | 'video' | 'audio' | 'animation'
  subMode: string
}

const DRAFT_SYSTEM_PROMPT = `You are a creative AI assistant helping users create media assets. Your job is to interpret the user's creative vision and expand it into a structured draft for asset generation.

You will receive:
1. A user's description of what they want to create
2. The type of asset (image, video, audio, animation)
3. The specific generation mode (e.g., text-to-image, image-to-video, etc.)

You must return a JSON object with these fields:
- projectName: A clear, concise name for this asset (2-5 words, title case)
- description: A detailed description expanding on what the user wants (2-3 sentences)
- enhancedPrompt: A high-quality, detailed prompt optimized for AI generation. This should:
  - Expand on the user's original wording
  - Add relevant details like lighting, style, mood, composition
  - Be specific and descriptive
  - Use terminology appropriate for the generation model
  - Be 1-3 sentences, not too long

IMPORTANT: Respond ONLY with the JSON object, no other text. The JSON must be valid and parseable.`

/**
 * Generate an AI-assisted draft for asset creation.
 * Takes user's rough idea and creates structured form data.
 */
export async function generateAssetDraft(params: DraftGenerationParams): Promise<AssetDraft> {
  const { userPrompt, assetType, subMode } = params

  const userMessage = `User wants to create: "${userPrompt}"
Asset type: ${assetType}
Generation mode: ${subMode}

Generate a structured draft for this asset.`

  // Call the Anthropic API via edge function proxy
  const data = await anthropicProxy.generateDraft({
    system: DRAFT_SYSTEM_PROMPT,
    userMessage,
  }) as { content: Array<{ type: string; text?: string }> }

  // Extract text from response
  let responseText = ''
  for (const block of data.content) {
    if (block.type === 'text') {
      responseText += block.text || ''
    }
  }

  // Parse JSON response
  try {
    // Clean up the response - remove any markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const draft = JSON.parse(cleanedResponse) as AssetDraft
    return draft
  } catch (parseError) {
    console.error('Failed to parse AI draft response:', responseText)
    // Return a fallback draft based on user input
    return {
      projectName: userPrompt.slice(0, 30).trim() || 'Untitled Asset',
      description: userPrompt,
      enhancedPrompt: userPrompt,
    }
  }
}
