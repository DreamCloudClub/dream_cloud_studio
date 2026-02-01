// Animation generation service
// Uses Claude to generate Remotion AnimationConfig from text prompts

import type { AnimationConfig, AnimationLayer } from "@/remotion/AnimationComposition"

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export interface GenerateAnimationParams {
  prompt: string
  category: string  // text, logo, transition, lower_third, title_card, overlay
}

export interface GenerateAnimationResult {
  config: AnimationConfig
  name: string
  description: string
}

const SYSTEM_PROMPT = `You are an expert motion graphics designer who creates animations using a JSON-based animation system.

You create AnimationConfig objects with the following structure:
{
  "duration": number (seconds),
  "layers": [
    {
      "type": "text" | "shape" | "image",
      "content": string (the text, shape type like "circle"/"rectangle", or image URL),
      "animation": "fadeIn" | "fadeOut" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "typewriter",
      "timing": [startSeconds, endSeconds],
      "position": { "x": 0-100, "y": 0-100 } (percentage, 50/50 is center),
      "style": {
        "fontSize": number (for text),
        "fontFamily": string,
        "color": string (hex),
        "backgroundColor": string (optional),
        "width": number (for shapes),
        "height": number (for shapes)
      }
    }
  ],
  "background": { "color": string } or { "gradient": string }
}

Animation types:
- fadeIn: Fade from transparent to opaque
- fadeOut: Fade from opaque to transparent
- slideUp: Slide up from below while fading in
- slideDown: Slide down from above while fading in
- slideLeft: Slide from right to left while fading in
- slideRight: Slide from left to right while fading in
- scale: Scale up from small while fading in
- typewriter: Type text character by character

Category guidelines:
- text: Animated text overlays, kinetic typography
- logo: Logo reveals, brand animations (often use scale or fadeIn)
- transition: Wipes, fades, motion graphics between scenes (shapes, movement)
- lower_third: Name plates at bottom of screen (slideUp, position y: 75-85)
- title_card: Full screen titles (centered, large text)
- overlay: Animated decorative elements, borders, effects

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object with these fields:
{
  "name": "Short descriptive name",
  "description": "What this animation does",
  "config": { /* AnimationConfig */ }
}`

/**
 * Generate an AnimationConfig from a text prompt using Claude
 */
export async function generateAnimation(params: GenerateAnimationParams): Promise<GenerateAnimationResult> {
  const { prompt, category } = params

  if (!ANTHROPIC_API_KEY) {
    // Return a default animation if no API key
    return getDefaultAnimation(prompt, category)
  }

  const userPrompt = `Create a ${category} animation based on this description:
"${prompt}"

The user may have included duration, colors, or other details in their description - use those if specified. Otherwise, choose appropriate defaults (typically 3-5 seconds, dark background for most animations).

Generate the AnimationConfig JSON.`

  try {
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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate animation')
    }

    const data = await response.json()
    const responseText = data.content?.[0]?.text?.trim()

    // Parse JSON response
    const cleanedResponse = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const result = JSON.parse(cleanedResponse)

    // Validate and ensure required fields
    const config: AnimationConfig = {
      duration: result.config?.duration || 4,
      layers: result.config?.layers || [],
      background: result.config?.background || { color: '#000000' },
    }

    return {
      config,
      name: result.name || 'Animation',
      description: result.description || prompt,
    }
  } catch (error) {
    console.error('Error generating animation:', error)
    return getDefaultAnimation(prompt, category)
  }
}

/**
 * Get a default animation based on category
 */
