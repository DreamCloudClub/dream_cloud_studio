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
  moodBoard?: {
    keywords?: string[]
    colors?: string[]
  }
  storyboard?: {
    acts?: Array<{ name: string; description: string }>
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
          description: 'The route to navigate to. Options: "/create/project" (start new project wizard), "/create/asset" (create standalone asset), "/" (home/dashboard)'
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
  // ASSET GENERATION TOOLS
  // ============================================
  {
    name: 'generate_image',
    description: 'Generate an image from a text prompt. Use this when the user wants to create visual assets like character portraits, backgrounds, scenes, or props. The generated image will be saved as a project asset.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate. Be specific about style, lighting, composition, etc.'
        },
        category: {
          type: 'string',
          enum: ['scene', 'stage', 'character', 'weather', 'prop', 'effect'],
          description: 'Asset category for organization'
        },
        name: {
          type: 'string',
          description: 'A name for this asset (e.g., "Hero character portrait", "City background")'
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
      required: ['prompt', 'name']
    }
  },
  {
    name: 'generate_voiceover',
    description: 'Generate voiceover audio from text using ElevenLabs. Use this when the user wants to create narration or character dialogue.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The script/text to convert to speech'
        },
        name: {
          type: 'string',
          description: 'A name for this audio asset (e.g., "Scene 1 narration", "Character intro")'
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
      required: ['text', 'name']
    }
  },
  {
    name: 'generate_music',
    description: 'Generate background music from a text description using AI. Use this when the user wants custom background music for their video.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the music (e.g., "upbeat corporate music with light drums", "emotional piano melody")'
        },
        name: {
          type: 'string',
          description: 'A name for this music asset (e.g., "Intro music", "Background score")'
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (5-30 seconds). Default is 10.'
        }
      },
      required: ['prompt', 'name']
    }
  },
  {
    name: 'generate_sound_effect',
    description: 'Generate a sound effect from a text description using ElevenLabs. Use this for whooshes, impacts, ambient sounds, etc.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the sound effect (e.g., "swoosh transition", "keyboard typing", "crowd cheering")'
        },
        name: {
          type: 'string',
          description: 'A name for this sound effect (e.g., "Transition swoosh", "Typing sounds")'
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (0.5-22 seconds). Optional.'
        }
      },
      required: ['prompt', 'name']
    }
  }
]

