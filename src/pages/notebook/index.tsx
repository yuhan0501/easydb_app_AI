import { useState } from "react";
import NotebookHeader from "./notebook-header/notebook-header";
import NotebookLeft from "./notebook-left/notebook-left";
import NotebookMiddle, {
  AiPanelData,
  SqlHelperHandlers,
} from "./notebook-middle/notebook-middle";
import NotebookRight from "./notebook-right/notebook-right";
import { AiDataSourcesProvider } from "@/contexts/AiDataSourcesContext";
export default function Notebook() {
  const [source, setSource] = useState<string>("");
  const [aiPanelData, setAiPanelData] = useState<AiPanelData | null>(null);
  const [sqlHelperHandlers, setSqlHelperHandlers] =
    useState<SqlHelperHandlers | null>(null);

  return (
    <AiDataSourcesProvider>
      <div>
        <NotebookHeader />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "top",
            height: "calc(100vh - 65px)",
            gap: "0px",
          }}
        >
          <NotebookLeft
            source={source}
            setSource={setSource}
            aiPanelData={aiPanelData}
          />
          <NotebookMiddle
            source={source}
            onAiPanelDataChange={setAiPanelData}
            onSqlHelperChange={setSqlHelperHandlers}
          />
          <NotebookRight
            aiPanelData={aiPanelData}
            sqlHelperHandlers={sqlHelperHandlers}
          />
        </div>
      </div>
    </AiDataSourcesProvider>
  );
}
