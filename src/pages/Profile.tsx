import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  // Creator profile state (Basic)
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bio, setBio] = useState("");
  const [goals, setGoals] = useState("");
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");

  // Advanced
  const [linksStr, setLinksStr] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [dosStr, setDosStr] = useState("");
  const [dontsStr, setDontsStr] = useState("");
  const [ctasStr, setCtasStr] = useState("");
  const [platformPrefsStr, setPlatformPrefsStr] = useState("");
  const [cadence, setCadence] = useState("");
  const [autoGen, setAutoGen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Library assets
  interface LibraryAsset { id: string; type: string; title: string | null; description: string | null; created_at: string; thumbnail_path: string | null; video_path: string | null; }
  const [assets, setAssets] = useState<LibraryAsset[]>([]);

  // SEO
  useEffect(() => {
    document.title = "Personal Brand Hub – Profile & Library";
    const desc = "Describe yourself, manage your library, and grow your personal brand.";
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
        navigate('/auth?redirect=/profile');
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

  // Load creator profile once we have the userId
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        // If no row, that's fine; user can save later
        setProfileLoading(false);
        return;
      }
      if (data) {
        setBio(data.bio || "");
        setGoals(data.goals || "");
        setNiche(data.niche || "");
        setAudience(data.audience || "");
        setTone(data.tone || "");
        const links = Array.isArray(data.links) ? data.links : [];
        setLinksStr(links.join(', '));
        const kws = Array.isArray(data.brand_keywords) ? data.brand_keywords : [];
        setKeywordsStr(kws.join(', '));
        const rawDD: any = (data as any).do_donts || {};
        setDosStr(Array.isArray(rawDD.do) ? rawDD.do.join('\n') : "");
        setDontsStr(Array.isArray(rawDD.dont) ? rawDD.dont.join('\n') : "");
        const ctas = Array.isArray((data as any).ctas) ? (data as any).ctas : [];
        setCtasStr(ctas.join(', '));
        const pp: any = (data as any).platform_prefs;
        setPlatformPrefsStr(pp && typeof pp === 'object' && 'notes' in pp ? pp.notes : "");
        setCadence(data.cadence || "");
        setAutoGen(!!data.auto_generation_enabled);
      }
      setProfileLoading(false);
    };
    loadProfile();
  }, [userId]);

  // Load library assets for the user
  useEffect(() => {
    const loadAssets = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('library_assets')
        .select('id, type, title, description, created_at, thumbnail_path, video_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error) setAssets((data as any) || []);
    };
    loadAssets();
  }, [userId]);

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

  const saveProfile = async () => {
    if (!userId) return;
    try {
      setSavingProfile(true);
      const payload: any = {
        user_id: userId,
        bio,
        goals,
        niche,
        audience,
        tone,
        links: linksStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        brand_keywords: keywordsStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        do_donts: {
          do: dosStr
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          dont: dontsStr
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        ctas: ctasStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        platform_prefs: { notes: platformPrefsStr },
        cadence,
        auto_generation_enabled: autoGen,
      };
      const { error } = await supabase
        .from('creator_profiles')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'Your creator profile has been updated.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <section className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Your Profile</h1>
          <Button onClick={handleNewRecording}>Start new recording</Button>
        </div>

        {/* Creator Profile */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Creator Profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself" value={bio} onChange={(e) => setBio(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea id="goals" placeholder="What are you trying to achieve?" value={goals} onChange={(e) => setGoals(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Input id="niche" placeholder="e.g., Career coaching, Dating, Tech" value={niche} onChange={(e) => setNiche(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Input id="audience" placeholder="Who are you speaking to?" value={audience} onChange={(e) => setAudience(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tone">Tone</Label>
              <Input id="tone" placeholder="e.g., Professional, Empathetic, Playful" value={tone} onChange={(e) => setTone(e.target.value)} disabled={profileLoading} />
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Advanced options</p>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="outline">{advancedOpen ? 'Hide Advanced' : 'Show Advanced'}</Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="links">Links (comma-separated)</Label>
                  <Input id="links" placeholder="https://site.com, https://calendar.link" value={linksStr} onChange={(e) => setLinksStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Brand keywords (comma-separated)</Label>
                  <Input id="keywords" placeholder="e.g., authenticity, growth, storytelling" value={keywordsStr} onChange={(e) => setKeywordsStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dos">Do</Label>
                  <Textarea id="dos" placeholder="One per line" value={dosStr} onChange={(e) => setDosStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donts">Don't</Label>
                  <Textarea id="donts" placeholder="One per line" value={dontsStr} onChange={(e) => setDontsStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctas">CTAs (comma-separated)</Label>
                  <Input id="ctas" placeholder="e.g., Subscribe, Book a call" value={ctasStr} onChange={(e) => setCtasStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefs">Platform preferences</Label>
                  <Textarea id="prefs" placeholder="Notes on platforms, formats, hashtags..." value={platformPrefsStr} onChange={(e) => setPlatformPrefsStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadence">Cadence</Label>
                  <Input id="cadence" placeholder="e.g., 3 posts/week" value={cadence} onChange={(e) => setCadence(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="autogen" checked={autoGen} onCheckedChange={setAutoGen} />
                  <Label htmlFor="autogen">Enable auto-generation of post ideas</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-6 flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Profile'}</Button>
          </div>
        </Card>

        {/* Library */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Library</h2>
          <Tabs defaultValue="full">
            <TabsList>
              <TabsTrigger value="full">Full Interviews</TabsTrigger>
              <TabsTrigger value="monologue">Monologues</TabsTrigger>
              <TabsTrigger value="short">Shorts</TabsTrigger>
            </TabsList>
            <TabsContent value="full">
              {assets.filter(a => a.type === 'full').length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">No full interviews yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {assets.filter(a => a.type === 'full').map(a => (
                    <div key={a.id} className="rounded-md border p-3">
                      <p className="font-medium truncate">{a.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="monologue">
              {assets.filter(a => a.type === 'monologue').length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">No monologues yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {assets.filter(a => a.type === 'monologue').map(a => (
                    <div key={a.id} className="rounded-md border p-3">
                      <p className="font-medium truncate">{a.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="short">
              {assets.filter(a => a.type === 'short').length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">No shorts yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {assets.filter(a => a.type === 'short').map(a => (
                    <div key={a.id} className="rounded-md border p-3">
                      <p className="font-medium truncate">{a.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

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
