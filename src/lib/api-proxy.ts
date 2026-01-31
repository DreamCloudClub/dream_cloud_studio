// Shared helper for calling Supabase edge functions
// All AI service API keys are stored as secrets in edge functions

import { supabase } from './supabase'

export interface EdgeFunctionError {
  message: string
  status?: number
}

/**
 * Call a Supabase edge function with the given action and parameters.
 * This is the unified interface for all proxied API calls.
 *
 * @param functionName - Name of the edge function (e.g., 'anthropic-proxy', 'elevenlabs-proxy')
 * @param action - The action to perform (specific to each function)
 * @param params - Additional parameters for the action
 * @returns The response data from the edge function
 * @throws Error if the edge function call fails
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { action, ...params }
  })

  if (error) {
    throw new Error(error.message || `Edge function ${functionName} failed`)
  }

  // Check for error in response body (edge functions may return errors in data)
  if (data?.error) {
    throw new Error(data.error)
  }

  return data as T
}

/**
 * Type-safe wrapper for Anthropic Claude API calls
 */
export const anthropicProxy = {
  sendMessage: (params: {
    model?: string
    max_tokens?: number
    system: string
    tools?: unknown[]
    messages: Array<{ role: string; content: string | unknown[] }>
  }) => callEdgeFunction('anthropic-proxy', 'send_message', params),

  generateDraft: (params: {
    system: string
    userMessage: string
  }) => callEdgeFunction('anthropic-proxy', 'generate_draft', params),
}

/**
 * Type-safe wrapper for ElevenLabs API calls
 */
export const elevenlabsProxy = {
  listVoices: () =>
    callEdgeFunction<{ voices: Array<{ voice_id: string; name: string; category: string }> }>(
      'elevenlabs-proxy',
      'list_voices'
    ),

  generateVoice: (params: {
    text: string
    voiceId?: string
    modelId?: string
    voiceSettings?: {
      stability?: number
      similarity_boost?: number
      style?: number
      use_speaker_boost?: boolean
    }
  }) => callEdgeFunction<{ audioDataUrl: string }>('elevenlabs-proxy', 'generate_voice', params),

  generateSoundEffect: (params: {
    text: string
    duration_seconds?: number
    prompt_influence?: number
  }) => callEdgeFunction<{ audioDataUrl: string }>('elevenlabs-proxy', 'generate_sound_effect', params),

  getUserInfo: () =>
    callEdgeFunction<{
      subscription: {
        tier: string
        character_count: number
        character_limit: number
      }
      is_new_user: boolean
    }>('elevenlabs-proxy', 'get_user_info'),
}

/**
 * Type-safe wrapper for FAL.ai API calls
 */
export const falProxy = {
  submit: (params: { model: string; input: Record<string, unknown> }) =>
    callEdgeFunction<{ request_id: string; status: string }>('fal-proxy', 'submit', params),

  status: (params: { model: string; requestId: string }) =>
    callEdgeFunction<{ status: string; response_url?: string; error?: string }>(
      'fal-proxy',
      'status',
      params
    ),

  result: (params: { responseUrl: string }) =>
    callEdgeFunction<unknown>('fal-proxy', 'result', params),
}
