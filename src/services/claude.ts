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
  moodBoard?: {
    keywords?: string[]
    colors?: string[]
  }
  storyboard?: {
    acts?: Array<{ name: string; description: string }>
  }
  shotCount?: number
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
    description: 'Update one or more fields in the project brief. Only use when on the brief step.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name/title' },
        description: { type: 'string', description: 'Project description - what is this video about?' },
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
  }
]

// Step-specific guidance for Bubble
const STEP_GUIDANCE: Record<string, string> = {
  home: `You are on the home/dashboard page. The user can:
- Start a new project (use navigate tool with "/create/project")
- Create a standalone asset (use navigate tool with "/create/asset")
- Ask questions about video production

If the user describes a video idea, ask if they want to start a new project and then navigate them there.`,

  platform: `You are on the PLATFORM step (step 1 of 8).
The user must choose: "New Platform" or "Existing Platform".
- New Platform: Start fresh with new visual/audio direction
- Existing Platform: Use saved brand settings for consistency

ASK: "Would you like to create a new platform or use an existing one?"
Once they answer, use the select_platform tool, then use go_to_next_step.`,

  brief: `You are on the BRIEF step (step 2 of 8).
Required fields to collect:
- name: Project title
- description: What is this video about?
- audience: Who is it for?
- tone: What feeling should it evoke?
- duration: How long? (suggest based on platform - TikTok: 15-60s, YouTube: 2-10min)
- aspectRatio: 16:9 (landscape), 9:16 (portrait/vertical), 1:1 (square)

Ask about each missing field one at a time. Use update_brief tool as you collect info.
When ALL fields are filled, use go_to_next_step.`,

  mood: `You are on the MOOD step (step 3 of 8).
Help the user define visual direction:
- keywords: Style descriptors (cinematic, minimal, vibrant, retro, etc.)
- colors: Suggest a color palette based on their brand/mood

Ask about their visual preferences. Use update_mood_board tool.
When they're satisfied with the mood board, use go_to_next_step.`,

  story: `You are on the STORY step (step 4 of 8).
Help structure the narrative:
- Beginning: Hook, introduce the subject
- Middle: Main content, key points
- End: Call to action, conclusion

Guide them through creating 2-4 acts with clear beats.
When the story structure is complete, use go_to_next_step.`,

  shots: `You are on the SHOTS step (step 5 of 8).
Based on the story, help plan specific shots:
- Shot type (wide, medium, close-up, etc.)
- Duration per shot
- Description of what's in frame

Help them create a practical shot list.
When complete, use go_to_next_step.`,

  filming: `You are on the FILMING step (step 6 of 8).
For each shot, the user can:
- Generate images/video with AI
- Upload their own media
- Select from their asset library

Guide them through creating media for each shot.
When all shots have media, use go_to_next_step.`,

  audio: `You are on the AUDIO step (step 7 of 8).
Help add audio elements:
- Voiceover: Script and recording/generation
- Music: Background soundtrack
- SFX: Sound effects

When audio is complete, use go_to_next_step.`,

  review: `You are on the REVIEW step (step 8 of 8).
Summarize the project and confirm they're ready to create it.
Do NOT use any navigation tools here - let them click the create button.`,

  workspace: `You are in an existing project workspace.
Help the user with their current project. You can assist with:
- Editing the brief
- Updating the mood board
- Refining the story
- Managing shots and scenes
- Audio adjustments`
}

const SYSTEM_PROMPT = `You are "Bubble", a friendly and creative AI production assistant in Dream Cloud Studio. You guide users through creating video projects conversationally.

Your personality:
- Friendly, encouraging, and creative
- Concise (1-3 sentences per response, ask ONE question at a time)
- Knowledgeable about video production, storytelling, and visual design
- You take action using tools, don't just describe what you would do

CRITICAL RULES:
1. Ask ONE question at a time, wait for their answer
2. Use tools to take action immediately when you have the information
3. After using a tool, briefly confirm what you did and ask the next question
4. Don't ask for confirmation before using tools - just do it
5. Keep the conversation flowing naturally through the wizard steps

When the user provides information, IMMEDIATELY use the appropriate tool to save it, then move on.`

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
    contextInfo += `  - description: ${b.description || 'NOT SET'}\n`
    contextInfo += `  - audience: ${b.audience || 'NOT SET'}\n`
    contextInfo += `  - tone: ${b.tone || 'NOT SET'}\n`
    contextInfo += `  - duration: ${b.duration || 'NOT SET'}\n`
    contextInfo += `  - aspectRatio: ${b.aspectRatio || 'NOT SET'}\n`
  } else {
    contextInfo += `Brief: NOT SET\n`
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

  return contextInfo
}

export interface ToolCall {
  name: string
  input: Record<string, unknown>
}

export interface BubbleResponse {
  message: string
  toolCalls: ToolCall[]
}

export async function sendMessage(
  messages: Message[],
  context: BubbleContext
): Promise<BubbleResponse> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured')
  }

  const systemPrompt = SYSTEM_PROMPT + buildContextMessage(context)

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
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
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
        name: block.name,
        input: block.input
      })
    }
  }

  return {
    message: message || "I'm processing your request...",
    toolCalls
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
