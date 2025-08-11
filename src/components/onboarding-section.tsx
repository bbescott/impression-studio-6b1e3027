import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
// removed unused Link import
import { generateInterviewPlanWithGemini } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { ELEVEN_AGENTS } from "@/config/elevenlabs";
import { Switch } from "@/components/ui/switch";

const PREVIEW_TEXT = "Hello there, I am your interviewer.";

interface OnboardingSectionProps {
  onGoalSelect: (goal: string, questions: string[]) => void;
}

export function OnboardingSection({ onGoalSelect }: OnboardingSectionProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  // persona removed - defaulting to professional behind the scenes
  const [count, setCount] = useState<number>(5);
  
  const [loading, setLoading] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [voicesPage, setVoicesPage] = useState<number>(1);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  // Inline setup states
  const [agents, setAgents] = useState<{ id: string; name: string; description?: string; voiceId?: string }[]>([]);
  const [voices, setVoices] = useState<{ id: string; name: string; previewUrl?: string }[]>([]);
  const [agentId, setAgentId] = useState<string>(localStorage.getItem("ELEVENLABS_AGENT_ID") || "agent_9801k286kms6e6f83fj5ex1ngmpc");
  const [isCustomAgent, setIsCustomAgent] = useState<boolean>(false);
  const [voiceId, setVoiceId] = useState<string>(localStorage.getItem("TTS_VOICE_ID") || "9BWtsMINqrJLrRacOk9x");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [studio, setStudio] = useState<string>(localStorage.getItem("SELECTED_STUDIO") || "/studios/studio-1.jpg");
  const [studios, setStudios] = useState<string[]>([
    "/studios/podcast-1.jpg",
    "/studios/podcast-2.jpg",
    "/studios/podcast-3.jpg",
    "/studios/podcast-4.jpg",
    "/studios/podcast-5.jpg",
    "/studios/podcast-6.jpg",
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
        const eligible = (list: any[]) => list.filter((v: any) => {
          const labels = v.labels as string[] | undefined;
          const isConversational = (labels?.some(l => /conversational/i.test(l)) || /conversational/i.test(v.name));
          const isHighQuality = (v.highQuality === true) || !!v.previewUrl;
          return isConversational && isHighQuality;
        });
        let page = 1;
        let combined: any[] = [];
        while (true) {
          const { data, error } = await supabase.functions.invoke('elevenlabs-get-shared-voices', {
            body: { perPage: 50, page },
          });
          if (error) throw new Error(error.message);
          const apiVoices = (data as any)?.voices || [];
          combined = Array.from(new Map([...combined, ...apiVoices].map((v: any) => [v.id, v])).values());
          if (eligible(combined).length >= 30) break;
          if (!apiVoices.length) break;
          page += 1;
          if (page > 5) break;
        }
        if (!mounted) return;
        setVoices(combined);
        if (!voiceId && combined[0]?.id) setVoiceId(combined[0].id);
        setVoicesPage(page);
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
  // Voice preview and load-more handlers
  const handleVoicePreview = async () => {
    try {
      setPreviewingVoice(true);
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: PREVIEW_TEXT, voiceId },
      });
      if (error) throw new Error(error.message);
      const audioContent = (data as any)?.audioContent;
      const mimeType = (data as any)?.mimeType || 'audio/mpeg';
      if (!audioContent) throw new Error('No audio returned');
      const audio = new Audio(`data:${mimeType};base64,${audioContent}`);
      await audio.play();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Preview failed', description: e?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setPreviewingVoice(false);
    }
  };

  const previewVoiceById = async (id: string) => {
    try {
      setPreviewingVoiceId(id);
      // Stop previous
      try { previewAudioRef.current?.pause(); } catch {}
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: PREVIEW_TEXT, voiceId: id },
      });
      if (error) throw new Error(error.message);
      const audioContent = (data as any)?.audioContent;
      const mimeType = (data as any)?.mimeType || 'audio/mpeg';
      if (!audioContent) throw new Error('No audio returned');
      const audio = new Audio(`data:${mimeType};base64,${audioContent}`);
      await audio.play();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Preview failed', description: e?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const loadMoreVoices = async () => {
    try {
      setLoadingVoices(true);
      const nextPage = voicesPage + 1;
      const { data, error } = await supabase.functions.invoke('elevenlabs-get-shared-voices', {
        body: { perPage: 50, page: nextPage },
      });
      if (error) throw new Error(error.message);
      const more = (data as any)?.voices || [];
      if (more.length) {
        setVoices((prev) => {
          const map = new Map<string, any>();
          [...prev, ...more].forEach((v: any) => map.set(v.id, v));
          return Array.from(map.values());
        });
        setVoicesPage(nextPage);
      } else {
        // no more voices
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to load voices', description: e?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setLoadingVoices(false);
    }
  };
  const startInterview = async () => {
    const topicValue = topic.trim() || "My Interview";

    // Auto-select agent based on Supabase secrets (dating/general)
    const isDatingTopic = /(\b|\s)(dating|relationship|romance|love)(\b|\s)/i.test(topicValue);

    let selectedAgent = localStorage.getItem('ELEVENLABS_AGENT_ID') || undefined;
    // Allow inline selection on this page
    if (!selectedAgent && agentId) {
      localStorage.setItem('ELEVENLABS_AGENT_ID', agentId);
      selectedAgent = agentId;
    }
    try {
      const { data } = await supabase.functions.invoke('get-agent-ids');
      const datingId = (data as any)?.dating as string | undefined;
      const generalId = (data as any)?.general as string | undefined;
      if (isDatingTopic && datingId && selectedAgent !== datingId) {
        localStorage.setItem('ELEVENLABS_AGENT_ID', datingId);
        selectedAgent = datingId;
        toast({ title: "Dating topic detected", description: "Using your Dating Interviewer agent.", duration: 2500 });
      }
      if (!selectedAgent && generalId) {
        localStorage.setItem('ELEVENLABS_AGENT_ID', generalId);
        selectedAgent = generalId;
      }
    } catch (_) { /* non-fatal */ }

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

      // persona removed from storage
      localStorage.setItem("INTERVIEW_TOPIC", topicValue);
      localStorage.setItem("INTERVIEW_INTENT", "Custom");
      localStorage.setItem("INTERVIEW_COUNT", String(count));
      try {
        const aiQuestions = await generateInterviewPlanWithGemini({
          topic: topicValue,
          intent: "Custom",
          persona: "professional",
          questionsCount: count,
        });
        questions = aiQuestions?.length ? aiQuestions : [];
      } catch (err) {
        console.error(err);
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

          <div className="space-y-2">
            <Label>Interviewer Agent</Label>
            <Select
              value={isCustomAgent ? "_custom" : (agentId || "")}
              onValueChange={(v) => {
                if (v === "_custom") { setIsCustomAgent(true); return; }
                setIsCustomAgent(false);
                setAgentId(v);
                const a = agents.find((x) => x.id === v);
                if (a?.voiceId && voices.some((vv) => vv.id === a.voiceId)) {
                  setVoiceId(a.voiceId);
                }
              }}
            >
              <SelectTrigger aria-label="Select Agent">
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
            <Select value={voiceId} open={voiceOpen} onOpenChange={setVoiceOpen} onValueChange={(v) => {
              setVoiceId(v);
            }}>
              <SelectTrigger aria-label="Select interviewer voice">
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.filter((v: any) => {
                  const labels = (v as any).labels as string[] | undefined;
                  const isConversational = (labels?.some(l => /conversational/i.test(l)) || /conversational/i.test(v.name));
                  const isHighQuality = ((v as any).highQuality === true) || !!v.previewUrl;
                  return isConversational && isHighQuality;
                }).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{v.name}</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); previewVoiceById(v.id); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); previewVoiceById(v.id); }}
                        disabled={previewingVoiceId === v.id}
                        aria-label={`Preview ${v.name}`}
                      >
                        {previewingVoiceId === v.id ? 'Playing…' : 'Preview'}
                      </Button>
                    </div>
                  </SelectItem>
                ))}
                <div
                  role="button"
                  tabIndex={0}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadMoreVoices(); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>Show more voices</span>
                    <span className="text-muted-foreground text-xs">{loadingVoices ? 'Loading…' : ''}</span>
                  </div>
                </div>
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


          <div className="flex flex-col gap-2">
            <Button onClick={startInterview} variant="hero" disabled={loading} className="group">
              {loading ? "Generating…" : "Start Interview"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}