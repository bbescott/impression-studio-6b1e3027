import { useState } from "react";
import { HeroSection } from "@/components/hero-section";
import { OnboardingSection } from "@/components/onboarding-section";
import { RecordingStudio } from "@/components/recording-studio";
import { ProcessingSection } from "@/components/processing-section";

type AppState = 'hero' | 'onboarding' | 'recording' | 'processing';

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

  const handleGetStarted = () => {
    setCurrentState('onboarding');
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
    setCurrentState('onboarding');
    setSelectedGoal('');
    setQuestions([]);
    setRecordings([]);
  };

  const handleBackToOnboarding = () => {
    setCurrentState('onboarding');
  };

  return (
    <div className="min-h-screen bg-background">
      {currentState === 'hero' && (
        <HeroSection onGetStarted={handleGetStarted} />
      )}
      
      {currentState === 'onboarding' && (
        <OnboardingSection onGoalSelect={handleGoalSelect} />
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
