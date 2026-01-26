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

  story: `You are on the STORY step (step 4 of 8).

Ask about one story element at a time:
1. "What's the hook or opening?"
2. "What's the main message?"
3. "How should it end?"

WAIT for answers. Only go_to_next_step when user confirms story is complete.`,

  shots: `You are on the SHOTS step (step 5 of 8).

Help plan shots one at a time. Ask about each shot and WAIT.
Only go_to_next_step when user says the shot list is complete.`,

  filming: `You are on the FILMING step (step 6 of 8).

Guide through one shot at a time. The user needs to create/upload media.
You cannot create media - just guide them. WAIT for them to complete each shot.
Only go_to_next_step when user confirms all shots have media.`,

  audio: `You are on the AUDIO step (step 7 of 8).

Ask: "Would you like to add voiceover, music, or sound effects?"
Help with one audio element at a time. WAIT for their input.
Only go_to_next_step when user says audio is complete.`,

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
    contextInfo += `Story: ${context.storyboard.acts.map(a => a.name).join(' → ')}\n`
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