// Step-specific guidance for Bubble
const STEP_GUIDANCE: Record<string, string> = {
  home: `You are on the home/dashboard page.

If the user describes a video idea, ask "Would you like to start a new project for this?" and WAIT for their response.
Only use the navigate tool AFTER they confirm they want to start.`,

  platform: `You are on the PLATFORM step (step 1 of 8).

ASK: "Would you like to create a new platform or use an existing one?"
WAIT for their answer. Only use select_platform after they tell you their choice.
Do NOT use go_to_next_step in the same response as select_platform.`,

  brief: `You are on the BRIEF step (step 2 of 8).

Your job is to have a natural conversation to understand their video idea and extract structured content.

CONVERSATION FLOW:
1. If no project name yet, ask: "What would you like to call this project?"
2. After name, ask: "Tell me about your video - what's the scene? Who's in it?"
3. As they describe, use update_video_content to save extracted info:
   - characters: Any people mentioned ("a man", "Sarah", "the hero")
   - setting: Location ("city street", "office", "beach")
   - timeOfDay: When it happens ("morning", "night", "sunset")
   - weather: Conditions if mentioned ("rainy", "sunny")
   - action: The main story/action happening
   - props: Important objects ("umbrella", "laptop", "car")
   - dialogue: Any spoken words mentioned

4. After saving content, follow up on MISSING required info:
   - If no characters mentioned: "Who's the main character in this scene?"
   - If no setting: "Where does this take place?"
   - If no action: "What's happening in this scene?"

5. Once you have characters, setting, and action, ask about optional fields:
   - "What time of day is it?"
   - "Any particular weather or atmosphere?"

6. When video content is complete, briefly ask about audience, tone, duration if not set.

IMPORTANT:
- Extract info from natural conversation - don't ask like a form
- Use update_video_content to save what they describe
- Update incrementally as they add details
- The Video Content box in the UI updates automatically from your tool calls`,

  mood: `You are on the MOOD step (step 3 of 8).

Ask: "What visual style are you going for?" and WAIT.
After they answer, update keywords and ask about colors.
Only use go_to_next_step when user says they're happy with the mood board.`,

  story: `You are on the SCENES & SHOTS step (step 4 of 8).

Your job is to help the user outline their video's scenes and the shots within each scene.

CONVERSATION FLOW:
1. Ask: "Let's plan your shots. What happens in the first shot of Scene 1?"
2. After they describe a shot, use add_shot_to_scene to add it
3. Ask: "What's the next shot?" and continue adding shots
4. When they want to move to a new scene, use add_scene to create it

AVAILABLE TOOLS:
- add_shot_to_scene: Add a single shot to an existing scene (PREFERRED for adding shots one at a time)
- add_scene: Create a new scene, optionally with initial shots
- update_scene_shot: Update an existing shot's title or description (can append to existing description)
- update_storyboard: Replace ALL scenes and shots (use sparingly, mainly for major restructuring)

EXAMPLES:
Add a shot to Scene 1:
add_shot_to_scene({ sceneName: "Scene 1", title: "Hero entrance", description: "Wide shot of character walking into frame against city skyline at sunset" })

Create a new scene:
add_scene({ name: "Scene 2", description: "The confrontation" })

Update a shot's description:
update_scene_shot({ sceneName: "Scene 1", shotTitle: "Hero entrance", newDescription: "Wide shot of character in red coat walking into frame against city skyline at golden hour sunset" })

Append more details to a shot:
update_scene_shot({ sceneName: "Scene 1", shotIndex: 0, newDescription: "with dramatic clouds in the background", append: true })

IMPORTANT:
- Each shot description will be used as an image generation prompt, so make them VISUALLY DESCRIPTIVE
- Use add_shot_to_scene to add shots incrementally as the user describes them
- Use update_scene_shot to refine or add details to existing shots (use append: true to add to existing description)
- Use add_scene when the user wants to start a new scene
- The scene/shot panels update automatically from your tool calls
- Only go_to_next_step when user confirms their shot list is complete`,

  shots: `You are on the SHOTS step (step 5 of 8).

Your job is to help plan the shot list based on the story structure.

CONVERSATION FLOW:
1. Review the storyboard acts and suggest shots for each
2. Ask: "Based on your story, I'd suggest starting with [shot idea]. What do you think?"
3. Use add_shot or update_shots to add shots as you discuss them
4. For each shot, capture: description, duration (2-5 seconds typical), and shot type

USE update_shots to set the full shot list, or add_shot to add one at a time:
- description: What's happening in the shot
- duration: How long in seconds (default 3)
- shotType: "Wide shot", "Medium shot", "Close-up", "POV", "Aerial", "Tracking", etc.
- sceneIndex: Which act/scene (0 = Beginning, 1 = Middle, 2 = End)

IMPORTANT:
- Generate shots based on the story beats
- Fill in the UI as you discuss - don't wait until the end
- Shots are saved to the database automatically
- Only go_to_next_step when user confirms the shot list is complete`,

  filming: `You are on the FILMING step (step 6 of 8).

Your job is to help create visual assets for each shot. You CAN generate images!

CONVERSATION FLOW:
1. Ask: "Let's create visuals for your shots. Would you like me to generate an image for the first shot, or do you have media to upload?"
2. If they want to generate, use generate_image with:
   - A detailed prompt based on the shot description
   - An appropriate category (scene, character, prop, etc.)
   - A descriptive name
   - Style based on the mood board
3. After generating, confirm and ask about the next shot
4. You can also offer to generate video from an image (coming soon)

USE generate_image to create visuals:
- prompt: Be very detailed - include setting, lighting, style, mood
- category: scene, stage, character, weather, prop, or effect
- name: Descriptive name for the asset
- style: Match the mood board keywords

IMPORTANT:
- Generate assets one at a time and confirm before proceeding
- The generated images are saved to the database automatically
- Users can also upload their own media if they prefer
- Only go_to_next_step when user confirms all shots have media`,

  audio: `You are on the AUDIO step (step 7 of 8).

Your job is to help CREATE audio elements. You CAN generate voiceovers, music, and sound effects!

CONVERSATION FLOW:
1. Ask: "Would you like voiceover narration? I can generate it from your script."
2. If yes, help write the script, then use generate_voiceover to create the audio
3. Ask: "What style of background music fits the mood? I can generate custom music."
4. If they want music, use generate_music to create it
5. Ask: "Any sound effects needed? I can generate those too."
6. If they want effects, use generate_sound_effect for each one

GENERATION TOOLS:
- generate_voiceover: Creates speech from text (provide text, name, voiceStyle)
- generate_music: Creates background music (provide prompt, name, duration)
- generate_sound_effect: Creates sound effects (provide prompt, name)

ALSO USE set_audio to save the audio PLAN (what you intend to use):
- voiceoverScript: The full narration text
- musicStyle: Description of the music style
- soundEffects: Array of planned effects

IMPORTANT:
- Generate audio one element at a time and confirm before proceeding
- Generated audio is saved to the database as project assets
- The plan (set_audio) is separate from the generated assets
- Only go_to_next_step when user says audio is complete`,

  review: `You are on the REVIEW step (step 8 of 8).

Summarize what they've created. Do NOT use any tools here.
Tell them to click the Create button when ready.`,

  workspace: `You are in an existing project workspace.
Help with specific requests. Ask what they'd like to work on and WAIT.`
}

