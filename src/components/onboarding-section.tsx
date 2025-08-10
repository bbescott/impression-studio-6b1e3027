import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { generateInterviewPlan, generateInterviewPlanWithGemini, type Persona } from "@/lib/ai";

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

  const startInterview = async () => {
    const topicValue = topic.trim() || "My Interview";

    // Auto-select dating agent for dating-related topics
    const DATING_AGENT_ID = "agent_3301k288cbm4ejmvsqrxkcnf16vk";
    const isDatingTopic = /(\b|\s)(dating|relationship|romance|love)(\b|\s)/i.test(topicValue);

    let selectedAgent = localStorage.getItem('ELEVENLABS_AGENT_ID') || undefined;
    if (isDatingTopic && selectedAgent !== DATING_AGENT_ID) {
      localStorage.setItem('ELEVENLABS_AGENT_ID', DATING_AGENT_ID);
      selectedAgent = DATING_AGENT_ID;
      toast({ title: "Dating topic detected", description: "Using your Dating Interviewer agent.", duration: 2500 });
    }

    // Require agent selection before generating questions
    if (!selectedAgent) {
      toast({ title: "Select an Interviewer Agent first", description: "Please complete setup before starting.", variant: "destructive" });
      navigate('/setup');
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