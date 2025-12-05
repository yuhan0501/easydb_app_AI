import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AiAssistantContext,
  AiModelConfig,
  QueryMode,
  defaultAiModelConfig,
} from "./AiAssistantContext";

const STORAGE_KEY = "easydb_ai_settings";

function sanitizeConfigPatch(patch: Partial<AiModelConfig>): Partial<AiModelConfig> {
  const result: Partial<AiModelConfig> = {};
  if (typeof patch.provider === "string") result.provider = patch.provider;
  if (typeof patch.baseUrl === "string") result.baseUrl = patch.baseUrl;
  if (typeof patch.apiKey === "string") result.apiKey = patch.apiKey;
  if (typeof patch.model === "string") result.model = patch.model;
  if (typeof patch.temperature === "number" && Number.isFinite(patch.temperature)) {
    result.temperature = patch.temperature;
  }
  if (typeof patch.maxTokens === "number" && Number.isFinite(patch.maxTokens)) {
    result.maxTokens = patch.maxTokens;
  }
  if (typeof patch.retryLimit === "number" && Number.isFinite(patch.retryLimit)) {
    result.retryLimit = patch.retryLimit;
  }
  return result;
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<QueryMode>("expert");
  const [config, setConfig] = useState<AiModelConfig>(defaultAiModelConfig);
  const [isHydrated, setIsHydrated] = useState(false);

  const updateConfig = useCallback((patch: Partial<AiModelConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          mode?: QueryMode;
          config?: Partial<AiModelConfig>;
        };
        if (parsed.mode === "ai" || parsed.mode === "expert") {
          setMode(parsed.mode);
        }
        if (parsed.config) {
          setConfig((prev) => ({
            ...prev,
            ...sanitizeConfigPatch(parsed.config ?? {}),
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to load AI settings from storage", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, config })
      );
    } catch (error) {
      console.warn("Failed to persist AI settings", error);
    }
  }, [config, mode, isHydrated]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      config,
      updateConfig,
    }),
    [mode, config, updateConfig]
  );

  return (
    <AiAssistantContext.Provider value={value}>
      {children}
    </AiAssistantContext.Provider>
  );
}
