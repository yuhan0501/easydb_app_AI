import { createContext } from "react";

export type QueryMode = "ai" | "expert";

export interface AiModelConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  retryLimit: number;
}

export interface AiAssistantContextValue {
  mode: QueryMode;
  setMode: (mode: QueryMode) => void;
  config: AiModelConfig;
  updateConfig: (patch: Partial<AiModelConfig>) => void;
}

export const defaultAiModelConfig: AiModelConfig = {
  provider: "openai-compatible",
  baseUrl: "",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.2,
  maxTokens: 2048,
  retryLimit: 2,
};

export const AiAssistantContext = createContext<
  AiAssistantContextValue | undefined
>(undefined);
