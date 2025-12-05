import { useContext } from "react";
import { AiAssistantContext } from "@/contexts/AiAssistantContext";

export function useAiAssistant() {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error("useAiAssistant must be used inside AiAssistantProvider");
  }
  return context;
}
