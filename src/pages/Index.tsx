import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HeroSection } from "@/components/hero-section";
import { RecordingStudio } from "@/components/recording-studio";
import { ProcessingSection } from "@/components/processing-section";
import { generateInterviewPlanWithGemini } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";

type AppState = 'hero' | 'recording' | 'processing';

interface Recording {
  questionIndex: number;
  question: string;
  videoBlob?: Blob;
  duration: number;
}

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('hero');
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    navigate('/setup');
  };

  const handleGoalSelect = (goal: string, goalQuestions: string[]) => {
    setSelectedGoal(goal);
    setQuestions(goalQuestions);
    setCurrentState('recording');
  };

  const handleRecordingComplete = (sessionRecordings: Recording[]) => {
    setRecordings(sessionRecordings);
    setCurrentState('processing');
  };

  const handleStartOver = () => {
    setSelectedGoal('');
    setQuestions([]);
    setRecordings([]);
    navigate('/setup');
  };

  const handleBackToOnboarding = () => {
    navigate('/setup');
  };

  useEffect(() => {
    (async () => {
      if (localStorage.getItem('JUST_FINISHED_SETUP') === '1') {
        localStorage.removeItem('JUST_FINISHED_SETUP');
        const title = localStorage.getItem('INTERVIEW_TITLE') || 'Interview';
        setSelectedGoal(title);
        try {
          const plan = await generateInterviewPlanWithGemini({ topic: title, intent: 'Interview', persona: 'professional', questionsCount: 6 });
          setQuestions(Array.isArray(plan) && plan.length ? plan : [`Tell me about yourself in relation to "${title}".`]);
        } catch {
          setQuestions([`Tell me about yourself in relation to "${title}".`]);
        }
        setCurrentState('recording');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {currentState === 'hero' && (
        <HeroSection onGetStarted={handleGetStarted} isAuthenticated={isAuthenticated} />
      )}
      
      {currentState === 'recording' && (
        <RecordingStudio
          questions={questions}
          goal={selectedGoal}
          onComplete={handleRecordingComplete}
          onBack={handleBackToOnboarding}
        />
      )}
      
      {currentState === 'processing' && (
        <ProcessingSection
          recordings={recordings}
          goal={selectedGoal}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
};

export default Index;
