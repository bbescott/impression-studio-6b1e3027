import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Video, Sparkles, Play } from "lucide-react";
import studioHero from "@/assets/studio-hero.jpg";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${studioHero})` }}
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Podcast Studio</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-display font-bold bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
            Create Professional
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              AI Interviews
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Answer AI-generated questions and get a polished podcast-style video
            perfect for job applications, dating profiles, and personal branding.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="xl" className="group" onClick={onGetStarted}>
              <Play className="w-5 h-5 transition-transform group-hover:scale-110" />
              Start Recording
            </Button>
            <Button variant="outline" size="xl">
              <Video className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 bg-card/50 border-border backdrop-blur-sm transition-studio hover:bg-card/70 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">AI Questions</h3>
                <p className="text-muted-foreground text-sm">
                  Smart, tailored questions for your specific goals
                </p>
              </div>
            </Card>
            
            <Card className="p-6 bg-card/50 border-border backdrop-blur-sm transition-studio hover:bg-card/70 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Video className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg">Studio Quality</h3>
                <p className="text-muted-foreground text-sm">
                  Professional editing with AI interviewer voice
                </p>
              </div>
            </Card>
            
            <Card className="p-6 bg-card/50 border-border backdrop-blur-sm transition-studio hover:bg-card/70 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">Ready to Share</h3>
                <p className="text-muted-foreground text-sm">
                  Export and share your professional interview video
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}