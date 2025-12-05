# EasyDB

<div align="center">

![EasyDB Logo](public/128x128.png)

**A lightweight desktop data query tool that lets you query local files directly with SQL, backed by a built-in query engine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/yuhan0501/easydb_app_AI.git)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/shencangsheng/easydb_app)

[English](README_EN.md) | [中文](README.md)

</div>

## 📖 Introduction

EasyDB is a lightweight desktop data query tool built with Rust that lets you query local files directly using standard SQL. With the built-in DataFusion query engine, you do not need to install any external database or additional services. Files are treated as database tables, so you can run SQL against CSV, Excel, JSON and other formats, including complex multi-table JOINs, subqueries, window functions and other advanced SQL features. It can comfortably handle text files from hundreds of MB up to multiple GB while using relatively modest hardware resources.

![demo.gif](assets/demo.gif)

## ✨ Core Features

- 🚀 **High performance**: Powered by Rust and the DataFusion engine, designed for large files
- 💾 **Low memory footprint**: Works well on machines with limited resources
- 📁 **Multiple formats**: Supports CSV, NdJson, JSON, Excel, Parquet and more
- 🔧 **Ready to use**: Query files directly without conversion
- 🖥️ **Cross‑platform**: Runs on both macOS and Windows
- 🎨 **Modern UI**: Desktop app built with Tauri
- 🔍 **Full SQL support**: Complex SQL, including JOINs, subqueries, window functions
- 📦 **AI SQL assistant**: Generate or repair SQL from natural language

## 📖 Changelog

[Changelog](CHANGELOG_EN.md)

## 🗺️ Features & Roadmap

- [x] `read_csv()`
- [x] `read_tsv()`
- [x] `read_ndjson()`
- [ ] `read_json()`
- [x] `read_excel()`
- [x] `read_parquet()`
- [ ] Excel lazy‑loading performance optimizations
- [ ] Better data type compatibility for Excel
- [ ] Multiple session windows
- [x] Drag & drop files to auto‑generate SQL
- [ ] Directory browsing
- [ ] S3 remote file support
- [ ] Query files directly on remote servers
- [ ] Data visualization
- [x] Export query results
- [x] Export query results as SQL statements (INSERT, UPDATE)
- [x] `read_mysql()`

## 🛠️ Technical Architecture

