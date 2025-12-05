import { AiPanelData, SqlHelperHandlers } from "../notebook-middle/notebook-middle";
import { useTranslation } from "@/i18n";
import { memo, useEffect, useState } from "react";
import { Button, Textarea, Select, SelectItem } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles, faXmark } from "@fortawesome/free-solid-svg-icons";

interface NotebookRightProps {
  aiPanelData: AiPanelData | null;
  sqlHelperHandlers: SqlHelperHandlers | null;
}

interface MethodParam {
  name: string;
  type: string;
  default: string | boolean | undefined;
  desc: string;
  example: string;
  required?: boolean;
}

type FunctionType = "table-valued" | "scalar-valued";

interface Method {
  name: string;
  description: string;
  params: MethodParam[];
  example: string;
  type: FunctionType;
  isBeta?: boolean;
}

const createTableFunctions = (t: (key: string) => string): Method[] => [
  {
    name: "read_csv",
    description: t("functions.readCsv.description"),
    type: "table-valued",
    params: [
      {
        name: "infer_schema",
        type: "boolean",
        default: true,
        desc: t("functions.readCsv.inferSchema"),
        example: "false",
      },
      {
        name: "has_header",
        type: "boolean",
        default: true,
        desc: t("functions.readCsv.hasHeader"),
        example: "true",
      },
      {
        name: "delimiter",
        type: "string",
        default: ",",
        desc: t("functions.readCsv.delimiter"),
        example: ",",
      },
      {
        name: "file_extension",
        type: "string",
        default: ".csv",
        desc: t("functions.readCsv.fileExtension"),
        example: ".csv",
      },
    ],
    example: `select * from read_csv('data.csv', infer_schema => false)`,
  },
  {
    name: "read_excel",
    description: t("functions.readExcel.description"),
    type: "table-valued",
    params: [
      {
        name: "sheet_name",
        type: "string",
        default: "Sheet1",
        desc: t("functions.readExcel.sheetName"),
        example: "Sheet1",
      },
      {
        name: "infer_schema",
        type: "boolean",
        default: true,
        desc: t("functions.readExcel.inferSchema"),
        example: "false",
      },
    ],
    example: `select * from read_excel('data.xlsx', sheet_name => 'Sheet2')`,
    isBeta: true,
  },
  {
    name: "read_ndjson",
    description: t("functions.readNdjson.description"),
    type: "table-valued",
    params: [
      {
        name: "infer_schema",
        type: "boolean",
        default: true,
        desc: t("functions.readNdjson.inferSchema"),
        example: "false",
      },
    ],
    example: `select * from read_ndjson('data.ndjson')`,
  },
  {
    name: "read_parquet",
    description: t("functions.readParquet.description"),
    type: "table-valued",
    params: [],
    example: `select * from read_parquet('data.parquet')`,
  },
  {
    name: "read_mysql",
    description: t("functions.readMysql.description"),
    type: "table-valued",
    params: [
      {
        name: "conn",
        type: "string",
        default: undefined,
        desc: t("functions.readMysql.conn"),
        example: "mysql://user:pass@host:3306/db",
        required: true,
      },
    ],
    example: `select * from read_mysql('users', conn => 'mysql://user:pass@localhost:3306/db')`,
    isBeta: true,
  },
];

const createScalarFunctions = (t: (key: string) => string): Method[] => [
  {
    name: "regexp_like",
    description: t("functions.regexpLike.description"),
    type: "scalar-valued",
    params: [
      {
        name: "column",
        type: "string",
        default: undefined,
        desc: t("functions.regexpLike.column"),
        example: "my_column",
        required: true,
      },
      {
        name: "pattern",
        type: "string",
        default: undefined,
        desc: t("functions.regexpLike.pattern"),
        example: "^[0-9]+$",
        required: true,
      },
    ],
    example: `select * from my_table where regexp_like("name", '^J')`,
  },
];

