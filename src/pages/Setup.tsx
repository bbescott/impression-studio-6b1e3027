import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ELEVEN_AGENTS } from "@/config/elevenlabs";

const DEFAULT_AGENT_ID = "agent_9801k286kms6e6f83fj5ex1ngmpc";
const PREVIEW_TEXT = "Hello there, I am your interviewer.";

export default function Setup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [agents, setAgents] = useState<{ id: string; name: string; description?: string; voiceId?: string }[]>([]);
  const [voices, setVoices] = useState<{ id: string; name: string; previewUrl?: string }[]>([]);

  const [agentId, setAgentId] = useState<string>(localStorage.getItem("ELEVENLABS_AGENT_ID") || DEFAULT_AGENT_ID);
  const [isCustomAgent, setIsCustomAgent] = useState<boolean>(false);
  const [voiceId, setVoiceId] = useState<string>(localStorage.getItem("TTS_VOICE_ID") || "9BWtsMINqrJLrRacOk9x");
  const [studio, setStudio] = useState<string>(localStorage.getItem("SELECTED_STUDIO") || "/studios/studio-1.jpg");

  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesPage, setVoicesPage] = useState<number>(1);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [filterConversational, setFilterConversational] = useState(true);
  const [filterHighQuality, setFilterHighQuality] = useState(true);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [studios, setStudios] = useState<string[]>([
    "/studios/studio-1.jpg",
    "/studios/studio-2.jpg",
    "/studios/studio-3.jpg",
  ]);
  // SEO tags
  useEffect(() => {
    document.title = "Setup Interview – Select Agent, Voice, Studio";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Interview setup: choose ElevenLabs agent, voice, and studio background.');
    document.head.appendChild(metaDesc);

    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', `${window.location.origin}/setup`);
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-get-agents');
        if (error) throw new Error(error.message);
        const apiAgents = (data as any)?.agents || [];
        const curated = ELEVEN_AGENTS || [];
        const merged = [
          ...apiAgents,
          ...curated.filter((c) => !apiAgents.some((a: any) => a.id === c.id)),
        ];
        if (!mounted) return;
        setAgents(merged);
        if (!agentId && merged[0]?.id) setAgentId(merged[0].id);
      } catch (e) {
        const curated = ELEVEN_AGENTS || [];
        if (!mounted) return;
        setAgents(curated);
      }
    })();

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-get-shared-voices');
        if (error) throw new Error(error.message);
        const apiVoices = (data as any)?.voices || [];
        if (!mounted) return;
        if (apiVoices.length) setVoices(apiVoices);
      } catch (e) {
        // fallback minimal set
        setVoices([
          { id: "9BWtsMINqrJLrRacOk9x", name: "Aria" },
          { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
        ]);
      }
    })();

    // Fetch public studio images from Supabase Storage bucket
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
            .filter(Boolean);
          if (urls.length) {
            setStudios(urls);
            if (!urls.includes(studio)) setStudio(urls[0]);
          }
        }
      } catch (_) {
        // keep default bundled images
      }
    })();

    return () => { mounted = false };
  }, []);

  const previewVoiceById = async (id: string) => {
    try {
      setPreviewingVoiceId(id);
      try { previewAudioRef.current?.pause(); } catch {}
      const voice = voices.find((v) => v.id === id);
      let audioSrc: string | undefined;
      if (voice?.previewUrl) {
        audioSrc = voice.previewUrl;
      } else {
        const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
          body: { text: PREVIEW_TEXT, voiceId: id },
        });
        if (error) throw new Error(error.message);
        const audioContent = (data as any)?.audioContent;
        const mimeType = (data as any)?.mimeType || 'audio/mpeg';
        if (!audioContent) throw new Error('No audio returned');
        audioSrc = `data:${mimeType};base64,${audioContent}`;
      }
      if (!audioSrc) throw new Error('No preview available');
      const audio = new Audio(audioSrc);
      previewAudioRef.current = audio;
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

  const handleContinue = () => {
    if (!agentId || (isCustomAgent && agentId.trim().length < 5)) {
      toast({ title: 'Select a valid agent', description: 'Choose from the list or paste a valid Agent ID.', variant: 'destructive' });
      return;
    }
    localStorage.setItem('ELEVENLABS_AGENT_ID', agentId);
    localStorage.setItem('TTS_VOICE_ID', voiceId);
    localStorage.setItem('SELECTED_STUDIO', studio);
    toast({ title: 'Setup saved', description: 'You can now start your interview.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold">Interview Setup</h1>
          <p className="text-muted-foreground">Select your ElevenLabs agent, voice, and a studio background.</p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Interviewer Agent</h4>
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
                <SelectGroup>
                  <SelectLabel>Your Agents</SelectLabel>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Other</SelectLabel>
                  <SelectItem value="_custom">Custom Agent ID…</SelectItem>
                </SelectGroup>
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

          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Interviewer Voice</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="filter-conversational" checked={filterConversational} onCheckedChange={setFilterConversational} />
                <Label htmlFor="filter-conversational">Conversational</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="filter-high-quality" checked={filterHighQuality} onCheckedChange={setFilterHighQuality} />
                <Label htmlFor="filter-high-quality">High quality</Label>
              </div>
            </div>
            <Select value={voiceId} open={voiceOpen} onOpenChange={setVoiceOpen} onValueChange={(v) => { setVoiceId(v); }}>
              <SelectTrigger aria-label="Select interviewer voice">
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>ElevenLabs Voices</SelectLabel>
                  {voices.filter((v: any) => {
                    let ok = true;
                    if (filterConversational) {
                      const labels = (v as any).labels as string[] | undefined;
                      ok = ok && (labels?.some(l => /conversational/i.test(l)) || /conversational/i.test(v.name));
                    }
                    if (filterHighQuality) {
                      ok = ok && (((v as any).highQuality === true) || !!v.previewUrl);
                    }
                    return ok;
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
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Choose a Studio</h4>
            <div className="grid grid-cols-3 gap-3">
              {studios.map((src) => (
                <button
                  key={src}
                  className={`relative rounded-lg overflow-hidden border aspect-video ${studio === src ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setStudio(src)}
                >
                  <img src={src} alt="studio background option" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button variant="hero" onClick={handleContinue} className="w-full">Save & Continue</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
