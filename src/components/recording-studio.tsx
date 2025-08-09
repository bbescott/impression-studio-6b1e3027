import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { generateFollowUpQuestion, generateFollowUpQuestionWithGemini, generateVideoPreferencesWithGemini, type Persona } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mic, 
  Video, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Volume2
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
  const [summaries, setSummaries] = useState<Record<number, string>>({});
  const [questionOverrides, setQuestionOverrides] = useState<Record<number, string>>({});
  const [apiKey, setApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [persona, setPersona] = useState<Persona>('professional');
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [voiceId, setVoiceId] = useState<string>("9BWtsMINqrJLrRacOk9x");
  const [transcripts, setTranscripts] = useState<Record<number, string>>({});
  const VOICES = [
    { id: "9BWtsMINqrJLrRacOk9x", name: "Aria" },
    { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
    { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
    { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
    { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
    { id: "SAz9YHcvj6GT2YYXdXww", name: "River" },
    { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
    { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
    { id: "bIHbv24MWmeRgasZH58o", name: "Will" },
    { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica" },
    { id: "cjVigY5qzO86Huf0OWal", name: "Eric" },
    { id: "iP95p4xoKVk53GoZ742B", name: "Chris" },
    { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
    { id: "pqHfZKP75CvOlQylNhV4", name: "Bill" },
  ];

  const getQuestionText = (idx: number) => questionOverrides[idx] || questions[idx];

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

  // Separate effect to connect video element when stream is ready
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      console.log("Video element connected to stream");
    }
  }, [mediaStream]);

  useEffect(() => {
    const k = localStorage.getItem('PPLX_API_KEY') || '';
    setApiKey(k);
  }, []);

  // Helpers for transcription and follow-up
  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });

  const transcribeAndGenerateFollowUp = async (blob: Blob) => {
    try {
      toast({ title: "Analyzing answer…", description: "Transcribing and preparing the next question." });
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64 },
      });
      if (error) throw new Error(error.message);

      const text = (data as any)?.text as string;
      setTranscripts((prev) => ({ ...prev, [currentQuestion]: text || '' }));

      const history = Array.from({ length: currentQuestion + 1 }, (_, i) => ({
        question: getQuestionText(i),
        summary: i === currentQuestion ? (text || '') : (prevTranscriptsRef.current[i] || ''),
      }));

      const nextQ = await generateFollowUpQuestionWithGemini({ persona, intent: 'Interview', history });
      setQuestionOverrides((prev) => ({ ...prev, [currentQuestion + 1]: nextQ }));

      // Play next question automatically with selected voice
      const tts = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: nextQ, voiceId },
      });
      const audioBase64 = (tts.data as any)?.audioContent as string;
      if (audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        await audio.play();
      }
      toast({ title: "Next question ready", description: "Tailored based on your last answer." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Auto follow-up failed", description: e?.message || 'Try again later.', variant: 'destructive' });
    }
  };

  // Keep a ref snapshot of transcripts to avoid stale closure inside async
  const prevTranscriptsRef = useRef<Record<number, string>>({});
  useEffect(() => {
    prevTranscriptsRef.current = transcripts;
  }, [transcripts]);

  const requestPermissions = async () => {
    try {
      console.log("Requesting camera and microphone permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      console.log("Permissions granted, stream obtained:", stream);
      setMediaStream(stream);
      setHasPermissions(true);
    } catch (error) {
      console.error("Permission denied or error:", error);
      setHasPermissions(false);
    }
  };

const startRecording = () => {
    if (!mediaStream) {
      console.error("No media stream available for recording");
      return;
    }

    console.log("Starting recording...");
    try {
      let mediaRecorder: MediaRecorder;
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      let created = false;
      for (const mt of mimeTypes) {
        try {
          mediaRecorder = new MediaRecorder(mediaStream, { mimeType: mt });
          console.log('MediaRecorder created with', mt);
          created = true;
          break;
        } catch (e) {
          console.warn('Failed to init MediaRecorder with', mt, e);
        }
      }
      if (!created) {
        mediaRecorder = new MediaRecorder(mediaStream);
        console.log('MediaRecorder created with default options');
      }
      const chunks: Blob[] = [];

      let capturedDuration = 0;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("Recording data available:", event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Recording stopped, creating blob...");
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // Get the duration that was stored when stopping
        const finalDuration = (mediaRecorder as any).finalDuration || 0;
        console.log("Final recording duration from stored value:", finalDuration);
        console.log("Blob size:", blob.size, "bytes");
        console.log("Blob type:", blob.type);
        
        const newRecording: Recording = {
          questionIndex: currentQuestion,
          question: questions[currentQuestion],
          videoBlob: blob,
          duration: finalDuration
        };
        
        console.log("Recording created:", newRecording);
        console.log("Video blob URL:", URL.createObjectURL(blob));
        setRecordings(prev => [
          ...prev.filter(r => r.questionIndex !== currentQuestion),
          newRecording
        ]);
        // Auto-transcribe and generate next question
        transcribeAndGenerateFollowUp(blob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      // Store reference to capture duration later
      mediaRecorderRef.current = mediaRecorder;
      (mediaRecorderRef.current as any).capturedDuration = capturedDuration;
      
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setRecordingTime(0);
      console.log("Recording started successfully");

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Update the captured duration on the mediaRecorder
          if (mediaRecorderRef.current) {
            (mediaRecorderRef.current as any).capturedDuration = newTime;
          }
          console.log("Recording time:", newTime);
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      // Capture the duration BEFORE stopping
      const finalDuration = recordingTime;
      console.log("Capturing duration before stop:", finalDuration);
      
      // Store the duration on the mediaRecorder for the onstop callback
      (mediaRecorderRef.current as any).finalDuration = finalDuration;
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      console.log("Recording stopped with duration:", finalDuration);
    } else {
      console.warn("No active recording to stop");
    }
  };

  const retakeRecording = () => {
    console.log("Retaking recording for question", currentQuestion);
    setRecordings(prev => prev.filter(r => r.questionIndex !== currentQuestion));
    setRecordingTime(0);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      console.log("Moving to next question:", currentQuestion + 1);
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

const completeSession = async () => {
    console.log("Completing session with recordings:", recordings);
    try {
      const history = questions.map((q, i) => ({ question: getQuestionText(i), summary: transcripts[i] || summaries[i] || '' }));
      const { preferences, raw } = await generateVideoPreferencesWithGemini({ history });
      if (preferences) {
        localStorage.setItem('VIDEO_PREFERENCES', JSON.stringify(preferences));
        console.log('Extracted video preferences:', preferences);
      } else {
        console.log('Raw preferences text:', raw);
      }
    } catch (e) {
      console.error('Preference extraction failed', e);
    }
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

const handleGenerateFollowUp = async () => {
    if (!apiKey) {
      // Fallback to Gemini edge function
      setIsGenerating(true);
      try {
        const history = Array.from({ length: currentQuestion + 1 }, (_, i) => ({
          question: getQuestionText(i),
          summary: summaries[i] || '',
        }));
        const intent = 'Interview';
        const nextQ = await generateFollowUpQuestionWithGemini({ persona, intent, history });
        setQuestionOverrides((prev) => ({ ...prev, [currentQuestion + 1]: nextQ }));
        toast({ title: "Next question updated", description: "AI tailored your next question." });
      } catch (e: any) {
        console.error(e);
        toast({ title: "Follow-up failed", description: e?.message || "Try again later.", variant: "destructive" });
      } finally {
        setIsGenerating(false);
      }
      return;
    }
    setIsGenerating(true);
    try {
      const history = Array.from({ length: currentQuestion + 1 }, (_, i) => ({
        question: getQuestionText(i),
        summary: summaries[i] || '',
      }));
      const intent = 'Interview';
      const nextQ = await generateFollowUpQuestion({ persona, intent, history, apiKey });
      setQuestionOverrides((prev) => ({ ...prev, [currentQuestion + 1]: nextQ }));
      toast({ title: "Next question updated", description: "AI tailored your next question." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Follow-up failed", description: e?.message || "Try again later.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
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
              Click "Grant Permissions" and allow access when prompted by your browser.
            </p>
          </div>
          <Button variant="hero" onClick={requestPermissions} size="lg">
            Grant Permissions
          </Button>
          <p className="text-xs text-muted-foreground">
            Your recordings are processed locally and securely
          </p>
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
             Back to Setup
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-display font-semibold">Recording Studio</h1>
            <p className="text-muted-foreground">{goal}</p>
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
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log("Video metadata loaded");
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
              />
              {!hasPermissions && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Requesting camera access...</p>
                  </div>
                </div>
              )}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  REC {formatTime(recordingTime)}
                </div>
              )}
              {currentRecording && !isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Recorded
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
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

              <Button variant="outline" onClick={async () => {
                try {
                  setIsPlayingTTS(true);
                  const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
                    body: { text: getQuestionText(currentQuestion), voiceId },
                  });
                  if (error) throw new Error(error.message);
                  const audioBase64 = (data as any)?.audioContent as string;
                  if (audioBase64) {
                    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
                    await audio.play();
                  }
                } catch (e: any) {
                  console.error(e);
                  toast({ title: 'Could not play AI voice', description: e?.message || 'Try again later', variant: 'destructive' });
                } finally {
                  setIsPlayingTTS(false);
                }
              }}>
                <Volume2 className="w-4 h-4" />
                {isPlayingTTS ? 'Playing…' : 'Play Question (AI)'}
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
                  {getQuestionText(currentQuestion)}
                </p>
              </div>
            </div>

            {/* Interviewer Voice */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Interviewer Voice
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Select value={voiceId} onValueChange={setVoiceId}>
                      <SelectTrigger aria-label="Select interviewer voice">
                        <SelectValue placeholder="Choose a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectLabel>ElevenLabs Voices</SelectLabel>
                        {VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={async () => {
                    try {
                      setIsPlayingTTS(true);
                      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
                        body: { text: "Hi, I’ll be your interviewer voice.", voiceId },
                      });
                      if (error) throw new Error(error.message);
                      const audioBase64 = (data as any)?.audioContent as string;
                      if (audioBase64) {
                        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
                        await audio.play();
                      }
                    } catch (e: any) {
                      console.error(e);
                      toast({ title: 'Could not preview voice', description: e?.message || 'Try again later', variant: 'destructive' });
                    } finally {
                      setIsPlayingTTS(false);
                    }
                  }}>
                    <Volume2 className="w-4 h-4" /> Preview
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Recording Tips:
                </h4>
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
                    {getQuestionText(idx)}
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
