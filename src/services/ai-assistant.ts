import { invoke } from "@tauri-apps/api/core";
import { AiModelConfig } from "@/contexts/AiAssistantContext";

export interface AiSqlResponse {
  sql: string;
  reasoning?: string;
}

export interface AiGenerationRequest {
  prompt: string;
  source?: string;
  previousSql?: string;
  dataPreview?: string;
}

export interface AiRepairRequest extends AiGenerationRequest {
  failedSql: string;
  errorMessage: string;
  attempt: number;
}

async function callTauriCommand<T>(
  command: string,
  payload?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, payload);
  } catch (error) {
    throw new Error(
      `AI command "${command}" failed. Ensure the Tauri backend exposes this command or update src/services/ai-assistant.ts to call your model API. Original error: ${error}`
    );
  }
}

export async function generateSqlWithModel(
  request: AiGenerationRequest,
  config: AiModelConfig
): Promise<AiSqlResponse> {
  return callTauriCommand<AiSqlResponse>("ai_generate_sql", {
    payload: {
      request,
      config,
    },
  });
}

export async function repairSqlWithModel(
  request: AiRepairRequest,
  config: AiModelConfig
): Promise<AiSqlResponse> {
  return callTauriCommand<AiSqlResponse>("ai_repair_sql", {
    payload: {
      request,
      config,
    },
  });
}
