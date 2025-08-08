// Simple AI helper using Perplexity Chat Completions API
// Stores no secrets; expects a user-provided API key (temporary) saved in localStorage under 'PPLX_API_KEY'

export type Persona = 'professional' | 'flirty' | 'empathetic' | 'philosophical';

const personaPrompts: Record<Persona, string> = {
  professional:
    "Persona: Professional interviewer. Tone: Structured, concise, industry-aware. Avoid repeating questions. Ask 4-7 thoughtful questions.",
  flirty:
    "Persona: Charming, playful first-date interviewer. Tone: Warm, fun, a little quirky but respectful. Keep it flowing naturally.",
  empathetic:
    "Persona: Empathetic coach. Tone: Warm, supportive, encouraging. Probe with gentle follow-ups.",
  philosophical:
    "Persona: Thoughtful philosopher interviewer. Tone: Reflective, nuanced, open-ended and exploratory.",
};

async function callPerplexity(messages: { role: 'system' | 'user'; content: string }[], apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 800,
      frequency_penalty: 0.7,
      presence_penalty: 0.3,
      return_images: false,
      return_related_questions: false,
      search_recency_filter: 'month',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${text}`);
  }
  const json = await response.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');
  return content.trim();
}

export async function generateInterviewPlan(params: {
  topic: string;
  intent: string; // e.g., job, dating
  persona: Persona;
  questionsCount?: number;
  apiKey: string;
}): Promise<string[]> {
  const { topic, intent, persona, questionsCount = 5, apiKey } = params;
  const system = `${personaPrompts[persona]} You are creating an interview plan for: ${intent}.`;
  const user = `Create a list of ${questionsCount} unique, conversational questions for a video interview about: "${topic}". 
- Avoid generic repetition, make it flow naturally.
- Keep questions short and spoken aloud.
- Return ONLY a bullet list with one question per line, no numbering, no extra text.`;

  const content = await callPerplexity(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    apiKey
  );

  const lines = content
    .split('\n')
    .map((l) => l.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean);

  return lines.slice(0, questionsCount);
}

export async function generateFollowUpQuestion(params: {
  persona: Persona;
  intent: string;
  history: { question: string; summary: string }[]; // so far
  apiKey: string;
}): Promise<string> {
  const { persona, intent, history, apiKey } = params;
  const last = history[history.length - 1];
  const system = `${personaPrompts[persona]} You are conducting an adaptive interview for: ${intent}.`;
  const user = `Given the conversation so far, write the NEXT question. Make it feel like a natural follow-up.
Conversation so far:\n${history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1} (summary): ${h.summary}`)
    .join('\n\n')}

Instructions:
- Only return the next question as a single sentence.
- Avoid repeating prior questions.
- Make it specific to the last answer.`;

  const content = await callPerplexity(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    apiKey
  );

  // Ensure it's a single line question
  const firstLine = content.split('\n')[0].trim();
  return firstLine.replace(/^[-•\d.\s]+/, '').replace(/\s+/g, ' ');
}
