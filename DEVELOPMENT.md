# Development

> 交付目标是 macOS 桌面 `.app`。`workbench-prototype/` 仅作为 Tauri 内嵌前端资源和交互验收基线，不是最终网页交付物。

## Native build gate

Tauri依赖必须保存在Cargo默认的用户级共享缓存中，禁止把`CARGO_HOME`重定向到项目目录。首次获取前应确认磁盘空间；该步骤可能写入数十到数百MB，具体取决于现有缓存。

在VS Code的新终端中执行一次：

```bash
cd /path/to/personal-growth-workbench/src-tauri
cargo fetch
```

完成后，Codex先运行离线检查，确保不会继续联网下载：

```bash
./scripts/native-preflight.sh
```

预检通过后再运行原生窗口和构建未签名`.app`。开发构建与发布构建分开执行，避免一次产生多套大型构建产物。

## Native preview shell

当Crates.io不可访问时，可使用系统Clang构建小型AppKit/WebKit预览壳：

```bash
./scripts/build-native-preview.sh
```

输出位于`desktop-dist/个人成长工作台.app`。它是真正的 macOS 应用包，用于原生窗口和视觉验收，并使用本地临时签名。当前原生壳已通过系统 SQLite 接入核心状态存储，首次运行会把旧 `localStorage` 状态迁入数据库并删除旧缓存。后续 Tauri 正式壳必须保持相同的数据库路径、schema 版本和迁移语义。

默认数据库位于 `~/Library/Application Support/com.qiuyu.personalgrowthworkbench/workbench.sqlite3`。设置页可选择文件夹并通过 SQLite backup API 迁移到 `个人成长工作台.sqlite3`；切换成功后旧数据库保留，不自动删除。从旧预览 Bundle ID 首次升级时也使用 SQLite backup API 保留式迁移。运行无 GUI 自检：

```bash
desktop-dist/个人成长工作台.app/Contents/MacOS/GrowthWorkbench --database-self-test
```

AI设置页允许手动填写配置名称、API服务、Base URL、模型ID和月度预算。API密钥通过`workbench`原生消息桥写入macOS钥匙串，服务标识为`com.qiuyu.personalgrowthworkbench.ai`；首次读取旧服务凭据时复制到新服务但不删除旧项。密钥不得写入 SQLite、日志、备份或源码，也不得由原生层返回 JavaScript。

“测试连接”由原生层从钥匙串读取密钥，对规范化后的`/v1/models`或`/models`端点执行只读请求。该测试不发送提示词、工作台数据或附件，也不执行模型生成；前端只接收HTTP成功状态或归类后的错误代码。

有道接入使用有道智云官方文本翻译 API `https://openapi.youdao.com/api`。应用 ID 与应用密钥均通过原生消息桥保存到 macOS 钥匙串；WebView 不保存或读回凭据。原生层按 v3 规则生成 SHA-256 签名，连接测试仅查询固定词 `hello`。英语学习页的查询结果作为参考释义，必须由用户确认加入今日词表，不能静默替代用户作答或人工改判。

## Current structure

- `workbench-prototype/`: dependency-free frontend prototype used as Tauri's `frontendDist`.
- `src-tauri/`: minimal Tauri v2 native shell.
- `outputs/`: authoritative product specification.
- `OPEN_SOURCE_RESOURCES.md`: approved third-party resource registry and adoption boundaries.
- `docs/OPEN_SOURCE_WORKFLOW.md`: application and Workbench skill release workflow.
- `docs/RECOMMENDATION_AGENT_WORKFLOW.md`: DeepSeek-driven news and literature update workflow.

## Toolchain

安装 Rust 后，新终端通常可直接使用 `cargo`。若当前终端尚未加载环境，运行：

```bash
source "$HOME/.cargo/env"
```

The Tauri crates and CLI are not downloaded yet. The first dependency fetch and
build must be performed as a separate, size-monitored batch. Until then, open
`workbench-prototype/index.html` directly to use the prototype.

## Disk protection

Do not run broad dependency installs, bulk imports, or full rebuild loops without
checking expected size. Fetch and build in explicit batches, inspect disk growth,
and avoid copying user files when a stable reference is sufficient.

## Desktop delivery rule

Every completed application update must be rebuilt in `desktop-dist/` and then copied through Finder to `$HOME/Desktop/个人成长工作台.app`. Verification is not complete until both packages contain the updated resources, pass `codesign --verify --deep --strict`, and the desktop copy opens successfully.
