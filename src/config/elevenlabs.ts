export type ElevenAgent = {
  id: string; // ElevenLabs Agent ID
  name: string;
  description?: string;
  voiceId?: string; // Optional default TTS voice for previews/questions
};

// Add your curated public Agent IDs here. End-users will simply select from this list.
// Example:
// { id: "agnt_123", name: "Product Interviewer (Aria)", voiceId: "9BWtsMINqrJLrRacOk9x" }
export const ELEVEN_AGENTS: ElevenAgent[] = [
  { id: "agent_9801k286kms6e6f83fj5ex1ngmpc", name: "Default Interviewer Agent", voiceId: "9BWtsMINqrJLrRacOk9x" },
];
