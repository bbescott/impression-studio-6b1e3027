import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini error: ${t}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function stripHtml(html: string): string {
  try {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return html;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { url, title } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    let html = '';
    try {
      const res = await fetch(normalizedUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Lovable/AI)' } });
      html = await res.text();
    } catch (e) {
      console.warn('Fetch failed', e);
    }

    const text = stripHtml(html).slice(0, 20000);
    let summary = '';
    if (text) {
      const prompt = `Summarize the following web page into key interview-relevant facts in 8-12 concise bullets. If the page is a dating or professional profile, extract highlights and tone. Title: ${title || 'N/A'}\n\nCONTENT:\n${text}`;
      try {
        summary = await callGemini(prompt);
      } catch (e) {
        console.warn('Gemini summarization failed', e);
      }
    }

    return new Response(JSON.stringify({ summary, length: text.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('fetch-profile-context error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