function getDefaultAnimation(
  prompt: string,
  category: string
): GenerateAnimationResult {
  const layers: AnimationLayer[] = []
  let duration = 4
  let backgroundColor = '#000000'

  switch (category) {
    case 'title_card':
      duration = 4
      layers.push({
        type: 'text',
        content: prompt.slice(0, 50) || 'Title',
        animation: 'fadeIn',
        timing: [0, 3.5],
        position: { x: 50, y: 50 },
        style: {
          fontSize: 72,
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
        },
      })
      break

    case 'lower_third':
      duration = 5
      backgroundColor = 'transparent'
      layers.push({
        type: 'text',
        content: prompt.slice(0, 30) || 'Name',
        animation: 'slideUp',
        timing: [0, 4.5],
        position: { x: 15, y: 80 },
        style: {
          fontSize: 32,
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
        },
      })
      break

    case 'transition':
      duration = 1
      backgroundColor = 'transparent'
      layers.push({
        type: 'shape',
        content: 'rectangle',
        animation: 'slideLeft',
        timing: [0, 1],
        position: { x: 50, y: 50 },
        style: {
          width: 2000,
          height: 1200,
          backgroundColor: '#3b82f6',
        },
      })
      break

    case 'logo':
      duration = 3
      layers.push({
        type: 'text',
        content: prompt.slice(0, 20) || 'LOGO',
        animation: 'scale',
        timing: [0, 2.5],
        position: { x: 50, y: 50 },
        style: {
          fontSize: 96,
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
        },
      })
      break

    case 'overlay':
    case 'text':
    default:
      duration = 4
      layers.push({
        type: 'text',
        content: prompt.slice(0, 100) || 'Text',
        animation: 'fadeIn',
        timing: [0, 3.5],
        position: { x: 50, y: 50 },
        style: {
          fontSize: 48,
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
        },
      })
  }

  return {
    config: {
      duration,
      layers,
      background: { color: backgroundColor },
    },
    name: `${category.charAt(0).toUpperCase() + category.slice(1)} Animation`,
    description: prompt,
  }
}

/**
 * Animation templates for quick creation
 */
export const ANIMATION_TEMPLATES = {
  fadeInTitle: (text: string, subtitle?: string): AnimationConfig => ({
    duration: 4,
    layers: [
      {
        type: 'text',
        content: text,
        animation: 'fadeIn',
        timing: [0, 3.5],
        position: { x: 50, y: subtitle ? 40 : 50 },
        style: { fontSize: 72, fontFamily: 'Inter, sans-serif', color: '#ffffff' },
      },
      ...(subtitle ? [{
        type: 'text' as const,
        content: subtitle,
        animation: 'fadeIn' as const,
        timing: [0.5, 3.5] as [number, number],
        position: { x: 50, y: 55 },
        style: { fontSize: 36, fontFamily: 'Inter, sans-serif', color: '#aaaaaa' },
      }] : []),
    ],
    background: { color: '#000000' },
  }),

  slideUpLowerThird: (name: string, title?: string): AnimationConfig => ({
    duration: 5,
    layers: [
      {
        type: 'text',
        content: name,
        animation: 'slideUp',
        timing: [0, 4.5],
        position: { x: 10, y: 80 },
        style: {
          fontSize: 36,
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.8)',
        },
      },
      ...(title ? [{
        type: 'text' as const,
        content: title,
        animation: 'slideUp' as const,
        timing: [0.2, 4.5] as [number, number],
        position: { x: 10, y: 88 },
        style: { fontSize: 24, fontFamily: 'Inter, sans-serif', color: '#888888' },
      }] : []),
    ],
    background: { color: 'transparent' },
  }),

  typewriterText: (text: string): AnimationConfig => ({
    duration: Math.max(3, text.length * 0.1),
    layers: [
      {
        type: 'text',
        content: text,
        animation: 'typewriter',
        timing: [0, Math.max(2.5, text.length * 0.1 - 0.5)],
        position: { x: 50, y: 50 },
        style: { fontSize: 48, fontFamily: 'monospace', color: '#00ff00' },
      },
    ],
    background: { color: '#111111' },
  }),

  logoReveal: (text: string): AnimationConfig => ({
    duration: 3,
    layers: [
      {
        type: 'text',
        content: text,
        animation: 'scale',
        timing: [0, 2.5],
        position: { x: 50, y: 50 },
        style: { fontSize: 96, fontFamily: 'Inter, sans-serif', color: '#ffffff' },
      },
    ],
    background: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  }),

  wipeTransition: (color = '#3b82f6'): AnimationConfig => ({
    duration: 1,
    layers: [
      {
        type: 'shape',
        content: 'rectangle',
        animation: 'slideRight',
        timing: [0, 1],
        position: { x: 50, y: 50 },
        style: { width: 2000, height: 1200, backgroundColor: color },
      },
    ],
    background: { color: 'transparent' },
  }),
}
