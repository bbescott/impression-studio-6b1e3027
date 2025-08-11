import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useConversation } from "@11labs/react";
import { supabase } from "@/integrations/supabase/client";

export default function LiveCall() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [agentId, setAgentId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("9BWtsMINqrJLrRacOk9x");
  const [title, setTitle] = useState<string>("");
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [profileSummary, setProfileSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const startedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Prepare overrides after we have all setup info
  const overrides = useMemo(() => {
    const baseIntro = `Interview Title: ${title || 'Untitled'}\n` +
      (profileUrl ? `Reference URL: ${profileUrl}\n` : "") +
      (profileSummary ? `Profile Summary (use as context):\n${profileSummary}\n` : "");
    const prompt = `${baseIntro}\nInstructions: You are an expert interviewer. Conduct a natural voice conversation. Ask one question at a time. Adapt based on answers. Wrap up when satisfied (no fixed number of questions). Avoid reading context verbatim; use it to personalize.`;
    return {
      agent: {
        prompt: { prompt },
        firstMessage: `Hi! Let’s begin our interview about “${title || 'your topic'}”. I’ll guide you with a few questions. Ready?`,
        language: 'en',
      },
      tts: { voiceId },
    } as any;
  }, [title, profileUrl, profileSummary, voiceId]);

  const conversation = useConversation({
    overrides,
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false),
    onMessage: (msg: any) => {
      try {
        const role = (msg as any)?.role || (msg as any)?.source;
        const text = (msg as any)?.text || (msg as any)?.delta || (msg as any)?.message;
        const isFinal = (msg as any)?.isFinal || (msg as any)?.final;
        if (text && (role === 'user' || role === 'assistant' || isFinal)) {
          setTranscript(prev => prev ? `${prev}\n${role || 'agent'}: ${text}` : `${role || 'agent'}: ${text}`);
        }
      } catch (e) {
        console.log('message parse', e, msg);
      }
    },
    onError: (e: any) => {
      console.error('Conversation error', e);
      toast({ title: 'Call error', description: e?.message || 'Try again later', variant: 'destructive' });
    }
  });

  // Load setup + fetch profile summary
  useEffect(() => {
    (async () => {
      try {
        const a = localStorage.getItem('ELEVENLABS_AGENT_ID') || '';
        const v = localStorage.getItem('TTS_VOICE_ID') || '9BWtsMINqrJLrRacOk9x';
        const t = localStorage.getItem('INTERVIEW_TITLE') || '';
        const p = localStorage.getItem('PROFILE_URL') || '';
        setAgentId(a); setVoiceId(v); setTitle(t); setProfileUrl(p);
        if (p) {
          const { data, error } = await supabase.functions.invoke('fetch-profile-context', { body: { url: p, title: t } });
          if (error) throw new Error(error.message);
          const summary = (data as any)?.summary as string | undefined;
          if (summary) setProfileSummary(summary);
        }
      } catch (e: any) {
        console.warn('Profile context fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-start call when setup is loaded; run only once
  useEffect(() => {
    (async () => {
      if (loading || startedRef.current) return;
      if (!agentId) {
        toast({ title: 'Agent missing', description: 'Select an ElevenLabs agent in Setup.', variant: 'destructive' });
        return;
      }
      startedRef.current = true; // prevent multiple attempts
      try {
        setConnecting(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { facingMode: 'user' }
        });
        localStreamRef.current = stream;
        if (videoRef.current) {
          try {
            // @ts-ignore
            videoRef.current.srcObject = stream as any;
          } catch {
            // Fallback no-op
          }
        }
        try {
          const { data } = await supabase.functions.invoke('elevenlabs-signed-url', { body: { agentId } });
          const url = (data as any)?.signed_url || (data as any)?.url;
          if (url) {
            await (conversation as any).startSession({ url } as any);
          } else {
            await conversation.startSession({ agentId });
          }
        } catch {
          await conversation.startSession({ agentId });
        }
        toast({ title: 'Connected', description: 'You are now in a live call with the AI interviewer.' });
      } catch (e: any) {
        console.error('Failed to start call', e);
        toast({ title: 'Failed to start', description: e?.message || 'Mic/Camera permission or Agent issue.', variant: 'destructive' });
        startedRef.current = false; // allow retry on manual navigation
      } finally {
        setConnecting(false);
      }
    })();
  }, [loading, agentId]);

  // Cleanup local media and session on unmount
  useEffect(() => {
    return () => {
      try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
      try { (conversation as any).endSession?.(); } catch {}
    };
  }, []);

  const endCall = async () => {
    try { await conversation.endSession(); } catch {}
    navigate('/');
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-semibold">Your Interview Session</h1>
          <Button variant="secondary" onClick={endCall}>{isConnected ? 'End Session' : 'Back'}</Button>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Agent: <span className="font-medium">{agentId || '—'}</span></span>
            <span>Voice: <span className="font-medium">{voiceId}</span></span>
          </div>
          <p className="text-muted-foreground">Title: {title || '—'}</p>
          {profileUrl && (
            <p className="text-muted-foreground break-all">Profile URL: {profileUrl}</p>
          )}
          <div className="rounded-lg p-3 bg-secondary/60 border">
            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-[12]">
              {loading ? 'Preparing context…' : (profileSummary || 'No extra context provided.')}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Your Camera Preview</h4>
            <div className="rounded-lg overflow-hidden border bg-muted">
              <video ref={videoRef} className="w-full aspect-video" autoPlay muted playsInline />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Transcript</h4>
            <div className="h-64 overflow-auto rounded-lg border p-3 bg-card/50">
              <pre className="text-sm whitespace-pre-wrap">{transcript || (connecting ? 'Connecting to agent…' : 'Say hello to start!')}</pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
