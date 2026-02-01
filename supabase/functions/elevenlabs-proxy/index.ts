// Supabase Edge Function to proxy ElevenLabs API calls
// This keeps the API key secure on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured in edge function secrets")
    }

    const { action, ...params } = await req.json()

    switch (action) {
      case "list_voices": {
        const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.detail?.message || error.message || "Failed to fetch voices")
        }

        const data = await response.json()
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "generate_voice": {
        const {
          text,
          voiceId = "21m00Tcm4TlvDq8ikWAM", // Rachel - default voice
          modelId = "eleven_multilingual_v2",
          voiceSettings = {},
        } = params

        const settings = {
          stability: voiceSettings.stability ?? 0.5,
          similarity_boost: voiceSettings.similarity_boost ?? 0.75,
          style: voiceSettings.style ?? 0,
          use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
        }

        const response = await fetch(
          `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: settings,
            }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail?.message || error.message || "Failed to generate voice")
        }

        // Convert audio to base64 data URL
        const audioBuffer = await response.arrayBuffer()
        const base64Audio = arrayBufferToBase64(audioBuffer)
        const dataUrl = `data:audio/mpeg;base64,${base64Audio}`

        return new Response(
          JSON.stringify({ audioDataUrl: dataUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "generate_sound_effect": {
        const { text, duration_seconds, prompt_influence = 0.3 } = params

        const body: Record<string, unknown> = {
          text,
          prompt_influence,
        }

        if (duration_seconds) {
          body.duration_seconds = duration_seconds
        }

        const response = await fetch(`${ELEVENLABS_API_URL}/sound-generation`, {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail?.message || error.message || "Failed to generate sound effect")
        }

        // Convert audio to base64 data URL
        const audioBuffer = await response.arrayBuffer()
        const base64Audio = arrayBufferToBase64(audioBuffer)
        const dataUrl = `data:audio/mpeg;base64,${base64Audio}`

        return new Response(
          JSON.stringify({ audioDataUrl: dataUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "generate_music": {
        const {
          prompt,
          duration_ms = 30000, // Default 30 seconds
          force_instrumental = false,
        } = params

        const body: Record<string, unknown> = {
          prompt,
          music_length_ms: duration_ms,
          instrumental: force_instrumental,
        }

        const response = await fetch(`${ELEVENLABS_API_URL}/music`, {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail?.message || error.message || "Failed to generate music")
        }

        const audioBuffer = await response.arrayBuffer()
        const base64Audio = arrayBufferToBase64(audioBuffer)
        const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`

        return new Response(
          JSON.stringify({ audioDataUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "get_user_info": {
        const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail?.message || error.message || "Failed to fetch user info")
        }

        const data = await response.json()
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Invalid action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
