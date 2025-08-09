import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ELEVEN_AGENTS } from "@/config/elevenlabs";

interface AgentOption {
  id: string;
  name: string;
  description?: string;
  voiceId?: string;
}

const ensureMeta = (name: string, content: string) => {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.content = content;
  } else {
    const m = document.createElement("meta");
    m.setAttribute("name", name);
    m.setAttribute("content", content);
    document.head.appendChild(m);
  }
};

const ensureCanonical = (href: string) => {
  let link = document.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

const Setup = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>("");

  // SEO
  useEffect(() => {
    document.title = "Interview Setup | Impression Studio";
    ensureMeta("description", "Select interviewer agent and check camera/mic before starting your interview.");
    ensureCanonical(window.location.origin + "/setup");
  }, []);

  // Fetch agents via Edge Function (fallback to curated list)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("elevenlabs-get-agents");
        if (error) throw new Error(error.message);
        const apiAgents = (data as any)?.agents || [];
        const curated = ELEVEN_AGENTS || [];
        const merged: AgentOption[] = [
          ...apiAgents,
          ...curated.filter((c) => !apiAgents.some((a: any) => a.id === c.id)),
        ];
        if (!mounted) return;
        setAgents(merged);
        if (merged[0]?.id) setSelectedAgent(merged[0].id);
      } catch (e) {
        const curated = ELEVEN_AGENTS || [];
        if (!mounted) return;
        setAgents(curated);
        if (curated[0]?.id) setSelectedAgent(curated[0].id);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Camera check
  const startPreview = async () => {
    setError("");
    setChecking(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (e: any) {
      setError(e?.message || "Camera/Mic permission denied");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Lazy start preview (after first paint)
    const id = requestAnimationFrame(() => startPreview());
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  }, [stream]);

  const onStart = () => {
    if (!selectedAgent) return;
    navigate(`/interview?agentId=${encodeURIComponent(selectedAgent)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="w-full border-b">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold">Interview Setup</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section aria-labelledby="agent-heading" className="mb-8">
          <h2 id="agent-heading" className="sr-only">Select interviewer agent</h2>
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Interviewer Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger aria-label="Select interviewer agent">
                    <SelectValue placeholder={agents.length ? "Choose an agent" : "No agents available"} />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectGroup>
                      <SelectLabel>Your Agents</SelectLabel>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={onStart} disabled={!selectedAgent || !stream}>
                  Start Interview
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section aria-labelledby="check-heading">
          <h2 id="check-heading" className="sr-only">Camera and microphone check</h2>
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Ensure your camera and microphone are working. This preview is not recorded.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={startPreview} disabled={checking}>Retry Check</Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Setup;
