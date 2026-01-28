// Claude API service for Dream Cloud Studio
// This powers the "Bubble" AI assistant in the project wizard

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

if (!ANTHROPIC_API_KEY) {
  console.warn('Missing VITE_ANTHROPIC_API_KEY - Claude features will not work')
}

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
    type?: 'image' | 'video' | 'audio'
    category?: string
    name?: string
    userDescription?: string
    aiPrompt?: string
    style?: string
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
    selectedSceneId?: string | null
    selectedShotId?: string | null
    isPlaying?: boolean
    scenes?: Array<{
      id: string
      name: string
      description?: string
      shotCount: number
      shots?: Array<{
        id: string
        name: string
        description?: string
        duration: number
        hasImage?: boolean
        hasVideo?: boolean
        hasAudio?: boolean
      }>
    }>
    assetCount?: number
    assetsByType?: {
      image?: number
      video?: number
      audio?: number
    }
  }
}

// Tool definitions for Bubble's actions
const TOOLS = [
  {
    name: 'navigate',
    description: 'Navigate to a specific page or route in the application',
    input_schema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          description: 'The route to navigate to. Options: "/create/project" (start new project wizard), "/create/asset" (create standalone asset), "/create/foundation" (create new foundation/brand style guide), "/" (home/dashboard)'
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
    description: 'Update the asset details in the Asset Creator wizard. Use to set the name, description, and AI prompt for the asset being created.',
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
        }
      }
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
          enum: ['platform', 'brief', 'script', 'moodboard', 'storyboard', 'editor', 'scenes', 'assets', 'export'],
          description: 'The tab to switch to: platform (platform settings), brief (project info), script (script editor), moodboard (visual references), storyboard (story cards), editor (timeline editor), scenes (scene manager), assets (asset library), export (export settings)'
        }
      },
      required: ['tab']
    }
  },
  {
    name: 'workspace_select_scene',
    description: 'Select a scene in the workspace editor. Use to focus on a specific scene for editing or viewing.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene to select'
        },
        scene_name: {
          type: 'string',
          description: 'The name of the scene to select (alternative to scene_id)'
        }
      }
    }
  },
  {
    name: 'workspace_select_shot',
    description: 'Select a specific shot in the workspace editor. Use to focus on a shot for editing.',
    input_schema: {
      type: 'object',
      properties: {
        shot_id: {
          type: 'string',
          description: 'The ID of the shot to select'
        }
      },
      required: ['shot_id']
    }
  },
  {
    name: 'workspace_add_scene',
    description: 'Add a new scene to the project in workspace mode.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the new scene (e.g., "Opening Scene", "Scene 2")'
        },
        description: {
          type: 'string',
          description: 'Description of what happens in this scene'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'workspace_add_shot',
    description: 'Add a new shot to a scene in workspace mode.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene to add the shot to'
        },
        scene_name: {
          type: 'string',
          description: 'The name of the scene to add the shot to (alternative to scene_id)'
        },
        name: {
          type: 'string',
          description: 'Name/title for the shot'
        },
        description: {
          type: 'string',
          description: 'Visual description of the shot - this becomes the image generation prompt'
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (default 3)'
        }
      },
      required: ['description']
    }
  },
  {
    name: 'workspace_update_shot',
    description: 'Update an existing shot in workspace mode.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene containing the shot'
        },
        shot_id: {
          type: 'string',
          description: 'The ID of the shot to update'
        },
        name: {
          type: 'string',
          description: 'New name for the shot'
        },
        description: {
          type: 'string',
          description: 'New visual description for the shot'
        },
        duration: {
          type: 'number',
          description: 'New duration in seconds'
        },
        notes: {
          type: 'string',
          description: 'Notes for this shot'
        }
      },
      required: ['scene_id', 'shot_id']
    }
  },
  {
    name: 'workspace_delete_shot',
    description: 'Delete a shot from a scene in workspace mode. Always confirm with the user before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene containing the shot'
        },
        shot_id: {
          type: 'string',
          description: 'The ID of the shot to delete'
        }
      },
      required: ['scene_id', 'shot_id']
    }
  },
  {
    name: 'workspace_delete_scene',
    description: 'Delete a scene and all its shots from the project. Always confirm with the user before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene to delete'
        }
      },
      required: ['scene_id']
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
    name: 'workspace_start_asset_creation',
    description: 'Navigate to the asset creation wizard within the workspace. Use when the user wants to generate new images, videos, or audio.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'workspace_link_asset_to_shot',
    description: 'Link an existing asset to a shot. Use to assign images, videos, or audio to shots.',
    input_schema: {
      type: 'object',
      properties: {
        shot_id: {
          type: 'string',
          description: 'The ID of the shot to link the asset to'
        },
        scene_id: {
          type: 'string',
          description: 'The ID of the scene containing the shot'
        },
        asset_id: {
          type: 'string',
          description: 'The ID of the asset to link'
        },
        asset_type: {
          type: 'string',
          enum: ['image', 'video', 'audio'],
          description: 'The type of asset being linked'
        }
      },
      required: ['shot_id', 'scene_id', 'asset_id', 'asset_type']
    }
  },
  {
    name: 'workspace_reorder_scenes',
    description: 'Reorder scenes in the project.',
    input_schema: {
      type: 'object',
      properties: {
        scene_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of scene IDs in the new order'
        }
      },
      required: ['scene_ids']
    }
  },
  {
    name: 'workspace_reorder_shots',
    description: 'Reorder shots within a scene.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene containing the shots'
        },
        shot_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of shot IDs in the new order'
        }
      },
      required: ['scene_id', 'shot_ids']
    }
  },
  {
    name: 'workspace_update_scene',
    description: 'Update an existing scene in workspace mode. Use to change scene name or description.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description: 'The ID of the scene to update'
        },
        name: {
          type: 'string',
          description: 'New name for the scene'
        },
        description: {
          type: 'string',
          description: 'New description for the scene'
        }
      },
      required: ['scene_id']
    }
  },
  {
    name: 'workspace_unlink_asset_from_shot',
    description: 'Remove/unlink an asset from a shot. Use to remove an image, video, or audio from a shot.',
    input_schema: {
      type: 'object',
      properties: {
        shot_id: {
          type: 'string',
          description: 'The ID of the shot to unlink the asset from'
        },
        scene_id: {
          type: 'string',
          description: 'The ID of the scene containing the shot'
        },
        asset_type: {
          type: 'string',
          enum: ['image', 'video', 'audio'],
          description: 'The type of asset to unlink'
        }
      },
      required: ['shot_id', 'scene_id', 'asset_type']
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

If the user describes a video idea, ask "Would you like to start a new project for this?" and WAIT for their response.
If the user wants to create a foundation (brand style guide, visual identity), navigate to "/create/foundation".
If the user wants to create an asset (image, video, audio), navigate to "/create/asset".
Only use the navigate tool AFTER they confirm they want to start.`,

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

  workspace: `You are in an existing project WORKSPACE - editing a saved project.

The workspace has multiple tabs you can navigate to:
- platform: Platform/channel settings
- brief: Project info (name, audience, tone, duration)
- script: Script editor with characters and dialogue
- moodboard: Visual style references and colors
- storyboard: Story cards and narrative structure
- editor: Timeline editor with scenes/shots preview
- scenes: Scene manager - detailed view of all scenes and shots
- assets: Asset library - images, videos, audio for this project
- export: Export settings (resolution, format, quality)

WORKSPACE TOOLS AVAILABLE:
- switch_workspace_tab: Navigate between tabs
- workspace_select_scene/workspace_select_shot: Select items for editing
- workspace_add_scene/workspace_add_shot: Create new scenes/shots
- workspace_update_scene: Update scene name/description
- workspace_update_shot: Update shot details (name, description, duration, notes)
- workspace_delete_scene/workspace_delete_shot: Remove items (confirm first!)
- workspace_play_preview: Control video playback
- workspace_start_asset_creation: Launch asset generator
- workspace_link_asset_to_shot: Assign assets to shots
- workspace_unlink_asset_from_shot: Remove asset from shot
- workspace_reorder_scenes/workspace_reorder_shots: Rearrange order
- workspace_update_export_settings: Change resolution, format, frameRate, quality
- workspace_add_storyboard_card: Add story cards
- workspace_update_storyboard_card: Edit story cards
- workspace_delete_storyboard_card: Remove story cards

ALSO AVAILABLE (from project wizard):
- update_brief, update_mood_board, update_video_content
- set_title_card, set_outro_card, set_transition, add_text_overlay
- generate_image, generate_voiceover, generate_music, generate_sound_effect

Ask what the user would like to work on. Common tasks:
- "Add a new scene" -> workspace_add_scene
- "Add a shot to Scene 1" -> workspace_add_shot
- "Update the scene name" -> workspace_update_scene
- "Go to assets" -> switch_workspace_tab to 'assets'
- "Generate an image for this shot" -> workspace_start_asset_creation
- "Update the shot description" -> workspace_update_shot
- "Change the project name" -> update_brief
- "Remove the image from this shot" -> workspace_unlink_asset_from_shot
- "Set export to 4K" -> workspace_update_export_settings`,

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
    contextInfo += `Selected Scene: ${w.selectedSceneId || 'none'}\n`
    contextInfo += `Selected Shot: ${w.selectedShotId || 'none'}\n`
    contextInfo += `Playing: ${w.isPlaying ? 'Yes' : 'No'}\n`

    if (w.scenes && w.scenes.length > 0) {
      contextInfo += `\nScenes (${w.scenes.length}):\n`
      w.scenes.forEach((scene, index) => {
        contextInfo += `  ${index + 1}. ${scene.name} (ID: ${scene.id}) - ${scene.shotCount} shots\n`
        if (scene.description) {
          contextInfo += `     Description: ${scene.description.slice(0, 60)}${scene.description.length > 60 ? '...' : ''}\n`
        }
        if (scene.shots && scene.shots.length > 0) {
          scene.shots.forEach((shot, shotIndex) => {
            const mediaIndicators = [
              shot.hasImage ? '📷' : '',
              shot.hasVideo ? '🎬' : '',
              shot.hasAudio ? '🔊' : ''
            ].filter(Boolean).join('') || '(no media)'
            contextInfo += `     - Shot ${shotIndex + 1}: ${shot.name} (${shot.duration}s) ${mediaIndicators}\n`
            if (shot.description) {
              contextInfo += `       ${shot.description.slice(0, 50)}${shot.description.length > 50 ? '...' : ''}\n`
            }
          })
        }
      })
    } else {
      contextInfo += `\nScenes: none yet\n`
    }

    if (w.assetCount !== undefined) {
      contextInfo += `\nAssets: ${w.assetCount} total`
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
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured')
  }

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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: apiMessages,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API request failed: ${response.status}`)
  }

  const data = await response.json()

  // Extract text and tool calls from response
  let message = ''
  const toolCalls: ToolCall[] = []

  for (const block of data.content) {
    if (block.type === 'text') {
      message += block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input
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
