import { memo } from "react";
import NotebookLeftSource from "./notebook-left-source";
import NotebookLeftBottom from "./notebook-left-bottom";
import { AiPanelData } from "../notebook-middle/notebook-middle";

interface NotebookLeftProps {
  source: string;
  setSource: (source: string) => void;
  aiPanelData?: AiPanelData | null;
}

function NotebookLeft({ source, setSource, aiPanelData }: NotebookLeftProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: "4" }}>
        <NotebookLeftSource
          source={source}
          setSource={setSource}
          aiPanelData={aiPanelData}
        />
      </div>
      <div
        style={{
          height: "1px",
          backgroundColor: "rgba(17, 17, 17, 0.15)",
          width: "100%",
        }}
      />
      <div style={{ flex: "1" }}>
        <NotebookLeftBottom />
      </div>
    </div>
  );
}

export default memo(NotebookLeft);
