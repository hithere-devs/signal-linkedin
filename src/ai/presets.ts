export interface AiPreset {
  id: string;
  label: string;
  description: string;
  baseUrl: string;
  model: string;
  requiresKey: boolean;
  docsUrl?: string;
}

// These providers speak the OpenAI chat-completions shape used by Signal.
// Free quotas and model names can change, so every field remains editable.
export const AI_PRESETS: AiPreset[] = [
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible endpoint',
    description: 'Bring any compatible API, local server, or company gateway.',
    baseUrl: '',
    model: '',
    requiresKey: false
  },
  {
    id: 'ollama',
    label: 'Ollama local (free, private)',
    description: 'Runs on your machine. Install Ollama and pull llama3.2:3b.',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2:3b',
    requiresKey: false,
    docsUrl: 'https://ollama.com/download'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio local (free, private)',
    description: 'Use a model loaded in LM Studio on localhost.',
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    requiresKey: false,
    docsUrl: 'https://lmstudio.ai/'
  },
  {
    id: 'groq',
    label: 'Groq free tier',
    description: 'Fast hosted inference. Create a free Groq API key.',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    requiresKey: true,
    docsUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter free models',
    description: 'One key for rotating free models through an OpenAI-compatible API.',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    requiresKey: true,
    docsUrl: 'https://openrouter.ai/settings/keys'
  },
  {
    id: 'gemini',
    label: 'Google Gemini free tier',
    description: 'Google AI Studio key with the OpenAI-compatible Gemini endpoint.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash-lite',
    requiresKey: true,
    docsUrl: 'https://aistudio.google.com/app/apikey'
  }
];

export function getAiPreset(id: string | undefined): AiPreset {
  return AI_PRESETS.find((preset) => preset.id === id) ?? AI_PRESETS[0];
}