const SYSTEM_PROMPT = `You are "Bubble", a friendly and creative AI production assistant in Dream Cloud Studio. You guide users through creating video projects conversationally.

Your personality:
- Friendly, encouraging, and creative
- Concise (1-3 sentences per response)
- Knowledgeable about video production, storytelling, and visual design

CRITICAL RULES:
1. Ask ONE question at a time and WAIT for the user's answer before proceeding
2. NEVER use multiple tools in one response - only use ONE tool per turn maximum
3. NEVER skip ahead or assume answers - always wait for explicit user input
4. After using a tool, confirm what you did and ask the NEXT question, then STOP and wait
5. Do NOT auto-fill fields or advance steps without the user explicitly telling you what they want

PACING:
- Each response should end with a question and wait for the user
- Only update ONE field or take ONE action per user message
- If the user gives you multiple pieces of info, save ONE and ask to confirm the next
- The user is in control - you are a helpful guide, not an autopilot`

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

// Generate initial greeting based on step
export function getInitialGreeting(step: string, initialPrompt?: string): string {
  const hasPrompt = initialPrompt && initialPrompt.trim().length > 0

  switch (step) {
    case 'home':
      return "Hi! I'm Bubble, your creative assistant. Tell me what you'd like to create and I'll guide you through the process."

    case 'workspace':
      if (hasPrompt) {
        return `Welcome back to "${initialPrompt}"! What would you like to work on?`
      }
      return "Welcome back! What would you like to work on?"

    case 'platform':
      if (hasPrompt) {
        return `"${initialPrompt}" sounds great! First question: would you like to create a new platform or use an existing one?`
      }
      return "Let's create your project! Would you like to create a new platform or use an existing one?"

    case 'brief':
      return "Great! Now let's define your project. What would you like to call it?"

    case 'mood':
      return "Time for the visual direction. What style are you going for? (e.g., cinematic, minimal, vibrant, retro)"

    case 'story':
      return "Let's structure your story. What's the main message or hook you want to start with?"

    case 'shots':
      return "Based on your story, let's plan your shots. I'll help you create a shot list."

    case 'filming':
      return "Now let's create the media for each shot. Ready to start with the first one?"

    case 'audio':
      return "Time for audio! Would you like to add voiceover, background music, or sound effects?"

    case 'review':
      return "Everything's looking good! Review the summary below and click Create when you're ready."

    default:
      return "How can I help you with your project?"
  }
}
