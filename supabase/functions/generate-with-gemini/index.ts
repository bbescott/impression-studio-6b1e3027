import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const personaPrompts: Record<string, string> = {
  professional:
    "Persona: Professional interviewer. Tone: Structured, concise, industry-aware. Avoid repeating questions. Ask 4-7 thoughtful questions.",
  flirty:
    "Persona: Charming, playful first-date interviewer. Tone: Warm, fun, a little quirky but respectful. Keep it flowing naturally.",
  empathetic:
    "Persona: Empathetic coach. Tone: Warm, supportive, encouraging. Probe with gentle follow-ups.",
  philosophical:
    "Persona: Thoughtful philosopher interviewer. Tone: Reflective, nuanced, open-ended and exploratory.",
};

async function callGemini(prompt: string) {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY secret");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 800,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("")?.trim();
  if (!content) throw new Error("Empty response from Gemini");
  return content as string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = (body?.mode as string) || "plan"; // "plan" | "followup" | "preferences"
    const persona = (body?.persona as string) || "professional";
    const personaNote = personaPrompts[persona] || personaPrompts.professional;

    if (mode === "plan") {
      const topic = (body?.topic as string) || "General";
      const intent = (body?.intent as string) || "Interview";
      const questionsCount = Number(body?.questionsCount ?? 5);

      const system = `${personaNote} You are creating an interview plan for: ${intent}.`;
      const user = `Create a list of ${questionsCount} unique, conversational questions for a video interview about: "${topic}".\n- Avoid generic repetition, make it flow naturally.\n- Keep questions short and spoken aloud.\n- Return ONLY a bullet list with one question per line, no numbering, no extra text.`;

      const content = await callGemini(`${system}\n\n${user}`);
      const questions = content
        .split("\n")
        .map((l) => l.replace(/^[-•\d.\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, questionsCount);

      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "followup") {
      const intent = (body?.intent as string) || "Interview";
      const history = (body?.history as { question: string; summary: string }[]) || [];

      const system = `${personaNote} You are conducting an adaptive interview for: ${intent}.`;
      const convo = history
        .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1} (summary): ${h.summary}`)
        .join("\n\n");
      const user = `Given the conversation so far, write the NEXT question. Make it feel like a natural follow-up.\nConversation so far:\n${convo}\n\nInstructions:\n- Only return the next question as a single sentence.\n- Avoid repeating prior questions.\n- Make it specific to the last answer.`;

      const content = await callGemini(`${system}\n\n${user}`);
      const firstLine = content.split("\n")[0].trim();
      const question = firstLine.replace(/^[-•\d.\s]+/, "").replace(/\s+/g, " ");

      return new Response(JSON.stringify({ question }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "preferences") {
      const history = (body?.history as { question: string; summary: string }[]) || [];
      const guidance = (body?.guidance as string) || "";

      const convo = history
        .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1} (summary): ${h.summary}`)
        .join("\n\n");

      const system = "You are a senior video director assistant. Extract structured video production preferences from an interview conversation.";
      const user = `Conversation so far:\n${convo}\n\nAdditional feedback from user (optional): ${guidance}\n\nReturn ONLY valid minified JSON with these fields when available: {"tone":"","pacing":"","visual_style":"","color_palette":"","aspect_ratio":"","caption_style":"","background":"","music":"","transitions":"","must_avoid":[],"unresolved_questions":[]}\n- If unknown, omit the field.\n- Do not include any extra text or markdown.`;

      const raw = await callGemini(`${system}\n\n${user}`);

      let preferences: any = null;
      try {
        preferences = JSON.parse(raw);
      } catch (_) {
        try {
          const start = raw.indexOf('{');
          const end = raw.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            const snippet = raw.slice(start, end + 1);
            preferences = JSON.parse(snippet);
          }
        } catch (e) {
          preferences = null;
        }
      }

      return new Response(JSON.stringify({ preferences, raw }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-with-gemini error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});