import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { generateInterviewPlan, type Persona } from "@/lib/ai";
import { Briefcase, Heart, ArrowRight, CheckCircle2 } from "lucide-react";

const goals = [
  {
    id: "job",
    title: "Job Seeking",
    description: "Perfect for interviews, LinkedIn profiles, and professional networking",
    icon: Briefcase,
    color: "primary",
    questions: [
      "Tell me about yourself and your professional background.",
      "What are your greatest strengths and how do they apply to this role?",
      "Describe a challenging project you've worked on and how you overcame obstacles.",
      "Where do you see yourself in 5 years professionally?",
      "What motivates you in your work and career?"
    ]
  },
  {
    id: "dating",
    title: "Dating",
    description: "Great for dating apps, social profiles, and personal introductions",
    icon: Heart,
    color: "accent",
    questions: [
      "What makes you unique and interesting as a person?",
      "Describe your ideal relationship and what you're looking for.",
      "What are your hobbies and passions outside of work?",
      "Tell me about a memorable experience or adventure you've had.",
      "What values are most important to you in life and relationships?"
    ]
  }
];

interface OnboardingSectionProps {
  onGoalSelect: (goal: string, questions: string[]) => void;
}

export function OnboardingSection({ onGoalSelect }: OnboardingSectionProps) {
  const { toast } = useToast();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState<Persona>("professional");
  const [count, setCount] = useState<number>(5);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem("PPLX_API_KEY") || "");
  const [loading, setLoading] = useState(false);

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const startInterview = async () => {
    if (!selectedGoal) return;
    const goal = goals.find((g) => g.id === selectedGoal)!;

    try {
      setLoading(true);
      let questions: string[] = goal.questions;

      if (apiKey) {
        localStorage.setItem("PPLX_API_KEY", apiKey);
        localStorage.setItem("INTERVIEW_PERSONA", persona);
        localStorage.setItem("INTERVIEW_TOPIC", topic || goal.title);
        localStorage.setItem("INTERVIEW_INTENT", selectedGoal === "job" ? "Job Seeking" : "Dating");
        localStorage.setItem("INTERVIEW_COUNT", String(count));
        const intent = selectedGoal === "job" ? "Job Seeking" : "Dating";
        const aiQuestions = await generateInterviewPlan({
          topic: topic || goal.title,
          intent,
          persona,
          questionsCount: count,
          apiKey,
        });
        if (aiQuestions?.length) questions = aiQuestions;
      } else {
        toast({
          title: "Using sample questions",
          description: "Add a Perplexity API key for AI-tailored questions.",
        });
      }

      onGoalSelect(selectedGoal, questions);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "AI generation failed",
        description: e?.message || "Falling back to sample questions.",
        variant: "destructive",
      });
      onGoalSelect(selectedGoal, goal.questions);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center space-y-8 mb-12">
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Choose Your Goal
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select what you want to create your interview for, and we'll generate 
            the perfect questions tailored to your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {goals.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selectedGoal === goal.id;
            
            return (
              <Card 
                key={goal.id}
                className={`p-8 cursor-pointer transition-studio hover:scale-105 border-2 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-glow' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleGoalSelect(goal.id)}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-4 rounded-full ${
                      goal.color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        goal.color === 'primary' ? 'text-primary' : 'text-accent'
                      }`} />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-display font-semibold">
                      {goal.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {goal.description}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Sample Questions:
                    </h4>
                    <ul className="space-y-2">
                      {goal.questions.slice(0, 3).map((question, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    variant={isSelected ? "hero" : "outline"} 
                    className="w-full group"
                    disabled={selectedGoal !== null && !isSelected}
                  >
                    {isSelected ? "Selected!" : "Choose This Goal"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {selectedGoal && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">Interview Setup</h4>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or objective</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Prepare for a Google PM interview"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
            </Card>

            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">AI Settings</h4>
              <p className="text-sm text-muted-foreground">
                Enter your Perplexity API key to generate intelligent, adaptive questions. Stored locally only.
              </p>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Perplexity API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pplx_..."
                />
              </div>
              <Button onClick={startInterview} variant="hero" disabled={loading} className="group">
                {loading ? "Generating…" : "Start Interview"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              {!apiKey && (
                <p className="text-xs text-muted-foreground">No key? We'll use sample questions.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
