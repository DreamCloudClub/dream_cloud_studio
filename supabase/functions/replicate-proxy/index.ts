// Supabase Edge Function to proxy Replicate API calls
// This avoids CORS issues when calling Replicate from the browser
// Note: This function has JWT verification disabled (see config.toml)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const REPLICATE_API_URL = "https://api.replicate.com/v1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")
    if (!REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN not configured in edge function secrets")
    }

    const { action, ...params } = await req.json()

    let response: Response

    switch (action) {
      case "create_prediction": {
        const { version, input } = params

        // Check if version is a model name (e.g., "google/veo-3") or a version hash
        const isModelName = version.includes("/") && !version.match(/^[a-f0-9]{64}$/)

        if (isModelName) {
          // Use model-based endpoint for named models
          console.log(`Creating prediction for model: ${version}`)
          response = await fetch(`${REPLICATE_API_URL}/models/${version}/predictions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
              "Prefer": "wait",  // Wait for result if quick
            },
            body: JSON.stringify({ input }),
          })
        } else {
          // Use version-based endpoint for version hashes
          console.log(`Creating prediction for version: ${version.substring(0, 12)}...`)
          response = await fetch(`${REPLICATE_API_URL}/predictions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ version, input }),
          })
        }
        break
      }

      case "get_prediction": {
        const { predictionId } = params
        response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
          headers: {
            "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
          },
        })
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    const data = await response.json()

    // Log errors for debugging
    if (!response.ok) {
      console.error(`Replicate API error (${response.status}):`, JSON.stringify(data))
    }

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
