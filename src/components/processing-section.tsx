import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Download, 
  Share2, 
  CheckCircle2, 
  Loader2,
  Play,
  Eye
} from "lucide-react";

interface Recording {
  questionIndex: number;
  question: string;
  videoBlob?: Blob;
  duration: number;
}

interface ProcessingSectionProps {
  recordings: Recording[];
  goal: string;
  onStartOver: () => void;
}

const processingSteps = [
  { id: 1, label: "Uploading your responses", duration: 2000 },
  { id: 2, label: "Generating AI interviewer voice", duration: 3000 },
  { id: 3, label: "Enhancing audio quality", duration: 2500 },
  { id: 4, label: "Creating studio background", duration: 2000 },
  { id: 5, label: "Stitching final video", duration: 3500 },
];

export function ProcessingSection({ recordings, goal, onStartOver }: ProcessingSectionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Simulate processing steps
    const processSteps = async () => {
      for (let i = 0; i < processingSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, processingSteps[i].duration));
        setCurrentStep(i + 1);
      }
      
      // Simulate final video creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock video URL (in real app, this would be the processed video)
      const mockVideoBlob = new Blob(['mock video'], { type: 'video/mp4' });
      const url = URL.createObjectURL(mockVideoBlob);
      setVideoUrl(url);
      setIsComplete(true);
    };

    processSteps();

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  const totalSteps = processingSteps.length;
  const progress = (currentStep / totalSteps) * 100;

  const shareVideo = async () => {
    if (navigator.share && videoUrl) {
      try {
        await navigator.share({
          title: 'My AI Interview',
          text: `Check out my professional interview created with AI Personal Podcast Studio!`,
          url: window.location.origin,
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.origin);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `ai-interview-${goal}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="container max-w-4xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center space-y-6">
            <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold">
              Your Interview is Ready!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We've created a professional podcast-style video with AI-generated 
              interviewer questions and your responses.
            </p>
          </div>

          {/* Video Preview */}
          <Card className="p-6 space-y-6">
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              <div className="w-full h-full bg-gradient-to-br from-background/20 to-background/40 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Play className="w-16 h-16 text-white/80 mx-auto" />
                  <div className="text-white/90">
                    <h3 className="text-lg font-semibold">AI Interview - {goal}</h3>
                    <p className="text-sm opacity-80">
                      {recordings.length} questions • {Math.round(recordings.reduce((acc, r) => acc + r.duration, 0) / 60)} min
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="flex-1 sm:flex-none">
                <Play className="w-5 h-5" />
                Watch Full Video
              </Button>
              <Button variant="outline" size="lg" onClick={downloadVideo}>
                <Download className="w-5 h-5" />
                Download Video
              </Button>
              <Button variant="outline" size="lg" onClick={shareVideo}>
                <Share2 className="w-5 h-5" />
                Share Video
              </Button>
            </div>
          </Card>

          {/* Session Summary */}
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Session Summary</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Goal</div>
                <div className="font-medium capitalize">{goal} Interview</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Questions Answered</div>
                <div className="font-medium">{recordings.length} questions</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Duration</div>
                <div className="font-medium">
                  {Math.round(recordings.reduce((acc, r) => acc + r.duration, 0) / 60)} minutes
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="warm" size="lg" onClick={onStartOver}>
              Create Another Interview
            </Button>
            <Button variant="outline" size="lg">
              <Eye className="w-5 h-5" />
              View All My Videos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="container max-w-2xl mx-auto space-y-8">
        {/* Processing Header */}
        <div className="text-center space-y-6">
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
            <Sparkles className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            Creating Your Video
          </h1>
          <p className="text-xl text-muted-foreground">
            Our AI is processing your responses and creating a professional 
            podcast-style interview video.
          </p>
        </div>

        {/* Progress */}
        <Card className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Processing your interview...</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Current Step */}
          <div className="space-y-4">
            {processingSteps.map((step, idx) => {
              const isActive = idx === currentStep - 1;
              const isCompleted = idx < currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary/10 border border-primary/20' 
                      : isCompleted 
                        ? 'bg-green-500/10' 
                        : 'bg-muted/50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{step.id}</span>
                    )}
                  </div>
                  <span className={`font-medium ${
                    isActive 
                      ? 'text-foreground' 
                      : isCompleted 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Processing Info */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              This usually takes 2-3 minutes. Feel free to grab a coffee while we work! ☕
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}