import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";

interface RecordingStudioProps {
  questions: string[];
  goal: string;
  onComplete: (recordings: Recording[]) => void;
  onBack: () => void;
}

interface Recording {
  questionIndex: number;
  question: string;
  videoBlob?: Blob;
  duration: number;
}

export function RecordingStudio({ questions, goal, onComplete, onBack }: RecordingStudioProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setMediaStream(stream);
      setHasPermissions(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Permission denied:", error);
    }
  };

  const startRecording = () => {
    if (!mediaStream) return;

    const mediaRecorder = new MediaRecorder(mediaStream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const newRecording: Recording = {
        questionIndex: currentQuestion,
        question: questions[currentQuestion],
        videoBlob: blob,
        duration: recordingTime
      };
      
      setRecordings(prev => [
        ...prev.filter(r => r.questionIndex !== currentQuestion),
        newRecording
      ]);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const retakeRecording = () => {
    setRecordings(prev => prev.filter(r => r.questionIndex !== currentQuestion));
    setRecordingTime(0);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setRecordingTime(0);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setRecordingTime(0);
    }
  };

  const completeSession = () => {
    onComplete(recordings);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentRecording = recordings.find(r => r.questionIndex === currentQuestion);
  const allQuestionsAnswered = questions.every((_, idx) => 
    recordings.some(r => r.questionIndex === idx)
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <Card className="p-8 max-w-md mx-auto text-center space-y-6">
          <div className="p-4 rounded-full bg-accent/10 w-fit mx-auto">
            <Video className="w-8 h-8 text-accent" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-display font-semibold">Camera & Microphone Access</h3>
            <p className="text-muted-foreground">
              We need access to your camera and microphone to record your interview responses.
            </p>
          </div>
          <Button variant="hero" onClick={requestPermissions}>
            Grant Permissions
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            Back to Goals
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-display font-semibold">Recording Studio</h1>
            <p className="text-muted-foreground capitalize">{goal} Interview</p>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Video Preview */}
          <Card className="p-6 space-y-6">
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  REC {formatTime(recordingTime)}
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isRecording ? "destructive" : "hero"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className="px-8"
              >
                {isRecording ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Recording
                  </>
                )}
              </Button>

              {currentRecording && !isRecording && (
                <Button variant="outline" onClick={retakeRecording}>
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </Button>
              )}
            </div>
          </Card>

          {/* Question Panel */}
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold">Current Question</span>
                {currentRecording && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-lg leading-relaxed">
                  {questions[currentQuestion]}
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Recording Tips:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Look directly at the camera
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Speak clearly and at a natural pace
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  Take your time to think before answering
                </li>
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>
              
              {currentQuestion < questions.length - 1 ? (
                <Button 
                  variant="default" 
                  onClick={nextQuestion}
                  className="flex-1"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : allQuestionsAnswered ? (
                <Button 
                  variant="hero" 
                  onClick={completeSession}
                  className="flex-1"
                >
                  Complete Session
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  disabled
                  className="flex-1"
                >
                  Answer All Questions
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Question Overview */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Session Overview</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {questions.map((question, idx) => {
              const recording = recordings.find(r => r.questionIndex === idx);
              const isCurrent = idx === currentQuestion;
              
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                    isCurrent 
                      ? 'border-primary bg-primary/5' 
                      : recording 
                        ? 'border-green-500 bg-green-500/5' 
                        : 'border-border hover:border-border/70'
                  }`}
                  onClick={() => setCurrentQuestion(idx)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Q{idx + 1}</span>
                    {recording && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {question}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}