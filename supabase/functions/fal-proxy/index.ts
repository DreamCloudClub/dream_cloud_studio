// Supabase Edge Function to proxy FAL.ai API calls
// This keeps the API key secure on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FAL_API_URL = "https://queue.fal.run"

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
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")

    // Debug: Log key presence and format (masked for security)
    if (!FAL_API_KEY) {
      console.error("FAL_API_KEY is NOT set in environment")
      throw new Error("FAL_API_KEY not configured in edge function secrets")
    }

    const keyLength = FAL_API_KEY.length
    const maskedKey = FAL_API_KEY.substring(0, 4) + "..." + FAL_API_KEY.substring(keyLength - 4)
    console.log(`FAL_API_KEY is set: ${maskedKey} (length: ${keyLength})`)

    const { action, ...params } = await req.json()

    switch (action) {
      case "submit": {
        // Submit a new generation job to FAL queue
        const { model, input } = params

        console.log(`FAL.ai submit request - Model: ${model}`)
        console.log(`FAL.ai URL: ${FAL_API_URL}/${model}`)
        console.log(`FAL.ai input:`, JSON.stringify(input))

        const response = await fetch(`${FAL_API_URL}/${model}`, {
          method: "POST",
          headers: {
            "Authorization": `Key ${FAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        })

        console.log(`FAL.ai response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`FAL.ai error response: ${errorText}`)
          let errorMessage = "Failed to submit request"
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.detail || errorJson.message || errorJson.error || errorText
          } catch {
            errorMessage = errorText || `HTTP ${response.status}`
          }
          throw new Error(`FAL.ai error: ${errorMessage}`)
        }

        const data = await response.json()
        return new Response(
          JSON.stringify({ request_id: data.request_id, status: data.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "status": {
        // Poll job status
        const { model, requestId } = params

        const statusUrl = `${FAL_API_URL}/${model}/requests/${requestId}/status`
        console.log(`FAL.ai status check - URL: ${statusUrl}`)

        const response = await fetch(statusUrl, {
          headers: {
            "Authorization": `Key ${FAL_API_KEY}`,
          },
        })

        console.log(`FAL.ai status response: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`FAL.ai status error: ${errorText}`)
          throw new Error(`Failed to fetch status: ${response.status} - ${errorText}`)
        }

        const status = await response.json()
        return new Response(
          JSON.stringify(status),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      case "result": {
        // Fetch completed result
        const { responseUrl } = params

        const response = await fetch(responseUrl, {
          headers: {
            "Authorization": `Key ${FAL_API_KEY}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch result")
        }

        const result = await response.json()
        return new Response(
          JSON.stringify(result),
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
