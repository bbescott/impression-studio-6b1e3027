import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY secret");

    const { text, voiceId } = await req.json();
    if (!text) throw new Error("text is required");

    const vid = voiceId || "9BWtsMINqrJLrRacOk9x"; // Aria default

    async function requestTTS(voice: string) {
      return await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.7 },
          output_format: "mp3_44100_128",
        }),
      });
    }

    let response = await requestTTS(vid);

    if (!response.ok) {
      const errText = await response.text();
      const FALLBACK_VOICE = "9BWtsMINqrJLrRacOk9x"; // Aria fallback
      const shouldFallback = (response.status === 404 || /voice\s*not\s*found/i.test(errText) || /not\s*found/i.test(errText)) && vid !== FALLBACK_VOICE;
      if (shouldFallback) {
        // Retry once with a safe default voice
        response = await requestTTS(FALLBACK_VOICE);
      } else {
        throw new Error(`ElevenLabs API error: ${response.status} ${errText}`);
      }
    }

    if (!response.ok) {
      const errText2 = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errText2}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(JSON.stringify({ audioContent: base64Audio, mimeType: "audio/mpeg" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("elevenlabs-tts error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});