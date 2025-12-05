import {
  faChevronLeft,
  faChevronDown,
  faChevronRight,
  faCopy,
  faDatabase,
  faFolder,
  faFileImport,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { memo, useEffect, useMemo, useState } from "react";
import { useAiDataSources } from "@/contexts/AiDataSourcesContext";
import { AiPanelData } from "../notebook-middle/notebook-middle";

interface NotebookLeftProps {
  source: string;
  setSource: (source: string) => void;
  aiPanelData?: AiPanelData | null;
}

function NotebookLeft({ source, setSource, aiPanelData }: NotebookLeftProps) {
  const {
    sources: aiSources,
    updateSource,
    setSources,
    filePicker,
  } = useAiDataSources();
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>({});
  const {
    isOpen: isMysqlModalOpen,
    onOpen: onMysqlModalOpen,
    onOpenChange: onMysqlModalChange,
  } = useDisclosure();
  const [mysqlAlias, setMysqlAlias] = useState("");
  const [mysqlTable, setMysqlTable] = useState("");
  const [mysqlConn, setMysqlConn] = useState("");
  const [mysqlError, setMysqlError] = useState("");
  const [aliasInputs, setAliasInputs] = useState<Record<string, string>>({});

  const aiPanelBusy = Boolean(
    aiPanelData?.isAiBusy || aiPanelData?.isAnyAiSourceLoading
  );

  const resetMysqlForm = () => {
    setMysqlAlias("");
    setMysqlTable("");
    setMysqlConn("");
    setMysqlError("");
  };

  const handleOpenMysqlModal = () => {
    if (aiPanelBusy) return;
    resetMysqlForm();
    onMysqlModalOpen();
  };

  const aliasKey = (sourceId: string, sheet?: string | null) =>
    `${sourceId}__${sheet ?? "__default"}`;

  const getDefaultAliasValue = (source: AiDataSource, sheet?: string | null) => {
    if (sheet && sheet !== "__default") return sheet;
    if (source.type === "mysql") return source.path;
    return source.path.split(/[/\\]/).pop() ?? source.path;
  };

  useEffect(() => {
    const next: Record<string, string> = {};
    aiSources.forEach((source) => {
      const sheetKeys =
        source.readFunction === "read_excel" && source.sheetOptions.length
          ? source.sheetOptions
          : [null];
      sheetKeys.forEach((sheet) => {
        const key = aliasKey(source.id, sheet);
        next[key] =
          source.tableAliases?.[sheet ?? "__default"] ??
          getDefaultAliasValue(source, sheet);
      });
    });
    setAliasInputs(next);
  }, [aiSources]);

  const triggerFileImport = () => {
    if (aiPanelBusy) return;
    filePicker?.();
  };

  const handleCreateMysqlSource = (close?: () => void) => {
    if (!mysqlTable.trim() || !mysqlConn.trim()) {
      setMysqlError("表名与连接串不能为空");
      return;
    }

    const aliasValue = mysqlAlias.trim() || mysqlTable.trim();
    const newSource = {
      id: `mysql-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "mysql" as const,
      path: mysqlTable.trim(),
      alias: aliasValue,
      extension: null,
      readFunction: "read_mysql",
      sheetName: null,
      sheetOptions: [],
      headers: [],
      isLoading: false,
      error: null,
      connectionString: mysqlConn.trim(),
      tableAliases: {
        __default: aliasValue,
      },
    };
    setSources((prev) => [...prev, newSource]);
    resetMysqlForm();
    close?.();
  };

  const handleAliasInputChange = (
    sourceId: string,
    sheet: string | null,
    value: string
  ) => {
    const key = aliasKey(sourceId, sheet);
    setAliasInputs((prev) => ({ ...prev, [key]: value }));
  };

  const commitAliasChange = (source: AiDataSource, sheet: string | null) => {
    const key = aliasKey(source.id, sheet);
    const rawValue = aliasInputs[key] ?? "";
    const trimmed = rawValue.trim();
    const finalValue = trimmed || getDefaultAliasValue(source, sheet);
    setAliasInputs((prev) => ({ ...prev, [key]: finalValue }));
    const updatedAliases = {
      ...(source.tableAliases || {}),
      [sheet ?? "__default"]: finalValue,
    };
    updateSource(source.id, {
      tableAliases: updatedAliases,
      alias: updatedAliases.__default,
    });
  };

  const handleMysqlModalToggle = (open: boolean) => {
    if (!open) {
      resetMysqlForm();
    }
    onMysqlModalChange(open);
  };

  useEffect(() => {
    setExpandedFiles((prev) => {
      const next = { ...prev };
      aiSources.forEach((source) => {
        if (next[source.id] === undefined) {
          next[source.id] = true;
        }
      });
      return next;
    });
  }, [aiSources]);

  useEffect(() => {
    setExpandedSheets((prev) => {
      const next = { ...prev };
      aiSources.forEach((source) => {
        const key = `${source.id}-${source.sheetName ?? "default"}`;
        if (next[key] === undefined) {
          next[key] = true;
        }
      });
      return next;
    });
  }, [aiSources]);

  const aiSourceList = useMemo(
    () =>
      aiSources.map((item) => ({
        id: item.id,
        fileName: item.type === "file" ? item.path.split(/[/\\]/).pop() ?? item.path : item.path,
        alias: item.alias,
        path: item.path,
        sheet: item.sheetName,
        headers: item.headers,
        type: item.type,
        connectionString: item.connectionString,
        tableAliases: item.tableAliases ?? { __default: item.alias },
        sheetOptions: item.sheetOptions,
      })),
    [aiSources]
  );

  const copyToClipboard = async (text: string) => {
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  const toggleFile = (id: string) => {
    setExpandedFiles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSheet = (key: string) => {
    setExpandedSheets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAliasChange = (
    id: string,
    value: string,
    commit?: boolean
  ) => {
    // 允许把表名清空，不再强制保留最后一个字符
    updateSource(id, { alias: value });
  };

  const renderFieldList = (fields: string[], parentKey: string) => {
    if (!fields.length) {
      return (
        <div
          style={{
            paddingLeft: "24px",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          暂无字段信息
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {fields.map((field, index) => (
          <div
            key={`${parentKey}-field-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#374151",
              paddingLeft: "20px",
            }}
          >
            <span style={{ wordBreak: "break-all" }}>{field}</span>
            <Button
              size="sm"
              isIconOnly
              variant="light"
              onPress={() => copyToClipboard(field)}
            >
              <FontAwesomeIcon icon={faCopy} />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderSourceTree = () => {
    if (!aiSourceList.length) {
      return (
        <div
          style={{
            padding: "20px 15px",
            color: "#6b7280",
            fontSize: "13px",
            textAlign: "left",
          }}
        >
          还没有导入的数据源。请在 AI 模式中点击“导入数据源”选择文件，我们会在这里展示它们。
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px 15px",
        }}
      >
        {aiSourceList.map((item) => {
          const sheetKey = `${item.id}-${item.sheet ?? "default"}`;
          const isFileExpanded = expandedFiles[item.id] ?? true;
          const isSheetExpanded = expandedSheets[sheetKey] ?? true;
          const sourceDetail = aiSources.find((src) => src.id === item.id);
          const isMysql = sourceDetail?.type === "mysql";
          return (
            <div
              key={item.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "13px",
                color: "#1f2937",
                textAlign: "left",
                backgroundColor: "#fdfdfd",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => toggleFile(item.id)}
                >
                  <FontAwesomeIcon
                    icon={isFileExpanded ? faChevronDown : faChevronRight}
                  />
                </Button>
                <FontAwesomeIcon icon={faFolder} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "#111827",
                    wordBreak: "break-all",
                  }}
                >
                  {item.fileName}
                </div>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => {
                    setSources((prev) => prev.filter((source) => source.id !== item.id));
                    aiPanelData?.handleRemoveAiSource?.(item.id);
                  }}
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </Button>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "6px",
                  wordBreak: "break-all",
                }}
              >
                {item.path}
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  style={{ marginLeft: "6px" }}
                  onPress={() => copyToClipboard(item.path)}
                >
                  <FontAwesomeIcon icon={faCopy} />
                </Button>
              </div>
              {isMysql && sourceDetail?.connectionString && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#4b5563",
                    marginTop: "4px",
                    wordBreak: "break-all",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  连接：{sourceDetail.connectionString}
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() =>
                      copyToClipboard(sourceDetail.connectionString || "")
                    }
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </Button>
                </div>
              )}
              {isFileExpanded && (
                <div style={{ marginTop: "8px" }}>
                  {item.sheet ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => toggleSheet(sheetKey)}
                        >
                          <FontAwesomeIcon
                            icon={
                              isSheetExpanded ? faChevronDown : faChevronRight
                            }
                          />
                        </Button>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#4b5563",
                              wordBreak: "break-all",
                            }}
                          >
                            工作表：{item.sheet}
                          </span>
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => copyToClipboard(item.sheet ?? "")}
                          >
                            <FontAwesomeIcon icon={faCopy} />
                          </Button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                          paddingLeft: "32px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          表名
                        </span>
                        <input
                          value={item.alias}
                          onChange={(e) =>
                            handleAliasChange(item.id, e.target.value)
                          }
                          onBlur={(e) =>
                            handleAliasChange(item.id, e.target.value, true)
                          }
                          style={{
                            flex: 1,
                            minWidth: 0,
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "4px 6px",
                            fontSize: "12px",
                          }}
                        />
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => copyToClipboard(item.alias)}
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </Button>
                      </div>
                      {isSheetExpanded &&
                        renderFieldList(item.headers, `${item.id}-sheet`)}
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                          paddingLeft: "8px",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          表名
                        </span>
                        <input
                          value={item.alias}
                          onChange={(e) =>
                            handleAliasChange(item.id, e.target.value)
                          }
                          onBlur={(e) =>
                            handleAliasChange(item.id, e.target.value, true)
                          }
                          style={{
                            flex: 1,
                            minWidth: 0,
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "4px 6px",
                            fontSize: "12px",
                          }}
                        />
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => copyToClipboard(item.alias)}
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </Button>
                      </div>
                      {renderFieldList(item.headers, `${item.id}-fields`)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        width: "250px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          height: 60,
          borderBottom: "1px solid rgba(17, 17, 17, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingLeft: "15px",
          paddingRight: "15px",
        }}
      >
        <Button
          isIconOnly
          aria-label="Like"
          style={{
            backgroundColor: "transparent",
            fontSize: "21px",
            padding: "10px",
          }}
        >
          <FontAwesomeIcon
            icon={faDatabase}
            size="lg"
            color={"#000000"}
            className="hover:text-black"
          />
        </Button>{" "}
      </div>
      {source === "" ? (
        <div>
          <p
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              textAlign: "left",
              paddingLeft: "15px",
              paddingTop: "10px",
              color: "gray",
            }}
          >
            Sources
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "0 15px 10px 15px",
              flexWrap: "wrap",
            }}
          >
            <Dropdown>
              <DropdownTrigger>
                <Button
                  startContent={<FontAwesomeIcon icon={faFileImport} />}
                  isDisabled={aiPanelBusy}
                  isLoading={Boolean(aiPanelBusy)}
                >
                  新增数据源
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                onAction={(key) => {
                  if (key === "file") {
                    triggerFileImport();
                  } else if (key === "mysql") {
                    handleOpenMysqlModal();
                  }
                }}
              >
                <DropdownItem key="file">文件数据源</DropdownItem>
                <DropdownItem key="mysql">MySQL 数据源</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            {aiSources.length > 0 && (
              <Button
                startContent={<FontAwesomeIcon icon={faTrashCan} />}
                variant="light"
                onPress={() => {
                  setSources([]);
                  aiPanelData?.clearAllAiSources?.();
                }}
                isDisabled={aiPanelBusy}
              >
                清除全部
              </Button>
            )}
          </div>
          {renderSourceTree()}
        </div>
      ) : (
        <div
          style={{
            padding: "15px",
            textAlign: "left",
          }}
        >
          <Button
            startContent={<FontAwesomeIcon icon={faChevronLeft} />}
            variant="light"
            onPress={() => setSource("")}
            style={{ marginBottom: "10px" }}
          >
            返回
          </Button>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            目录视图暂未实现。请选择“Local”返回主列表。
          </p>
        </div>
      )}
      <Modal isOpen={isMysqlModalOpen} onOpenChange={handleMysqlModalToggle}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>新增 MySQL 数据源</ModalHeader>
              <ModalBody
                style={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <label style={{ fontSize: "13px", textAlign: "left" }}>
                  表名
                  <input
                    type="text"
                    value={mysqlTable}
                    onChange={(e) => setMysqlTable(e.target.value)}
                    placeholder="如 orders"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "6px",
                      marginTop: "4px",
                    }}
                  />
                </label>
                <label style={{ fontSize: "13px", textAlign: "left" }}>
                  表别名（可选）
                  <input
                    type="text"
                    value={mysqlAlias}
                    onChange={(e) => setMysqlAlias(e.target.value)}
                    placeholder="展示用名称"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "6px",
                      marginTop: "4px",
                    }}
                  />
                </label>
                <label style={{ fontSize: "13px", textAlign: "left" }}>
                  连接串
                  <textarea
                    value={mysqlConn}
                    onChange={(e) => setMysqlConn(e.target.value)}
                    placeholder="例如 mysql://user:pass@host:3306/database"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "6px",
                      marginTop: "4px",
                      minHeight: "60px",
                    }}
                  />
                </label>
                {mysqlError && (
                  <span style={{ color: "#dc2626", fontSize: "12px" }}>
                    {mysqlError}
                  </span>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleCreateMysqlSource(onClose)}
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default memo(NotebookLeft);
