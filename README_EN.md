# EasyDB

<div align="center">

![EasyDB Logo](public/logo.png)

**A lightweight desktop data query tool that uses SQL to query local files directly with built-in query engine**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/yuhan0501/easydb_app_AI.git)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/shencangsheng/easydb_app)

[English](README_EN.md) | [中文](README.md)

</div>

## 📖 Introduction

EasyDB is a lightweight desktop data query tool built with Rust that lets you query local files directly using standard SQL. With the built-in DataFusion query engine, you do not need to install any external database or additional services. Files are treated as database tables, so you can run SQL against CSV, Excel, JSON and other formats, including complex multi-table JOINs, subqueries, window functions and other advanced SQL features. It can comfortably handle text files from hundreds of MB up to multiple GB while using relatively modest hardware resources.

![demo.gif](assets/demo.gif)

## ✨ Core Features

- 🚀 **High Performance**: Built on Rust and DataFusion engine, effortlessly handles large files
- 💾 **Low Memory Usage**: Requires minimal hardware resources
- 📁 **Multi-format Support**: CSV, NdJson (line-delimited JSON), Excel, Parquet file formats
- 🔧 **Ready to Use**: No file conversion required, query directly
- 🖥️ **Cross-platform**: Supports macOS and Windows platforms
- 🎨 **Modern Interface**: Modern desktop application built with Tauri
- 🤖 **AI SQL Assistant**: Generate SQL from natural language and auto-repair failed queries with LLMs
- 📂 **Sources Panel**: Manage local files & MySQL data sources on the left sidebar with previews and aliases
- 🧲 **Drag & Drop SQL Helper**: Drop files into the editor to insert a full example query or `read_xxx()` call
- 🔍 **Complete SQL Support**: Supports complex SQL queries, including JOINs, subqueries, window functions, and other advanced features

## 📖 Changelog

[Changelog](CHANGELOG_EN.md)

## 🗺️ Features & Roadmap

- [x] read_csv()
- [x] read_tsv()
- [x] read_ndjson()
- [ ] read_json()
- [x] read_excel()
- [x] read_parquet()
- [ ] Excel lazy loading performance optimization
- [ ] Excel enhanced data type compatibility
- [ ] Multi-session window support
- [x] Drag & drop file automatically generate SQL statement
- [ ] Directory browsing support
- [ ] S3 remote file support
- [ ] Support for direct querying of server files
- [ ] Data visualization support
- [x] Query result export functionality
- [x] Export SQL statements (Insert, Update)
- [x] read_mysql()

## 🛠️ Technical Architecture

### Core Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Query Engine**: [apache/datafusion](https://github.com/apache/datafusion)
- **UI Framework**: HeroUI + Tailwind CSS

### Query Engine Selection

**Currently Using**: DataFusion

DataFusion is part of the Apache Arrow project, providing complete SQL query capabilities and supporting complex SQL syntax, including multi-table JOINs, subqueries, window functions, and other advanced features. Compared to Polars, DataFusion offers more comprehensive SQL compatibility, meeting more complex query requirements.

**Version Evolution**: Version v1.0 previously used the Polars engine. While Polars excelled in stream processing and memory usage, it had limitations in supporting complex SQL queries. Version v2.0 switched back to DataFusion to gain more complete SQL support while maintaining good performance and resource utilization efficiency.

## 📚 User Guide

### Basic Syntax

```sql
-- Query CSV files
SELECT *
FROM read_csv('/path/to/file.csv', infer_schema => false)
WHERE `age` > 30
LIMIT 10;

-- Query Excel files
SELECT *
FROM read_excel('/path/to/file.xlsx', sheet_name => 'Sheet2')
WHERE `age` > 30
LIMIT 10;

-- Query JSON files
SELECT *
FROM read_json('/path/to/file.json')
WHERE `status` = 'active';

-- Query MySQL database
SELECT *
FROM read_mysql('users', conn => 'mysql://user:password@localhost:3306/mydb')
WHERE `age` > 30
```

### Supported File Formats

| Format  | Function         | Description                             |
| ------- | ---------------- | --------------------------------------- |
| CSV     | `read_csv()`     | Supports custom delimiters and encoding |
| Excel   | `read_excel()`   | Supports multiple worksheets            |
| JSON    | `read_json()`    | Supports nested structures              |
| NdJson  | `read_ndjson()`  | One JSON object per line                |
| Parquet | `read_parquet()` | Columnar storage format                 |

## 🚀 Quick Start

### System Requirements

- **macOS**: 10.15+ (Catalina or higher)
- **Windows**: Windows 10 or higher
- **Memory**: Recommended 4GB or more
- **Storage**: At least 100MB available space

### Installation
 TBD
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

String values in WHERE clauses should be wrapped in single quotes, for example:

```sql
SELECT * FROM table WHERE "id" = '1';
```

## 📖 Project Background

### From Server to App

[EasyDB Server](https://github.com/shencangsheng/easy_db) is mainly deployed on Linux servers as a web service supporting efficient querying of large-scale text files. Although Docker deployment solutions are provided, usage on macOS is still not convenient enough.

For this reason, I developed the EasyDB App client, specifically optimized for macOS and Windows platforms to improve the local user experience.

### Project Naming

To better distinguish between the two projects:

- **EasyDB Server**: Server-side version, based on DataFusion
- **EasyDB App**: Desktop client version, based on DataFusion (v2.0+)

## 🤝 Contributing

We welcome contributions in all forms!

### How to Contribute

1. **Fork** this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

### Development Environment

```bash
# Clone repository
git clone https://github.com/shencangsheng/easydb_app.git
cd easydb_app

# Start development server
cargo tauri dev

# Build application
cargo tauri build
```

## 📄 License

A short snippet describing the license (MIT)


## 🙏 Acknowledgments

Thanks to the following open source projects:

- [apache/datafusion](https://github.com/apache/datafusion) - High-performance SQL query engine
- [Tauri](https://tauri.app/) - Modern desktop application framework
- [React](https://reactjs.org/) - User interface library
- [HeroUI](https://heroui.com/) - Modern UI component library
- [datafusion-table-providers](https://github.com/apache/arrow-datafusion-table-providers) - DataFusion extension

### Contributors

<a href="https://github.com/shencangsheng/easydb_app/contributors">
  <img src="https://contrib.rocks/image?repo=shencangsheng/easydb_app" /></a>

## 📞 Contact Us

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/shencangsheng/easydb_app/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/shencangsheng/easydb_app/discussions)
- 📧 **Email**: shencangsheng@126.com

---
