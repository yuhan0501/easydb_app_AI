use crate::commands::run_blocking;
use crate::context::error::AppError;
use crate::context::schema::AppResult;
use calamine::{open_workbook_auto, Reader};

#[tauri::command]
pub async fn list_excel_sheets(path: String) -> AppResult<Vec<String>> {
    run_blocking(move || {
        let mut workbook = open_workbook_auto(path.clone()).map_err(|err| AppError::BadRequest {
            message: format!("无法打开 Excel 文件: {err}"),
        })?;
        Ok(workbook.sheet_names().to_vec())
    })
    .await
}
