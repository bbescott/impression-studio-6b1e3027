import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscriptRow {
  id: string;
  session_id: string;
  created_at: string;
  question_index: number;
  duration_seconds: number | null;
  video_path: string | null;
}

interface SessionSummary {
  sessionId: string;
  createdAt: string;
  questionCount: number;
  totalDuration: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // SEO
  useEffect(() => {
    document.title = "Your Profile – Recordings Library";
    const desc = "Start a new recording or manage and resume your previous sessions.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name','description'); document.head.appendChild(meta); }
    meta.setAttribute('content', desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel','canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', `${window.location.origin}/profile`);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast({ title: 'Failed to load sessions', description: error.message, variant: 'destructive' });
      } else {
        setRows((data as any) || []);
      }
      setLoading(false);
    };
    init();
  }, [navigate, toast]);

  const sessions: SessionSummary[] = useMemo(() => {
    const map = new Map<string, TranscriptRow[]>();
    rows.forEach(r => {
      const list = map.get(r.session_id) || [];
      list.push(r);
      map.set(r.session_id, list);
    });
    const summaries: SessionSummary[] = [];
    map.forEach((list, id) => {
      const sorted = [...list].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const createdAt = sorted[0]?.created_at || new Date().toISOString();
      const totalDuration = list.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);
      summaries.push({ sessionId: id, createdAt, questionCount: list.length, totalDuration });
    });
    return summaries.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rows]);

  const handleNewRecording = () => {
    try { localStorage.removeItem('RESUME_SESSION_ID'); } catch {}
    navigate('/setup');
  };

  const handleResume = (sessionId: string) => {
    try { localStorage.setItem('RESUME_SESSION_ID', sessionId); } catch {}
    toast({ title: 'Session ready to resume', description: 'Continue setup to pick up where you left off.' });
    navigate('/setup');
  };

  const handleDelete = async (sessionId: string) => {
    if (!userId) return;
    if (!confirm('Delete this session and all its recordings? This cannot be undone.')) return;
    try {
      // 1) Delete files in storage
      const { data: fileList, error: listErr } = await supabase.storage
        .from('recordings')
        .list(`${userId}/${sessionId}`, { limit: 100, offset: 0 });
      if (listErr) throw listErr;
      const paths = (fileList || []).map(f => `${userId}/${sessionId}/${f.name}`);
      if (paths.length) {
        const { error: rmErr } = await supabase.storage.from('recordings').remove(paths);
        if (rmErr) throw rmErr;
      }
      // 2) Delete DB rows
      const { error: delErr } = await supabase.from('transcripts').delete().eq('session_id', sessionId);
      if (delErr) throw delErr;
      // 3) Update UI
      setRows(prev => prev.filter(r => r.session_id !== sessionId));
      toast({ title: 'Session deleted', description: 'Cloud storage and records removed.' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Check your permissions and try again.', variant: 'destructive' });
    }
  };

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <section className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Your Profile</h1>
          <Button onClick={handleNewRecording}>Start new recording</Button>
        </div>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Sessions</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet. Start your first recording.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.sessionId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="font-medium">Session {s.sessionId.slice(0,8)}…</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()} · {s.questionCount} answers · {s.totalDuration}s</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleResume(s.sessionId)}>Resume</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(s.sessionId)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
