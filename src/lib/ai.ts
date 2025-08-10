// Simple AI helper using Perplexity Chat Completions API
// Stores no secrets; expects a user-provided API key (temporary) saved in localStorage under 'PPLX_API_KEY'
import { supabase } from "@/integrations/supabase/client";
import { getAgentTags } from "@/config/elevenlabs";

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

// Server-side (Supabase Edge Function) Gemini helpers
export async function generateInterviewPlanWithGemini(params: {
  topic: string;
  intent: string;
  persona: Persona;
  questionsCount?: number;
}): Promise<string[]> {
  const { topic, intent, persona, questionsCount = 5 } = params;
  const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
    body: { mode: 'plan', topic, intent, persona, questionsCount },
  });
  if (error) throw new Error(error.message || 'Gemini function error');
  const questions = (data as any)?.questions as string[] | undefined;
  return (questions || []).slice(0, questionsCount);
}

export async function generateVideoPreferencesWithGemini(params: {
  history: { question: string; summary: string }[];
  guidance?: string;
}): Promise<{ preferences: any | null; raw: string }>
{
  const { history, guidance } = params;
  const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
    body: { mode: 'preferences', history, guidance },
  });
  if (error) throw new Error(error.message || 'Gemini function error');
  const preferences = (data as any)?.preferences ?? null;
  const raw = (data as any)?.raw ?? '';
  return { preferences, raw };
}

export async function generateFollowUpQuestionWithGemini(params: {
  persona: Persona;
  intent: string;
  history: { question: string; summary: string }[];
  guidance?: string;
}): Promise<string> {
  const { persona, intent, history, guidance } = params;
  const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
    body: { mode: 'followup', persona, intent, history, guidance },
  });
  if (error) throw new Error(error.message || 'Gemini function error');
  return ((data as any)?.question as string) || '';
}

// Lightweight agent selector with rule-based scoring, tags, and Gemini fallback
export async function selectAgentForTopic(params: {
  title: string;
  agents: { id: string; name: string; description?: string; tags?: string[] }[];
  strategy?: 'rule' | 'gemini' | 'hybrid';
}): Promise<{ agentId: string; reason: string; source: 'rule' | 'gemini' }>{
  const { title, agents, strategy = 'hybrid' } = params;
  const text = (title || '').toLowerCase();

  const kwCareer = ['career','job','jobs','resume','cv','interview','hiring','recruiter','technical','coding','software','engineer','role','position','salary','offer','portfolio','linkedin'];
  const kwDating = ['date','dating','relationship','relationships','match','matches','hinge','tinder','bumble','profile','love','romance','first date','compatibility'];
  const kwDatingApps = ['hinge','tinder','bumble'];

  // Disambiguate intent with rules prioritizing context
  const kwCareerStrong = ['internship','intern','job','jobs','hiring','application','apply','role','position','offer','salary','recruiter','cv','resume','cover letter','portfolio','linkedin','technical interview','coding interview','system design','onsite','phone screen','take home','whiteboard','career','careers'];
  const countHits = (s: string, kws: string[]) => kws.reduce((acc, k) => acc + (s.includes(k) ? 1 : 0), 0);
  const hasInterview = /\binterviews?\b/.test(text);
  const hasProfile = /\bprofiles?\b/.test(text);
  const hasInternOrJobTerms = kwCareerStrong.some(k => text.includes(k));
  const brandMention = kwDatingApps.some(app => text.includes(app));
  const brandAsCompany = /\b(at|for|with|join)\s+(tinder|bumble|hinge)\b/.test(text) || /\b(tinder|bumble|hinge)\s+careers?\b/.test(text);

  // Shortcut rules
  let target: 'career' | 'dating' | 'unknown' = 'unknown';
  if (brandMention && hasProfile) {
    target = 'dating';
  } else if (brandMention && hasInterview && !hasInternOrJobTerms && !brandAsCompany) {
    // “bumble interview” with no career qualifiers -> dating by default
    target = 'dating';
  } else {
    // Weighted counts fallback
    let careerHits = countHits(text, kwCareer);
    let datingHits = countHits(text, kwDating) + countHits(text, kwDatingApps) * 2;

    if (hasInternOrJobTerms) careerHits += 3;
    if (brandAsCompany) careerHits += 2;
    if (brandMention && !hasInternOrJobTerms && !brandAsCompany) datingHits += 1;

    if (careerHits > datingHits && careerHits > 0) target = 'career';
    else if (datingHits > careerHits && datingHits > 0) target = 'dating';
    else if (careerHits === datingHits && (careerHits > 0 || datingHits > 0)) {
      target = (hasInternOrJobTerms || brandAsCompany) ? 'career' : (brandMention ? 'dating' : 'unknown');
    }
  }

  // Score agents using tags (explicit or heuristic) and names/descriptions
  const scored = agents.map(a => {
    const hay = `${a.name || ''} ${a.description || ''}`.toLowerCase();
    const tags = (a as any).tags && Array.isArray((a as any).tags) ? (a as any).tags as string[] : getAgentTags({ id: a.id, name: a.name, description: a.description });
    let score = 0;

    // Strong boost based on tags against detected target
    if (target === 'career' && tags.includes('career')) score += 6;
    if (target === 'dating' && tags.includes('dating')) score += 6;

    // Dating app boosts when present in title and in agent tags
    if (target === 'dating') {
      kwDatingApps.forEach(app => {
        if (text.includes(app) && tags.includes(app)) score += 4;
      });
    }

    // Name/description keyword overlap (lighter weight)
    if (target === 'career') score += kwCareer.reduce((acc,k)=> acc + (hay.includes(k)?1:0), 0);
    if (target === 'dating') score += kwDating.reduce((acc,k)=> acc + (hay.includes(k)?1:0), 0);

    // Generic boosts if names contain clear category words
    if (/career|job|interview/.test(hay)) score += 2;
    if (/dating|date|relationship/.test(hay)) score += 2;

    return { id: a.id, score, tags };
  }).sort((a,b) => b.score - a.score);

  if (strategy !== 'gemini') {
    const top = scored[0];
    if (top && (top.score > 0 || agents.length === 1)) {
      const chosen = agents.find(a => a.id === top.id)!;
      const why = target === 'unknown'
        ? `Selected highest scoring agent by tags/name. Tags: ${(top.tags || []).slice(0,3).join(', ')}`
        : `Matched “${title}” to ${target} intent. Tags: ${(top.tags || []).slice(0,3).join(', ')}`;
      return { agentId: chosen.id, reason: why, source: 'rule' };
    }
    // if rule-based is requested explicitly and no match, fallback to first
    if (strategy === 'rule') {
      return { agentId: agents[0].id, reason: 'Fallback to first agent (no clear match)', source: 'rule' };
    }
  }

  // Gemini fallback
  const payloadAgents = agents.map(a => ({ id: a.id, name: a.name, description: a.description || '' }));
  const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
    body: { mode: 'select-agent', title, agents: payloadAgents },
  });
  if (error) throw new Error(error.message || 'Gemini function error');
  const agentId = (data as any)?.agentId as string | undefined;
  const reason = ((data as any)?.reason as string | undefined) || 'Selected by Gemini';
  if (agentId) return { agentId, reason, source: 'gemini' };
  // last resort
  return { agentId: agents[0].id, reason: 'Fallback to first agent', source: 'rule' };
}

