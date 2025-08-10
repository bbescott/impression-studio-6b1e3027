import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { generateInterviewPlan, generateInterviewPlanWithGemini, type Persona } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { ELEVEN_AGENTS } from "@/config/elevenlabs";

interface OnboardingSectionProps {
  onGoalSelect: (goal: string, questions: string[]) => void;
}

export function OnboardingSection({ onGoalSelect }: OnboardingSectionProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState<Persona>("professional");
  const [count, setCount] = useState<number>(5);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem("PPLX_API_KEY") || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Inline setup states
  const [agents, setAgents] = useState<{ id: string; name: string; description?: string; voiceId?: string }[]>([]);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState<string>(localStorage.getItem("ELEVENLABS_AGENT_ID") || "agent_9801k286kms6e6f83fj5ex1ngmpc");
  const [isCustomAgent, setIsCustomAgent] = useState<boolean>(false);
  const [voiceId, setVoiceId] = useState<string>(localStorage.getItem("TTS_VOICE_ID") || "9BWtsMINqrJLrRacOk9x");
  const [studio, setStudio] = useState<string>(localStorage.getItem("SELECTED_STUDIO") || "/studios/studio-1.jpg");
  const [studios, setStudios] = useState<string[]>([
    "/studios/studio-1.jpg",
    "/studios/studio-2.jpg",
    "/studios/studio-3.jpg",
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-get-agents');
        if (error) throw new Error(error.message);
        const apiAgents = (data as any)?.agents || [];
        const curated = ELEVEN_AGENTS || [];
        const merged = [...apiAgents, ...curated.filter((c) => !apiAgents.some((a: any) => a.id === c.id))];
        if (!mounted) return;
        setAgents(merged);
        if (!agentId && merged[0]?.id) setAgentId(merged[0].id);
      } catch (_) {
        const curated = ELEVEN_AGENTS || [];
        if (!mounted) return;
        setAgents(curated);
        if (!agentId && curated[0]?.id) setAgentId(curated[0].id);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-get-shared-voices');
        if (error) throw new Error(error.message);
        const apiVoices = (data as any)?.voices || [];
        if (!mounted) return;
        if (apiVoices.length) {
          setVoices(apiVoices);
          if (!voiceId && apiVoices[0]?.id) setVoiceId(apiVoices[0].id);
        }
      } catch (_) {
        setVoices([
          { id: "9BWtsMINqrJLrRacOk9x", name: "Aria" },
          { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
        ]);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.storage.from('studio.sample.images').list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });
        if (error) throw new Error(error.message);
        if (!mounted) return;
        const files = (data || []).filter((f: any) => f && f.name && /\.(png|jpe?g|webp|gif)$/i.test(f.name));
        if (files.length) {
          const urls = files
            .map((f: any) => supabase.storage.from('studio.sample.images').getPublicUrl(f.name).data.publicUrl)
            .filter(Boolean) as string[];
          if (urls.length) {
            setStudios(urls);
            if (!urls.includes(studio)) setStudio(urls[0]);
          }
        }
      } catch {
        // keep default bundled images
      }
    })();
    return () => { mounted = false };
  }, []);

  const startInterview = async () => {
    const topicValue = topic.trim() || "My Interview";

    // Auto-select dating agent for dating-related topics
    const DATING_AGENT_ID = "agent_3301k288cbm4ejmvsqrxkcnf16vk";
    const isDatingTopic = /(\b|\s)(dating|relationship|romance|love)(\b|\s)/i.test(topicValue);

    let selectedAgent = localStorage.getItem('ELEVENLABS_AGENT_ID') || undefined;
    // Allow inline selection on this page
    if (!selectedAgent && agentId) {
      localStorage.setItem('ELEVENLABS_AGENT_ID', agentId);
      selectedAgent = agentId;
    }
    if (isDatingTopic && selectedAgent !== DATING_AGENT_ID) {
      localStorage.setItem('ELEVENLABS_AGENT_ID', DATING_AGENT_ID);
      selectedAgent = DATING_AGENT_ID;
      toast({ title: "Dating topic detected", description: "Using your Dating Interviewer agent.", duration: 2500 });
    }

    // Persist voice and studio selections
    if (voiceId) localStorage.setItem('TTS_VOICE_ID', voiceId);
    if (studio) localStorage.setItem('SELECTED_STUDIO', studio);

    // Require agent selection before generating questions
    if (!selectedAgent) {
      toast({ title: "Select an Interviewer Agent first", description: "Please choose an agent below.", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      let questions: string[] = [];

      if (apiKey) {
        localStorage.setItem("PPLX_API_KEY", apiKey);
        localStorage.setItem("INTERVIEW_PERSONA", persona);
        localStorage.setItem("INTERVIEW_TOPIC", topicValue);
        localStorage.setItem("INTERVIEW_INTENT", "Custom");
        localStorage.setItem("INTERVIEW_COUNT", String(count));
        const aiQuestions = await generateInterviewPlan({
          topic: topicValue,
          intent: "Custom",
          persona,
          questionsCount: count,
          apiKey,
        });
        questions = aiQuestions?.length ? aiQuestions : [];
      } else {
        localStorage.setItem("INTERVIEW_PERSONA", persona);
        localStorage.setItem("INTERVIEW_TOPIC", topicValue);
        localStorage.setItem("INTERVIEW_INTENT", "Custom");
        localStorage.setItem("INTERVIEW_COUNT", String(count));
        try {
          const aiQuestions = await generateInterviewPlanWithGemini({
            topic: topicValue,
            intent: "Custom",
            persona,
            questionsCount: count,
          });
          questions = aiQuestions?.length ? aiQuestions : [];
        } catch (err) {
          console.error(err);
        }
      }

      if (!questions.length) {
        // simple fallback
        questions = [
          `What about ${topicValue} is most important to you?`,
          `Who is the audience and what do you want them to feel?`,
          `What story or example best illustrates your point?`,
          `What outcome would make this a success?`,
          `Anything we should avoid or emphasize?`,
        ];
        toast({ title: "Using starter questions", description: "AI unavailable, using a basic set." });
      }

      onGoalSelect(topicValue, questions);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to start", description: e?.message || "Try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center space-y-8 mb-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold">Start Your Interview</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tell the AI interviewer your topic, then we generate tailored questions. You can adjust the style during the interview.
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic (what is this interview about?)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Launching my fitness coaching brand"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={persona} onValueChange={(v) => setPersona(v as Persona)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="flirty">Flirty</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="philosophical">Philosophical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Questions</Label>
              <Select value={String(count)} onValueChange={(v) => setCount(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interviewer Agent</Label>
            <Select
              value={isCustomAgent ? "_custom" : (agentId || "")}
              onValueChange={(v) => {
                if (v === "_custom") { setIsCustomAgent(true); return; }
                setIsCustomAgent(false);
                setAgentId(v);
                const a = agents.find((x) => x.id === v);
                if (a?.voiceId) setVoiceId(a.voiceId);
              }}
            >
              <SelectTrigger aria-label="Select ElevenLabs Agent">
                <SelectValue placeholder={agents.length ? "Choose an agent" : "No agents available"} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
                <SelectItem value="_custom">Custom Agent ID…</SelectItem>
              </SelectContent>
            </Select>
            {isCustomAgent && (
              <Input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter your ElevenLabs Agent ID"
                aria-label="ElevenLabs Agent ID"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Interviewer Voice</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger aria-label="Select interviewer voice">
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Choose a Studio</Label>
            <div className="grid grid-cols-3 gap-3">
              {studios.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`relative rounded-lg overflow-hidden border aspect-video ${studio === src ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setStudio(src)}
                  aria-label="Select studio background"
                >
                  <img src={src} alt="studio background option" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Perplexity API Key (optional)</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pplx_..."
            />
            {!apiKey && (
              <p className="text-xs text-muted-foreground">No key? We'll use server AI or a basic set.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={startInterview} variant="hero" disabled={loading} className="group">
              {loading ? "Generating…" : "Start Interview"}
            </Button>
            <div className="text-sm text-muted-foreground">
              Or{' '}
              <Button asChild variant="link" size="sm">
                <Link to="/setup">set up interviewer, voice & studio</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}