function NotebookRight({
  aiPanelData,
  sqlHelperHandlers,
}: NotebookRightProps) {
  const { translate } = useTranslation();

  const isAiMode = aiPanelData?.isAiMode ?? false;
  const aiPrompt = aiPanelData?.aiPrompt ?? "";
  const promptSetter = aiPanelData?.setAiPrompt;
  const isAiBusy = aiPanelData?.isAiBusy ?? false;
  const aiStatus = aiPanelData?.aiStatus ?? "idle";
  const aiDisplayMessage = aiPanelData?.aiDisplayMessage ?? "";
  const isAnyAiSourceLoading = aiPanelData?.isAnyAiSourceLoading ?? false;
  const aiSources = aiPanelData?.aiSources ?? [];
  const handleAiSheetChange = aiPanelData?.handleAiSheetChange;
  const handleRemoveAiSource = aiPanelData?.handleRemoveAiSource;
  const handleAiSubmit = aiPanelData?.handleAiSubmit;
  const [localPrompt, setLocalPrompt] = useState(aiPrompt);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!isComposing) {
      setLocalPrompt(aiPrompt);
    }
  }, [aiPrompt, isComposing]);

  const commitPrompt = (value: string) => {
    setLocalPrompt(value);
    promptSetter?.(value);
  };

  return (
    <div
      style={{
        width: "280px",
        borderLeft: "1px solid rgba(17, 17, 17, 0.15)",
        height: "calc(100vh - 65px)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {!isAiMode ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflow: "auto",
          }}
        >
          <FunctionSection
            title="文件/外部数据函数"
            methods={createTableFunctions(translate)}
            sqlHelperHandlers={sqlHelperHandlers}
          />
          <FunctionSection
            title="标量函数"
            methods={createScalarFunctions(translate)}
            sqlHelperHandlers={sqlHelperHandlers}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: 1,
            }}
          >
            <Textarea
              minRows={8}
              label="AI 提示词"
              placeholder="示例：筛选订单金额大于 1000 的行，并按地区统计数量"
              value={localPrompt}
              onChange={(event) => {
                const { value } = event.target;
                setLocalPrompt(value);
                if (!isComposing) {
                  promptSetter?.(value);
                }
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(event) => {
                setIsComposing(false);
                commitPrompt(event.currentTarget.value);
              }}
              variant="faded"
            />
            <Button
              color="primary"
              startContent={<FontAwesomeIcon icon={faWandMagicSparkles} />}
              onPress={() => handleAiSubmit?.()}
              isDisabled={
                !localPrompt.trim() ||
                Boolean(isAiBusy) ||
                Boolean(isAnyAiSourceLoading)
              }
              isLoading={Boolean(isAiBusy)}
            >
              生成并执行
            </Button>
            {aiStatus && aiStatus !== "idle" && (
              <span style={{ fontSize: "12px", color: getStatusColor(aiStatus) }}>
                {aiDisplayMessage}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "success":
      return "#16a34a";
    case "error":
      return "#dc2626";
    case "retrying":
      return "#ea580c";
    default:
      return "#6b7280";
  }
}

export default memo(NotebookRight);
function FunctionSection({
  title,
  methods,
  sqlHelperHandlers,
}: {
  title: string;
  methods: Method[];
  sqlHelperHandlers: SqlHelperHandlers | null;
}) {
  if (!methods.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h4 style={{ fontSize: "13px", fontWeight: 600 }}>{title}</h4>
      {methods.map((method) => (
        <details
          key={method.name}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0 0 8px",
            textAlign: "left",
            backgroundColor: "#fff",
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "13px" }}>
              {method.name}
            </span>
            {method.isBeta && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#f97316",
                }}
              >
                Beta
              </span>
            )}
          </summary>
          <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "12px", color: "#4b5563" }}>
              {method.description}
            </div>
            {method.params.length > 0 && (
              <div
                style={{
                  border: "1px solid #f3f4f6",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px",
                  color: "#374151",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  参数
                </div>
                {method.params.map((param) => (
                  <div
                    key={param.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: "6px",
                    }}
                  >
                    <span>
                      <strong>{param.name}</strong> ({param.type})
                      {param.required ? " *" : ""}：{param.desc}
                    </span>
                    <span style={{ color: "#6b7280" }}>
                      默认值：{String(param.default)}
                    </span>
                    {param.example && (
                      <span style={{ color: "#6b7280" }}>
                        示例：{param.example}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                wordBreak: "break-all",
              }}
            >
              示例：
              <code style={{ color: "#111827", whiteSpace: "pre-wrap" }}>
                {method.example}
              </code>
            </div>
            <Button
              size="sm"
              variant="light"
              onPress={() => sqlHelperHandlers?.insertSnippet(method.example)}
            >
              填入示例
            </Button>
          </div>
        </details>
      ))}
    </div>
  );
}
