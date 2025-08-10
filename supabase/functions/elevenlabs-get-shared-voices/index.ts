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

    // Support optional pagination via POST body
    let perPage: number | undefined;
    let page: number | undefined;
    try {
      const body = await req.json();
      perPage = body?.perPage ?? body?.limit;
      page = body?.page;
    } catch {}

    const params = new URLSearchParams();
    if (perPage) params.set("per_page", String(perPage));
    if (page) params.set("page", String(page));

    const url = `https://api.elevenlabs.io/v1/shared-voices${params.size ? `?${params.toString()}` : ''}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs shared voices error: ${res.status} ${err}`);
    }

    const body = await res.json();
    const rawVoices = Array.isArray(body?.voices)
      ? body.voices
      : Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : [];

    const voices = rawVoices
      .map((v: any) => ({
        id: v?.voice_id ?? v?.id ?? v?.uuid ?? null,
        name: v?.name ?? "Unnamed Voice",
        previewUrl: v?.preview_url ?? v?.preview ?? v?.samples?.[0]?.sample_url ?? undefined,
        language: v?.labels?.language ?? v?.language ?? undefined,
      }))
      .filter((v: any) => v.id && v.name);

    return new Response(
      JSON.stringify({ voices }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("elevenlabs-get-shared-voices error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});