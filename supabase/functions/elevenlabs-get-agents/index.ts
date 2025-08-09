import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY secret");

    const res = await fetch("https://api.elevenlabs.io/v1/convai/agents", {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs get agents error: ${res.status} ${err}`);
    }

    const body = await res.json();
    const rawAgents = Array.isArray(body?.agents)
      ? body.agents
      : Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : [];

    const agents = rawAgents.map((a: any) => ({
      id: a?.agent_id ?? a?.id ?? a?.uuid ?? null,
      name: a?.name ?? "Unnamed Agent",
      description: a?.description ?? a?.bio ?? undefined,
      voiceId: a?.default_tts_voice_id ?? a?.voice_id ?? a?.tts?.voice_id ?? undefined,
      isPrivate: a?.visibility ? a.visibility !== "public" : undefined,
    })).filter((a: any) => a.id);

    return new Response(
      JSON.stringify({ agents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("elevenlabs-get-agents error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});