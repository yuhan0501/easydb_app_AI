use crate::context::error::AppError;
use crate::context::schema::AppResult;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelConfig {
    pub provider: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub retry_limit: u32,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationRequest {
    pub prompt: String,
    pub source: Option<String>,
    pub previous_sql: Option<String>,
    pub data_preview: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRepairRequest {
    #[serde(flatten)]
    pub base: AiGenerationRequest,
    pub failed_sql: String,
    pub error_message: String,
    pub attempt: u32,
}

#[derive(Debug, Deserialize)]
pub struct AiCommandPayload<T> {
    pub request: T,
    pub config: AiModelConfig,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSqlResponse {
    pub sql: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    temperature: f32,
    #[serde(rename = "max_tokens")]
    max_tokens: u32,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
}

#[derive(Debug, Deserialize)]
struct ChatMessageResponse {
    content: Option<String>,
}

#[tauri::command]
pub async fn ai_generate_sql(payload: AiCommandPayload<AiGenerationRequest>) -> AppResult<AiSqlResponse> {
    let AiCommandPayload { request, config } = payload;
    let user_prompt = build_generation_prompt(&request);
    call_model(&config, user_prompt).await
}

#[tauri::command]
pub async fn ai_repair_sql(payload: AiCommandPayload<AiRepairRequest>) -> AppResult<AiSqlResponse> {
    let AiCommandPayload { request, config } = payload;
    let user_prompt = build_repair_prompt(&request);
    call_model(&config, user_prompt).await
}

async fn call_model(config: &AiModelConfig, user_prompt: String) -> AppResult<AiSqlResponse> {
    validate_config(config)?;
    let client = Client::new();
    let temperature = config.temperature.clamp(0.0, 1.0);
    let max_tokens = config.max_tokens.max(512);

    let completion_url = resolve_completion_url(&config.base_url);

    let request_body = ChatCompletionRequest {
        model: config.model.clone(),
        temperature,
        max_tokens,
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ],
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", config.api_key))
            .map_err(|err| AppError::BadRequest {
                message: format!("Invalid API key: {err}"),
            })?,
    );

    let response = client
        .post(&completion_url)
        .headers(headers)
        .json(&request_body)
        .send()
        .await
        .map_err(|err| AppError::InternalServer {
            message: format!("AI request failed: {err}"),
        })?;

    if !response.status().is_success() {
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unable to read error body".to_string());
        return Err(AppError::InternalServer {
            message: format!("AI provider returned error: {body}"),
        });
    }

    let completion: ChatCompletionResponse = response
        .json()
        .await
        .map_err(|err| AppError::InternalServer {
            message: format!("Invalid AI response: {err}"),
        })?;

    let content = completion
        .choices
        .get(0)
        .and_then(|choice| choice.message.content.clone())
        .ok_or(AppError::InternalServer {
            message: "AI provider returned empty content".to_string(),
        })?;

    parse_model_response(&content)
}

fn validate_config(config: &AiModelConfig) -> AppResult<()> {
    if config.base_url.trim().is_empty() {
        return Err(AppError::BadRequest {
            message: "AI base URL is required".to_string(),
        });
    }
    if config.api_key.trim().is_empty() {
        return Err(AppError::BadRequest {
            message: "AI API key is required".to_string(),
        });
    }
    if config.model.trim().is_empty() {
        return Err(AppError::BadRequest {
            message: "AI model name is required".to_string(),
        });
    }
    Ok(())
}

fn resolve_completion_url(base_url: &str) -> String {
    let trimmed = base_url.trim();
    if trimmed.is_empty() {
        return base_url.to_string();
    }

    let normalized = trimmed.trim_end_matches('/');
    if normalized.ends_with("/chat/completions") {
        normalized.to_string()
    } else {
        format!("{}/chat/completions", normalized)
    }
}

fn build_generation_prompt(request: &AiGenerationRequest) -> String {
    let mut sections = Vec::new();
    sections.push(format!(
        "## 用户需求\n{}\n",
        request.prompt.trim()
    ));

    if let Some(source) = &request.source {
        if !source.trim().is_empty() {
            sections.push(format!(
                "## 数据来源\n{}\n",
                source.trim()
            ));
        }
    }

    if let Some(previous_sql) = &request.previous_sql {
        if !previous_sql.trim().is_empty() {
            sections.push(format!(
                "## 历史 SQL 参考\n{}\n",
                previous_sql.trim()
            ));
        }
    }

    if let Some(preview) = &request.data_preview {
        if !preview.trim().is_empty() {
            sections.push(format!(
                "## 样例数据 (JSON)\n{}\n",
                preview.trim()
            ));
        }
    }

    sections.push(SUPPORTED_FUNCTIONS.to_string());
    sections.join("\n")
}

fn build_repair_prompt(request: &AiRepairRequest) -> String {
    let mut sections = Vec::new();
    sections.push("请基于下面的信息修复 SQL 并确保可以在 EasyDB(DataFusion) 中执行：".to_string());
    sections.push(format!(
        "## 原始需求\n{}\n",
        request.base.prompt.trim()
    ));
    if let Some(source) = &request.base.source {
        if !source.trim().is_empty() {
            sections.push(format!("## 数据来源\n{}\n", source.trim()));
        }
    }
    sections.push(format!(
        "## 最近一次 SQL (需要修复)\n{}\n",
        request.failed_sql.trim()
    ));
    sections.push(format!(
        "## 错误信息\n{}\n",
        request.error_message.trim()
    ));
    sections.push(format!("## 当前重试次数\n{}\n", request.attempt));
    if let Some(preview) = &request.base.data_preview {
        if !preview.trim().is_empty() {
            sections.push(format!(
                "## 可参考的数据样本 (JSON)\n{}\n",
                preview.trim()
            ));
        }
    }
    sections.push("请输出新的 SQL，并简要说明修改关键点。".to_string());
    sections.push(SUPPORTED_FUNCTIONS.to_string());
    sections.join("\n")
}

fn parse_model_response(content: &str) -> AppResult<AiSqlResponse> {
    if let Some(json_candidate) = extract_json_block(content) {
        if let Ok(parsed) = serde_json::from_str::<AiSqlResponse>(&json_candidate) {
            if !parsed.sql.trim().is_empty() {
                return Ok(parsed);
            }
        } else if let Ok(value) = serde_json::from_str::<Value>(&json_candidate) {
            if let Some(sql) = value.get("sql").and_then(Value::as_str) {
                let reasoning = value
                    .get("reasoning")
                    .and_then(Value::as_str)
                    .map(|s| s.to_string());
                if !sql.trim().is_empty() {
                    return Ok(AiSqlResponse {
                        sql: sql.to_string(),
                        reasoning,
                    });
                }
            }
        }
    }

    let cleaned = content.trim().trim_matches('`').trim();
    if cleaned.is_empty() {
        return Err(AppError::InternalServer {
            message: "模型未返回 SQL 语句".to_string(),
        });
    }
    Ok(AiSqlResponse {
        sql: cleaned.to_string(),
        reasoning: None,
    })
}

fn extract_json_block(content: &str) -> Option<String> {
    if let Some(start) = content.find("```json") {
        let remainder = &content[start + 7..];
        if let Some(end) = remainder.find("```") {
            return Some(remainder[..end].trim().to_string());
        }
    }

    let start = content.find('{')?;
    let end = content.rfind('}')?;
    if end > start {
        return Some(content[start..=end].trim().to_string());
    }
    None
}

const SYSTEM_PROMPT: &str = r#"
你是 EasyDB 的 SQL 助手。EasyDB 使用 Apache DataFusion SQL 引擎以及 read_xxx 表值函数读取本地文件。
目标：从用户的自然语言需求中生成可以直接执行的 SELECT 查询。
指导原则：
1. 仅生成 SELECT/CTE，不要包含 DROP/INSERT/UPDATE/DELETE/CREATE 等修改语句。
2. 如果字段或表名包含特殊字符，请使用双引号括起来。
3. 优先使用 read_csv/read_excel/read_ndjson/read_parquet/read_tsv/read_mysql 等函数访问数据；需要的参数用 => 语法传递。
4. 如果信息不足，请做合理假设并在 reasoning 中说明。
5. 保持 SQL 短小、易读，并在结尾添加 LIMIT 200 以避免超大结果。
6. 最终输出必须是 JSON 对象：{"sql": "...", "reasoning": "..."}，不要添加额外文本或提示。
"#;

const SUPPORTED_FUNCTIONS: &str = r#"
## 可用的 DataFusion 文件函数
- read_csv(path, infer_schema => true, has_header => true, delimiter => ",")
- read_tsv(path, infer_schema => true, has_header => true)
- read_excel(path, sheet_name => 'Sheet1', infer_schema => true)
- read_ndjson(path, infer_schema => true)
- read_parquet(path)
- read_mysql(table_name, conn => 'mysql://user:pass@host:3306/db')
如果查询结果需要汇总或过滤，请使用标准 SQL（WHERE、GROUP BY、ORDER BY、CTE、窗口函数等）。
"#;
