export type ElevenAgent = {
  id: string; // ElevenLabs Agent ID
  name: string;
  description?: string;
  voiceId?: string; // Optional default TTS voice for previews/questions
  tags?: string[]; // Optional tags to improve auto-selection (e.g., ['career', 'dating', 'tinder'])
};

// Optional: Map specific Agent IDs to tags. Fill with your real ElevenLabs Agent IDs.
// Example:
// export const ELEVEN_AGENT_TAGS: Record<string, string[]> = {
//   'agent_career_123': ['career', 'resume', 'job', 'interview'],
//   'agent_dating_456': ['dating', 'tinder', 'hinge', 'profile', 'relationship'],
// };
export const ELEVEN_AGENT_TAGS: Record<string, string[]> = {
  // 'agent_yourCareerId': ['career', 'resume', 'job', 'interview'],
  // 'agent_yourDatingId': ['dating', 'tinder', 'hinge', 'profile', 'relationship'],
};

// Heuristic helper to derive tags from ID mapping and agent name/description.
export function getAgentTags(agent: Pick<ElevenAgent, 'id' | 'name' | 'description' | 'tags'>): string[] {
  if (agent.tags && agent.tags.length) return agent.tags;
  const mapped = ELEVEN_AGENT_TAGS[agent.id] || [];
  const tags = new Set<string>(mapped);
  const hay = `${agent.name || ''} ${agent.description || ''}`.toLowerCase();

  if (/(career|job|resume|cv|interview|recruiter|hiring|salary|linkedin)/.test(hay)) {
    tags.add('career');
  }
  if (/(dating|date|relationship|relationships|profile|romance|compatibility)/.test(hay)) {
    tags.add('dating');
  }
  ['hinge', 'tinder', 'bumble'].forEach((app) => {
    if (hay.includes(app)) tags.add(app);
  });

  if (!tags.size) tags.add('general');
  return Array.from(tags);
}

// Add your curated public Agent IDs here. End-users will simply select from this list.
// Example:
// { id: "agnt_123", name: "Product Interviewer (Aria)", voiceId: "9BWtsMINqrJLrRacOk9x", tags: ['career'] }
export const ELEVEN_AGENTS: ElevenAgent[] = [
  {
    id: "agent_9801k286kms6e6f83fj5ex1ngmpc",
    name: "Default Interviewer Agent",
    voiceId: "9BWtsMINqrJLrRacOk9x",
    tags: ['general', 'interview'],
  },
];
