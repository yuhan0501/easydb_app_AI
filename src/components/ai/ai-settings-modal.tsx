import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { AiModelConfig } from "@/contexts/AiAssistantContext";
import { useAiAssistant } from "@/hooks/useAiAssistant";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const labels: Record<keyof AiModelConfig, string> = {
  provider: "Provider",
  baseUrl: "Base URL",
  apiKey: "API Key",
  model: "Model",
  temperature: "Temperature",
  maxTokens: "Max Tokens",
  retryLimit: "Retry Limit",
};

export default function AiSettingsModal({
  isOpen,
  onClose,
}: AiSettingsModalProps) {
  const { config, updateConfig } = useAiAssistant();
  const [localConfig, setLocalConfig] = useState<AiModelConfig>(config);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [config, isOpen]);

  const handleChange = (
    key: keyof AiModelConfig,
    value: string | number
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]:
        key === "temperature" || key === "maxTokens" || key === "retryLimit"
          ? Number(value)
          : value,
    }));
  };

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          模型参数设置
        </ModalHeader>
        <ModalBody>
          <Input
            label={labels.provider}
            value={localConfig.provider}
            onValueChange={(value) => handleChange("provider", value)}
          />
          <Input
            label={labels.baseUrl}
            placeholder="https://api.your-model.com/v1"
            value={localConfig.baseUrl}
            onValueChange={(value) => handleChange("baseUrl", value)}
          />
          <Input
            label={labels.apiKey}
            type="password"
            value={localConfig.apiKey}
            onValueChange={(value) => handleChange("apiKey", value)}
          />
          <Input
            label={labels.model}
            placeholder="gpt-4.1-mini"
            value={localConfig.model}
            onValueChange={(value) => handleChange("model", value)}
          />
          <Input
            label={labels.temperature}
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={localConfig.temperature.toString()}
            onValueChange={(value) => handleChange("temperature", value)}
          />
          <Input
            label={labels.maxTokens}
            type="number"
            min={256}
            max={8192}
            step={256}
            value={localConfig.maxTokens.toString()}
            onValueChange={(value) => handleChange("maxTokens", value)}
          />
          <Input
            label={labels.retryLimit}
            type="number"
            min={0}
            max={5}
            step={1}
            value={localConfig.retryLimit.toString()}
            onValueChange={(value) => handleChange("retryLimit", value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="primary" onPress={handleSave}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
