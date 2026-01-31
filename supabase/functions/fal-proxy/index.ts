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
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY not configured in edge function secrets")
    }

    const { action, ...params } = await req.json()

    switch (action) {
      case "submit": {
        // Submit a new generation job to FAL queue
        const { model, input } = params

        const response = await fetch(`${FAL_API_URL}/${model}`, {
          method: "POST",
          headers: {
            "Authorization": `Key ${FAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.detail || error.message || "Failed to submit request")
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

        const response = await fetch(
          `${FAL_API_URL}/${model}/requests/${requestId}/status`,
          {
            headers: {
              "Authorization": `Key ${FAL_API_KEY}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error("Failed to fetch status")
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