### Core Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop shell / backend**: Rust + Tauri
- **Query engine**: [apache/datafusion](https://github.com/apache/datafusion)
- **UI framework**: HeroUI + Tailwind CSS

### Query Engine Choice

**Current engine**: DataFusion

DataFusion is part of the Apache Arrow project and provides a full SQL execution engine, including support for complex SQL syntax such as multi‑table JOINs, subqueries and window functions. Compared with Polars, DataFusion offers more complete SQL compatibility, which better fits complex analytical workloads.

**Version history**: Version v1.0 used the Polars engine. Polars performs very well for streaming workloads and memory usage, but has limitations around full SQL support. From v2.0 onwards EasyDB switched back to DataFusion to regain full SQL compatibility while keeping strong performance and efficient resource usage.

## 📚 User Guide

## AI SQL Assistant

EasyDB ships with a configurable AI SQL assistant. It talks to the Tauri backend, which exposes AI commands that can call any OpenAI‑compatible `chat/completions` API.

- **Two working modes**
  - `ai` (recommended): describe your requirement in natural language and get SQL automatically
  - `expert`: closer to raw SQL, giving you more fine‑grained control
- **Two core capabilities**
  - `generateSqlWithModel`: generate SQL (plus optional explanation) from a requirement
  - `repairSqlWithModel`: rewrite and fix SQL that failed to execute
- **Configurable model parameters**
  - Provider type (OpenAI‑compatible)
  - Base URL and API key
  - Model name (for example `gpt-4o-mini`)
  - Temperature, max tokens, retry limit

### Basic Syntax

```sql
-- Query a CSV file
SELECT *
FROM read_csv('/path/to/file.csv', infer_schema => false)
WHERE `age` > 30
LIMIT 10;

-- Query an Excel file
SELECT *
FROM read_excel('/path/to/file.xlsx', sheet_name => 'Sheet2')
WHERE `age` > 30
LIMIT 10;

-- Query a JSON file
SELECT *
FROM read_dnjson('/path/to/file.json')
WHERE `status` = 'active';

-- Query a MySQL database
SELECT *
FROM read_mysql('users', conn => 'mysql://user:password@localhost:3306/mydb')
WHERE `age` > 30
```

### Supported File Formats

| Format  | Function         | Description                                  |
| ------- | ---------------- | -------------------------------------------- |
| CSV     | `read_csv()`     | Supports custom delimiters and encoding      |
| Excel   | `read_excel()`   | Supports multiple worksheets                 |
| JSON    | `read_json()`    | Supports nested structures                   |
| NdJson  | `read_ndjson()`  | One JSON object per line                     |
| Parquet | `read_parquet()` | Columnar storage format                      |

## 🚀 Quick Start

### System Requirements

- **macOS**: 10.15+ (Catalina or later)
- **Windows**: Windows 10 or later
- **Memory**: 4 GB RAM or more recommended
- **Disk space**: At least 100 MB free

### Installation

1. **Download installer**
   - Visit the [Releases](https://github.com/shencangsheng/easydb_app/releases) page
   - Download the installer that matches your OS
2. **Install application**
   - **macOS**: Download the `.dmg` file and drag the app into the `Applications` folder
   - **Windows**: Download the `.exe` and run the installer

## ❓ Frequently Asked Questions

### macOS: “App is damaged and cannot be opened”

**Problem**: When launching EasyDB on macOS, you see a message like "App is damaged and cannot be opened".

**Reason**: macOS Gatekeeper may block unsigned apps.

**Fix**:

1. Open **Terminal**.
2. Run:

```bash
xattr -r -d com.apple.quarantine /Applications/EasyDB.app
```

3. Try opening the app again.

**Alternative** (via System Settings):

1. Open **System Settings** → **Privacy & Security**.
2. In the **General** tab, find the blocked app.
3. Click **Open Anyway**.

### SQL quoting rules

- Column names can be wrapped in **double quotes**, for example:

```sql
SELECT "id", "name" FROM table WHERE "id" = 1;
```

- Or wrapped in **backticks**:

```sql
SELECT `id`, `name` FROM table WHERE `id` = 1;
```

- String values in `WHERE` clauses use **single quotes**:

```sql
SELECT * FROM table WHERE "id" = '1';
```

## 📖 Project Background

### From Server to Desktop App

[EasyDB Server](https://github.com/shencangsheng/easy_db) is primarily deployed on Linux servers as a web service for querying large text files efficiently. Although Docker deployments are available, day‑to‑day usage on macOS is still not very convenient.

To improve the local experience on personal machines, EasyDB App was created as a desktop client specifically optimized for macOS and Windows.

### Naming

To distinguish the two projects:

- **EasyDB Server**: Server‑side project based on DataFusion
- **EasyDB App**: Desktop client project based on DataFusion (v2.0+)

## 🤝 Contributing

We welcome all kinds of contributions.

### How to contribute

1. **Fork** this repository.
2. Create a feature branch: `git checkout -b feature/AmazingFeature`.
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`.
4. Push to your branch: `git push origin feature/AmazingFeature`.
5. Open a **Pull Request**.

### Development environment

```bash
# Clone the repo
git clone https://github.com/shencangsheng/easydb_app.git
cd easydb_app

# Start the dev server
cargo tauri dev

# Build the app
cargo tauri build
```

## 📄 License

MIT © Cangsheng Shen

## 👨‍💻 Author

**Cangsheng Shen**

- Email: shencangsheng@126.com

## 🙏 Acknowledgments

Thanks to the following open‑source projects:

- [apache/datafusion](https://github.com/apache/datafusion) – high‑performance SQL query engine
- [Tauri](https://tauri.app/) – modern desktop application framework
- [React](https://reactjs.org/) – UI library
- [HeroUI](https://heroui.com/) – modern UI component library
- [datafusion-contrib](https://github.com/datafusion-contrib) – DataFusion extensions
- GitHub: [@shencangsheng](https://github.com/shencangsheng)
