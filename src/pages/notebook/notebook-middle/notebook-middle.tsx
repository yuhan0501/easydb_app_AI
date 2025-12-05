import CustomAceEditor from "@/components/common/ace-editor";
import {
  faServer,
  faStop,
  faPlay,
  faScrewdriverWrench,
  faAlignLeft,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { format } from "sql-formatter";
import NotebookMiddleBottom from "./notebook-mddle-bottom";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "@/i18n";
import { listen } from "@tauri-apps/api/event";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import {
  generateSqlWithModel,
  repairSqlWithModel,
} from "@/services/ai-assistant";
import {
  AiDataSource,
  useAiDataSources,
} from "@/contexts/AiDataSourcesContext";

export interface AiPanelData {
  isAiMode: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  isAiBusy: boolean;
  aiStatus: AiStatus;
  aiDisplayMessage: string;
  isAnyAiSourceLoading: boolean;
  handleSelectAiDataSource: () => Promise<void>;
  clearAllAiSources: () => void;
  aiSources: AiDataSource[];
  handleAiSheetChange: (sourceId: string, sheetKey: string) => void;
  handleRemoveAiSource: (sourceId: string) => void;
  handleAiSubmit: () => Promise<void>;
}

export interface SqlHelperHandlers {
  insertSnippet: (snippet: string) => void;
}

interface NotebookMiddleProps {
  source: string;
  onAiPanelDataChange?: (data: AiPanelData) => void;
  onSqlHelperChange?: (handlers: SqlHelperHandlers) => void;
}

type AiStatus = "idle" | "generating" | "retrying" | "success" | "error";
type RunSqlResult = { success: boolean; error?: string };

const MAX_FIELD_HINTS = 8;

function getFormatSql(sql: string) {
  return format(sql, {
    language: "sql",
    keywordCase: "upper",
  }).replace(/=\s>/g, "=>");
}

function escapeSqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function buildReadFunctionCall(
  readFunction: string,
  filePath: string,
  options?: { sheetName?: string | null; connectionString?: string | null }
) {
  const escapedPath = escapeSqlString(filePath);
  const clauses: string[] = [];
  if (options?.sheetName && readFunction === "read_excel") {
    clauses.push(`sheet_name => '${escapeSqlString(options.sheetName)}'`);
  }
  if (options?.connectionString && readFunction === "read_mysql") {
    clauses.push(`conn => '${escapeSqlString(options.connectionString)}'`);
  }
  const clauseText = clauses.length ? `, ${clauses.join(", ")}` : "";
  return `${readFunction}('${escapedPath}'${clauseText})`;
}

function buildFieldHint(field: string) {
  const cleaned = field.replace(/["'`]/g, "").trim();
  if (!cleaned) return field;
  const spaced = cleaned
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return cleaned;
  const lower = spaced.toLowerCase();
  const title = spaced
    .split(/\s+/)
    .map((segment) =>
      segment ? segment[0].toUpperCase() + segment.slice(1).toLowerCase() : segment
    )
    .join(" ");
  return `${cleaned}（可理解：${lower} | ${title}）`;
}

function NotebookMiddle({
  source,
  onAiPanelDataChange,
  onSqlHelperChange,
}: NotebookMiddleProps) {
  const { translate } = useTranslation();
  const { mode, config } = useAiAssistant();
  const [sql, setSql] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{
    header: string[];
    rows: string[][];
    query_time: string;
  }>({
    header: [],
    rows: [],
    query_time: "",
  });
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorRef = useRef<{ getSelectedText: () => string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [droppedFilePath, setDroppedFilePath] = useState<string | null>(null);
  const [droppedFileExtension, setDroppedFileExtension] = useState<
    string | null
  >(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiMessage, setAiMessage] = useState("");
  const {
    sources: aiSources,
    setSources: setAiSources,
    updateSource,
  } = useAiDataSources();
  const aiSourcesRef = useRef<AiDataSource[]>([]);

  useEffect(() => {
    aiSourcesRef.current = aiSources;
  }, [aiSources]);
  const isAiMode = mode === "ai";
  const isAiBusy = aiStatus === "generating" || aiStatus === "retrying";
  const isAnyAiSourceLoading = useMemo(
    () => aiSources.some((source) => source.isLoading),
    [aiSources]
  );

  const insertSnippet = useCallback(
    (snippet: string) => {
      setSql((prev) => {
        if (!prev.trim()) {
          return snippet;
        }
        return `${prev.trimEnd()}\n\n${snippet}`;
      });
    },
    []
  );

  useEffect(() => {
    if (!onSqlHelperChange) return;
    onSqlHelperChange({ insertSnippet });
  }, [insertSnippet, onSqlHelperChange]);

  // 使用 useCallback 缓存格式化函数
  const formatSql = useCallback(() => {
    setSql(getFormatSql(sql));
  }, [sql]);

  // 使用 useCallback 缓存清除函数
  const clearSql = useCallback(() => {
    setSql("");
  }, []);

  // 使用 useMemo 缓存文件扩展名到SQL查询的映射
  const fileExtensionToSql = useMemo(
    () => ({
      csv: (filePath: string) =>
        `SELECT * FROM read_csv('${filePath}') LIMIT 100;`,
      xlsx: (filePath: string) =>
        `SELECT * FROM read_excel('${filePath}') LIMIT 100;`,
      xls: (filePath: string) =>
        `SELECT * FROM read_excel('${filePath}') LIMIT 100;`,
      json: (filePath: string) =>
        `SELECT * FROM read_ndjson('${filePath}') LIMIT 100;`,
      ndjson: (filePath: string) =>
        `SELECT * FROM read_ndjson('${filePath}') LIMIT 100;`,
      // ndjson: (filePath: string) =>
      //   `SELECT * FROM read_ndjson('${filePath}') LIMIT 100;`,
      parquet: (filePath: string) =>
        `SELECT * FROM read_parquet('${filePath}') LIMIT 100;`,
      tsv: (filePath: string) =>
        `SELECT * FROM read_tsv('${filePath}') LIMIT 100;`,
    }),
    []
  );

  // 使用 useMemo 缓存文件扩展名到 read_xxx 函数名的映射
  const fileExtensionToReadFunction = useMemo(
    () => ({
      csv: "read_csv",
      xlsx: "read_excel",
      xls: "read_excel",
      json: "read_ndjson",
      ndjson: "read_ndjson",
      parquet: "read_parquet",
      tsv: "read_tsv",
    }),
    []
  );

  const createDataSourceState = useCallback(
    (filePath: string): AiDataSource => {
      const extension = filePath.split(".").pop()?.toLowerCase() ?? null;
      const readFunction = extension
        ? fileExtensionToReadFunction[
            extension as keyof typeof fileExtensionToReadFunction
          ]
        : undefined;
      const defaultAlias = filePath.split(/[/\\]/).pop() ?? "数据源";
      return {
        id: `${filePath}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: "file",
        path: filePath,
        alias: defaultAlias,
        extension,
        readFunction,
        sheetName: null,
        sheetOptions: [],
        headers: [],
        isLoading: Boolean(readFunction),
        error: readFunction ? null : "暂不支持该文件类型",
        tableAliases: {
          __default: defaultAlias,
        },
      };
    },
    [fileExtensionToReadFunction]
  );

  const patchAiSource = useCallback(
    (id: string, patch: Partial<AiDataSource>) => {
      updateSource(id, patch);
    },
    [updateSource]
  );

  const removeAiSource = useCallback((id: string) => {
    aiSourcesRef.current = aiSourcesRef.current.filter(
      (source) => source.id !== id
    );
    setAiSources((prev) => prev.filter((source) => source.id !== id));
  }, []);

  const clearAllAiSources = useCallback(() => {
    aiSourcesRef.current = [];
    setAiSources([]);
  }, []);

  const handleRemoveAiSource = useCallback(
    (id: string) => {
      removeAiSource(id);
    },
    [removeAiSource]
  );

  // 处理文件拖拽 - 显示选项菜单
  const handleFileDrop = useCallback(
    (filePath: string) => {
      const fileExtension = filePath.split(".").pop()?.toLowerCase();

      if (fileExtension && fileExtension in fileExtensionToSql) {
        setDroppedFilePath(filePath);
        setDroppedFileExtension(fileExtension);
        setIsDropModalOpen(true);
      }
    },
    [fileExtensionToSql]
  );

  // 处理插入完整SQL
  const handleInsertFullSql = useCallback(() => {
    if (droppedFilePath && droppedFileExtension) {
      const sqlQuery =
        fileExtensionToSql[
          droppedFileExtension as keyof typeof fileExtensionToSql
        ](droppedFilePath);
      setSql(getFormatSql(sqlQuery));
      setIsDropModalOpen(false);
      setDroppedFilePath(null);
      setDroppedFileExtension(null);
    }
  }, [droppedFilePath, droppedFileExtension, fileExtensionToSql]);

  // 处理仅插入 read_xxx
  const handleInsertReadFunction = useCallback(() => {
    if (droppedFilePath && droppedFileExtension) {
      const readFunction =
        fileExtensionToReadFunction[
          droppedFileExtension as keyof typeof fileExtensionToReadFunction
        ];
      const readFunctionCall = `${readFunction}('${droppedFilePath}')`;
      setSql((prevSql) => {
        // 如果编辑器不为空，在末尾添加换行和内容
        return prevSql ? `${prevSql}\n${readFunctionCall}` : readFunctionCall;
      });
      setIsDropModalOpen(false);
      setDroppedFilePath(null);
      setDroppedFileExtension(null);
    }
  }, [droppedFilePath, droppedFileExtension, fileExtensionToReadFunction]);

  // 生成选项预览文本
  const insertOptions = useMemo(() => {
    if (!droppedFilePath || !droppedFileExtension) return [];

    const readFunction =
      fileExtensionToReadFunction[
        droppedFileExtension as keyof typeof fileExtensionToReadFunction
      ];
    const fullSql =
      fileExtensionToSql[
        droppedFileExtension as keyof typeof fileExtensionToSql
      ](droppedFilePath);

    return [
      {
        key: "full",
        title: translate("notebook.insertFullSql") || "插入完整 SQL",
        preview: fullSql,
        onClick: handleInsertFullSql,
      },
      {
        key: "read",
        title: translate("notebook.insertReadFunction") || "仅插入 read_xxx",
        preview: `${readFunction}('${droppedFilePath}')`,
        onClick: handleInsertReadFunction,
      },
    ];
  }, [
    droppedFilePath,
    droppedFileExtension,
    fileExtensionToSql,
    fileExtensionToReadFunction,
    handleInsertFullSql,
    handleInsertReadFunction,
    translate,
  ]);

  const aiFieldHints = useMemo(
    () =>
      aiSources.flatMap((source) =>
        source.headers.map((field) => buildFieldHint(field))
      ),
    [aiSources]
  );
  const loadSourceMetadata = useCallback(
    async (
      sourceId: string,
      options?: { sheetName?: string | null; refreshSheets?: boolean }
    ) => {
      const current = aiSourcesRef.current.find((source) => source.id === sourceId);
      if (!current) return;

      if (current.type && current.type !== "file") {
        return;
      }

      if (!current.readFunction) {
        patchAiSource(sourceId, {
          isLoading: false,
          error: "暂不支持该文件类型",
        });
        return;
      }

      patchAiSource(sourceId, { isLoading: true, error: null });

      let sheetName =
        options && "sheetName" in options
          ? options.sheetName ?? null
          : current.sheetName;
      let sheetOptions = current.sheetOptions;

      if (
        current.readFunction === "read_excel" &&
        (options?.refreshSheets || sheetOptions.length === 0)
      ) {
        try {
          const sheets = await invoke<string[]>("list_excel_sheets", {
            path: current.path,
          });
          sheetOptions = sheets;
          if (!sheets.length) {
            patchAiSource(sourceId, {
              sheetOptions,
              sheetName: null,
              isLoading: false,
              error: "未在该工作簿中找到可用工作表",
            });
            return;
          }
          if (!sheetName || !sheets.includes(sheetName)) {
            sheetName = sheets[0] ?? null;
          }
          const aliasMap = current.tableAliases ?? {};
          sheets.forEach((sheet) => {
            if (!aliasMap[sheet]) {
              aliasMap[sheet] = sheet;
            }
          });
          patchAiSource(sourceId, {
            tableAliases: aliasMap,
          });
        } catch (error) {
          patchAiSource(sourceId, {
            sheetOptions: [],
            sheetName: null,
            isLoading: false,
            error: `读取工作表失败: ${error}`,
          });
          return;
        }
      }

      try {
        const readCall = buildReadFunctionCall(current.readFunction, current.path, {
          sheetName: sheetName ?? undefined,
          connectionString:
            current.readFunction === "read_mysql"
              ? current.connectionString
              : undefined,
        });
        const sqlForPreview = `SELECT * FROM ${readCall} LIMIT 3`;
        const preview: {
          header: string[];
          rows: string[][];
          query_time: string;
        } = await invoke("fetch", {
          sql: sqlForPreview,
          offset: 0,
          limit: 3,
        });

        patchAiSource(sourceId, {
          headers: preview.header ?? [],
          sheetOptions,
          sheetName: sheetName ?? null,
          isLoading: false,
          error: preview.header?.length
            ? null
            : "未能解析字段，请确认文件内容",
        });
      } catch (error) {
        patchAiSource(sourceId, {
          headers: [],
          sheetOptions,
          sheetName: sheetName ?? null,
          isLoading: false,
          error: `${error}`,
        });
      }
    },
    [patchAiSource]
  );

  const handleSelectAiDataSource = useCallback(async () => {
    try {
      const selection = await open({
        multiple: true,
        filters: [
          {
            name: "数据文件",
            extensions: [
              "csv",
              "tsv",
              "xlsx",
              "xls",
              "json",
              "ndjson",
              "parquet",
            ],
          },
        ],
      });

      const selectedPaths = Array.isArray(selection)
        ? selection
        : typeof selection === "string"
        ? [selection]
        : [];

      if (!selectedPaths.length) return;

      const newSources = selectedPaths.map((path) => createDataSourceState(path));

      if (!newSources.length) return;

      aiSourcesRef.current = [...aiSourcesRef.current, ...newSources];
      setAiSources((prev) => [...prev, ...newSources]);

      await Promise.all(
        newSources.map(async (source) => {
          if (!source.readFunction) {
            patchAiSource(source.id, {
              isLoading: false,
              error: "暂不支持该文件类型",
            });
            return;
          }
          await loadSourceMetadata(source.id, {
            refreshSheets: source.readFunction === "read_excel",
          });
        })
      );
    } catch (error) {
      console.error("Failed to import data source", error);
    }
  }, [createDataSourceState, loadSourceMetadata, patchAiSource, setAiSources]);

  const handleAiSheetChange = useCallback(
    (sourceId: string, sheetKey: string) => {
      patchAiSource(sourceId, { sheetName: sheetKey });
      loadSourceMetadata(sourceId, { sheetName: sheetKey });
    },
    [loadSourceMetadata, patchAiSource]
  );

  const aiSourceSummaries = useMemo(
    () =>
      aiSources.map((source, index) => {
        const readCall = source.readFunction
          ? buildReadFunctionCall(source.readFunction, source.path, {
              sheetName:
                source.readFunction === "read_excel"
                  ? source.sheetName ?? undefined
                  : undefined,
              connectionString:
                source.readFunction === "read_mysql"
                  ? source.connectionString
                  : undefined,
            })
          : null;
        return {
          id: source.id,
          index: index + 1,
          path: source.path,
          sheetName: source.sheetName,
          readCall,
          hints: source.headers.map((field) => buildFieldHint(field)),
          error: source.error,
          isLoading: source.isLoading,
          connectionString: source.connectionString,
        };
      }),
    [aiSources]
  );

  const aiSourceSummaryMap = useMemo(() => {
    const map = new Map<string, (typeof aiSourceSummaries)[number]>();
    aiSourceSummaries.forEach((summary) => {
      map.set(summary.id, summary);
    });
    return map;
  }, [aiSourceSummaries]);

  const aiPromptWithContext = useMemo(() => {
    const segments: string[] = [];
    const trimmedPrompt = aiPrompt.trim();
    if (trimmedPrompt) {
      segments.push(trimmedPrompt);
    }

    if (aiSourceSummaries.length) {
      aiSourceSummaries.forEach((summary) => {
        const lines = [`数据源 ${summary.index}：${summary.path}`];
        if (summary.sheetName) {
          lines.push(`工作表：${summary.sheetName}`);
        }
        if (summary.connectionString) {
          lines.push(`连接：${summary.connectionString}`);
        }
        if (summary.readCall) {
          lines.push(`读取方式建议：${summary.readCall}`);
        }
        if (summary.hints.length) {
          lines.push(`字段示例：${summary.hints.join("，")}`);
        }
        segments.push(lines.join("\n"));
      });
      if (aiFieldHints.length) {
        segments.push("提示：字段名称可能会以下划线或大小写组合出现。");
      }
    }

    if (aiFieldHints.length) {
      segments.push(`汇总字段：\n${aiFieldHints.join("\n")}`);
    }

    return segments.join("\n\n");
  }, [aiFieldHints, aiPrompt, aiSourceSummaries]);

  const resolvedAiSource = aiSourceSummaries.length
    ? aiSourceSummaries
        .map((summary) =>
          (() => {
            const base = summary.sheetName
              ? `${summary.path}#${summary.sheetName}`
              : summary.path;
            return summary.connectionString
              ? `${base}@${summary.connectionString}`
              : base;
          })()
        )
        .join("\n")
    : source;

  // 使用 useCallback 缓存查询执行函数
  const runSql = useCallback(
    async (forcedSql?: string): Promise<RunSqlResult> => {
      if (isRunning) {
        return { success: false, error: "Query already running" };
      }

      let sqlToExecute = forcedSql ?? sql;
      if (!forcedSql && editorRef.current) {
        const selectedText = editorRef.current.getSelectedText();
        if (selectedText && selectedText.trim()) {
          sqlToExecute = selectedText;
        }
      }

      if (!sqlToExecute.trim()) {
        return { success: false, error: "SQL is empty" };
      }

      setIsRunning(true);
      setIsLoading(true);
      setData({ header: [], rows: [], query_time: "" });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const results: {
          header: string[];
          rows: string[][];
          query_time: string;
        } = await invoke("fetch", {
          sql: sqlToExecute,
          offset: 0,
          limit: 200,
        });

        if (abortController.signal.aborted) {
          setData({
            header: ["Status"],
            rows: [["Query cancelled"]],
            query_time: "-",
          });
          return { success: false, error: "Query cancelled" };
        }

        setData(results);
        return { success: true };
      } catch (error) {
        if (abortController.signal.aborted) {
          setData({
            header: ["Status"],
            rows: [["Query cancelled"]],
            query_time: "-",
          });
          return { success: false, error: "Query cancelled" };
        }

        const message = `${error}`;
        setData({
          header: ["Error"],
          rows: [[message]],
          query_time: "<1ms",
        });
        return { success: false, error: message };
      } finally {
        setIsRunning(false);
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sql, isRunning]
  );

  const executeQuery = useCallback(async () => {
    await runSql();
  }, [runSql]);

  // 使用 useCallback 缓存取消查询函数
  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
      setIsLoading(false);
    }
  }, []);

  const getDataPreview = useCallback(() => {
    if (data.rows.length) {
      return JSON.stringify({
        header: data.header,
        sample: data.rows.slice(0, 3),
      });
    }
    const firstSourceWithHeaders = aiSources.find(
      (source) => source.headers.length > 0
    );
    if (firstSourceWithHeaders) {
      return JSON.stringify({
        header: firstSourceWithHeaders.headers,
        sample: [],
      });
    }
    return undefined;
  }, [aiSources, data]);

  useEffect(() => {
    if (!isAiMode) {
      setAiStatus("idle");
      setAiMessage("");
    }
  }, [isAiMode]);

  const attemptAutoRepair = useCallback(
    async (failedSql: string, errorMessage: string) => {
      if (!config.retryLimit) {
        setAiStatus("error");
        setAiMessage(errorMessage);
        return;
      }

      let latestSql = failedSql;
      let latestError = errorMessage;

      for (let attempt = 1; attempt <= config.retryLimit; attempt++) {
        setAiStatus("retrying");
        setAiMessage(`自动修复中 (${attempt}/${config.retryLimit})...`);

        try {
          const repairResponse = await repairSqlWithModel(
            {
              prompt: aiPromptWithContext || aiPrompt.trim(),
              source: resolvedAiSource,
              previousSql: sql,
              dataPreview: getDataPreview(),
              failedSql: latestSql,
              errorMessage: latestError,
              attempt,
            },
            config
          );
          const formattedSql = getFormatSql(repairResponse.sql);
          setSql(formattedSql);
          const runResult = await runSql(formattedSql);
          if (runResult.success) {
            setAiStatus("success");
            setAiMessage("自动修复成功");
            return;
          }
          latestSql = formattedSql;
          latestError = runResult.error ?? latestError;
        } catch (repairError) {
          latestError = `${repairError}`;
        }
      }

      setAiStatus("error");
      setAiMessage(latestError);
    },
    [aiPrompt, aiPromptWithContext, config, getDataPreview, resolvedAiSource, runSql, sql]
  );

  const handleAiSubmit = useCallback(async () => {
    if (!isAiMode || !aiPrompt.trim()) return;
    setAiStatus("generating");
    setAiMessage("正在生成 SQL...");

    try {
      const promptForModel = aiPromptWithContext || aiPrompt.trim();
      const aiResponse = await generateSqlWithModel(
        {
          prompt: promptForModel,
          source: resolvedAiSource,
          previousSql: sql,
          dataPreview: getDataPreview(),
        },
        config
      );
      const formattedSql = getFormatSql(aiResponse.sql);
      setSql(formattedSql);
      const runResult = await runSql(formattedSql);
      if (runResult.success) {
        setAiStatus("success");
        setAiMessage(aiResponse.reasoning || "SQL 已执行成功");
        return;
      }
      await attemptAutoRepair(
        formattedSql,
        runResult.error || "SQL 执行失败，正在尝试修复"
      );
    } catch (error) {
      setAiStatus("error");
      setAiMessage(`${error}`);
    }
  }, [
    aiPrompt,
    aiPromptWithContext,
    attemptAutoRepair,
    config,
    getDataPreview,
    isAiMode,
    runSql,
    resolvedAiSource,
    sql,
  ]);

  // 监听Tauri的拖拽事件
  useEffect(() => {
    const setupDragDropListeners = async () => {
      // 监听文件拖拽完成事件
      const unlistenDrop = await listen(
        "tauri://drag-drop",
        (event: { payload: { paths: string[] } }) => {
          const filePaths = event.payload.paths;
          if (filePaths && filePaths.length > 0) {
            handleFileDrop(filePaths[0]);
          }
        }
      );

      return () => {
        unlistenDrop();
      };
    };

    setupDragDropListeners();
  }, [handleFileDrop]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropModalOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsDropModalOpen(false);
        setDroppedFilePath(null);
        setDroppedFileExtension(null);
      }
    };

    if (isDropModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropModalOpen]);

  // 使用 useMemo 缓存样式对象
  const containerStyle = useMemo(
    () => ({
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
      textAlign: "center" as const,
      borderLeft: "1px solid rgba(17, 17, 17, 0.15)",
      borderRight: "1px solid rgba(17, 17, 17, 0.15)",
      overflow: "hidden",
      position: "relative" as const,
    }),
    []
  );

  const headerStyle = useMemo(
    () => ({
      height: 60,
      borderBottom: "1px solid rgba(17, 17, 17, 0.15)",
      backgroundColor: "#F5F5F5",
    }),
    []
  );

  const editorAreaStyle = useMemo(
    () => ({
      flex: "1 1 auto",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      minHeight: 0,
      height: "100%",
    }),
    []
  );

  const editorContainerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
      overflow: "hidden",
      flex: 1,
      minHeight: 0,
    }),
    []
  );

  const aiStatusFallback: Record<AiStatus, string> = {
    idle: "",
    generating: "正在调用大模型生成 SQL...",
    retrying: "自动修复中...",
    success: "SQL 已执行成功",
    error: "执行失败",
  };
  const aiDisplayMessage = aiMessage || aiStatusFallback[aiStatus];

  useEffect(() => {
    if (!onAiPanelDataChange) return;
    onAiPanelDataChange({
      isAiMode,
      aiPrompt,
      setAiPrompt,
      isAiBusy,
      aiStatus,
      aiDisplayMessage,
      isAnyAiSourceLoading,
      handleSelectAiDataSource,
      clearAllAiSources,
      aiSources,
      handleAiSheetChange,
      handleRemoveAiSource,
      handleAiSubmit,
    });
  }, [
    aiPrompt,
    aiStatus,
    aiDisplayMessage,
    aiSources,
    clearAllAiSources,
    handleAiSheetChange,
    handleAiSubmit,
    handleRemoveAiSource,
    handleSelectAiDataSource,
    isAiBusy,
    isAiMode,
    isAnyAiSourceLoading,
    onAiPanelDataChange,
  ]);

  // 不再通过全局上下文注册 filePicker，避免在应用启动时被意外调用

  return (
    <div ref={dropAreaRef} style={containerStyle}>
      <div style={headerStyle}>
        <p
          style={{
            fontSize: "20px",
            textAlign: "left",
            paddingLeft: "15px",
            display: "flex",
            alignItems: "center",
            height: "100%",
          }}
        >
          <FontAwesomeIcon icon={faServer} style={{ marginRight: "10px" }} />
          {source}
        </p>
      </div>
      <div style={editorAreaStyle}>
        <div style={editorContainerStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "end",
              paddingBottom: "10px",
              height: "100%",
              width: "60px",
            }}
          >
            <div>
              <Button
                isIconOnly
                isDisabled={sql === ""}
                style={{ backgroundColor: "transparent" }}
                aria-label={isRunning ? "Stop query" : "Run query"}
                onPress={isRunning ? cancelQuery : executeQuery}
              >
                <FontAwesomeIcon
                  icon={isRunning ? faStop : faPlay}
                  style={{
                    color: isRunning ? "red" : "#87CEEB",
                    fontSize: "1.2em",
                  }}
                />
              </Button>
              <Dropdown placement="bottom-start" isDisabled={sql === ""}>
                <DropdownTrigger>
                  <Button
                    variant="light"
                    isIconOnly
                    aria-label="Tools and settings"
                  >
                    <FontAwesomeIcon icon={faScrewdriverWrench} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Static Actions">
                  <DropdownItem key="format" onPress={formatSql}>
                    <FontAwesomeIcon
                      icon={faAlignLeft}
                      style={{ marginRight: "5px" }}
                    />
                    Format
                  </DropdownItem>
                  <DropdownItem key="clear" onPress={clearSql}>
                    <FontAwesomeIcon
                      icon={faEraser}
                      style={{ marginRight: "5px" }}
                    />
                    Clear
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          <div
            className="textarea-container"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              paddingTop: "10px",
              position: "relative",
              flex: 1,
              minHeight: 0,
            }}
          >
            <CustomAceEditor
              value={sql}
              onChange={setSql}
              onLoad={(editor) => {
                editorRef.current = editor;
              }}
              placeholder={`${translate(
                "notebook.editorPlaceholder"
              )}\n\n${translate("notebook.dragDropHint")}`}
              fontSize={16}
              height="100%"
              width="100%"
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              enableBasicAutocompletion={true}
              enableLiveAutocompletion={true}
              enableSnippets={false}
              showLineNumbers={true}
              tabSize={2}
            />
            {/* 文件拖拽选项弹出菜单 */}
            {isDropModalOpen && (
              <div
                ref={popoverRef}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 9999,
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                  minWidth: "320px",
                  maxWidth: "400px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  {insertOptions.map((option, index) => (
                    <div
                      key={option.key}
                      onClick={option.onClick}
                      style={{
                        padding: "10px 12px",
                        borderBottom:
                          index === insertOptions.length - 1
                            ? "none"
                            : "1px solid #f3f4f6",
                        cursor: "pointer",
                        transition: "background-color 0.2s ease",
                      }}
                      className="hover:bg-gray-50"
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                          lineHeight: "1.4",
                        }}
                      >
                        {option.preview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "20px", marginLeft: "50px" }}>
        <NotebookMiddleBottom
          data={data}
          isLoading={isLoading}
          setSql={setSql}
          sql={sql}
        />
      </div>
    </div>
  );
}

export default memo(NotebookMiddle);
