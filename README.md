# 个人成长工作台

作者：邱昱

[![Source checks](https://github.com/yuqiu7554/personal-growth-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/yuqiu7554/personal-growth-workbench/actions/workflows/ci.yml)
[![CodeQL](https://github.com/yuqiu7554/personal-growth-workbench/actions/workflows/codeql.yml/badge.svg)](https://github.com/yuqiu7554/personal-growth-workbench/actions/workflows/codeql.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

个人成长工作台是一款本地优先的 macOS 桌面应用，用于统一管理计划、科研、英语学习、资料、健康记录和复盘。核心记录保存在 SQLite，AI 与词典服务由用户自行配置凭据。

## 当前状态

当前为公开 1.0 前的 `0.6.1` 源码开发版本。可运行包采用 Objective-C、AppKit、WebKit 和系统 SQLite；`workbench-prototype` 是打包进 `.app` 的界面资源，不是独立网页产品。

项目仓库：<https://github.com/yuqiu7554/personal-growth-workbench>

本阶段只发布源码，不在 GitHub Releases 提供未经 Developer ID 签名和 Apple 公证的 `.app` 或 DMG。使用者可在自己的 Mac 上审查并构建源码；未来是否提供预编译版本取决于项目反馈和 Apple 发布投入。

> [!IMPORTANT]
> 当前仓库适合开发者审查、构建和参与测试，尚不是面向普通用户的一键安装发行版。请勿从第三方网站下载声称由本项目发布的安装包。

## 目录

- [主要能力](#主要能力)
- [系统要求](#系统要求)
- [从源码构建](#从源码构建)
- [数据与隐私](#数据与隐私)
- [项目结构](#项目结构)
- [当前限制](#当前限制)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 主要能力

- 总览、日历、待办、目标、周总结、月总结和今日复盘形成规划闭环。
- 小论文与毕业论文项目、里程碑、甘特进度、资料库和成果证据统一关联。
- 英语单词遗忘曲线、CET-6、IELTS、有道词典查询和独立训练记录。
- 今日热点与每周论文使用可信来源、确定性筛选和可选 AI 摘要，不允许 AI 虚构来源事实。
- 饮水、运动和可关闭的周期记录均保存在本地，并明确非医疗边界。
- SQLite、macOS 钥匙串、加密备份、隐私中心和模块级 AI 权限。

## 数据与隐私

- API 密钥只保存到 macOS 钥匙串。
- 核心记录保存在本地 SQLite，可在设置中迁移位置。
- 附件默认引用原文件，用户可选择复制到受管资料库。
- AI 调用前显示用途与数据范围；AI 结果不会静默改写记录。
- 开源仓库不包含用户数据、密钥、考试资料、论文全文或版权媒体。

默认数据库位于：

```text
~/Library/Application Support/com.qiuyu.personalgrowthworkbench/workbench.sqlite3
```

应用支持在设置中迁移数据库位置；旧数据库不会被自动删除。删除应用不会自动删除用户数据库和外部引用文件。

## 系统要求

- macOS 11 或更高版本
- Xcode Command Line Tools，可运行 `xcode-select --install` 安装
- Git
- 约 20 MB 临时空间用于轻量原生构建

## 从源码构建

执行：

```bash
git clone https://github.com/yuqiu7554/personal-growth-workbench.git
cd personal-growth-workbench
./scripts/build-native-preview.sh
open "desktop-dist/个人成长工作台.app"
```

该脚本仅使用 macOS 系统框架和 Clang，生成本机临时签名的应用，不需要付费 Apple Developer 账号。若 Gatekeeper 对自行构建产物给出提示，请先核对源码和构建过程；项目不会建议用户绕过来源不明的应用。

开发者完整说明、数据库位置、自检和可选 Tauri 壳见 [DEVELOPMENT.md](DEVELOPMENT.md)。维护者将已验证版本同步到自己桌面时使用：

```bash
./skills/workbench-builder/scripts/deliver-desktop.sh
```

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `native-shell/` | 当前 AppKit/WebKit 原生壳、SQLite、钥匙串和系统能力 |
| `workbench-prototype/` | 打包进桌面应用的界面与领域规则，不是独立网页产品 |
| `scripts/` | 确定性功能检查、原生预检和构建脚本 |
| `src-tauri/` | 后续 Tauri 正式壳的受控迁移起点 |
| `docs/` | 发布、隐私、推荐任务和功能验收说明 |
| `skills/workbench-builder/` | 本项目的需求、实现、测试和桌面交付工作流 |

## 当前限制

- 目前只发布源码，不提供官方预编译安装包或自动更新。
- Tauri 正式壳尚未成为默认交付物；当前可运行版本使用轻量 AppKit/WebKit 壳。
- 联网服务、DeepSeek 和有道均由用户自行配置合法凭据，服务可用性与费用由对应提供商决定。
- 部分内容检索受来源许可、API 可用性和地区网络条件限制；失败时保留最近成功数据并显示状态。
- 未完成 App Sandbox 的 security-scoped bookmark 迁移，因此未来二进制分发前仍需专项处理。

## 参与贡献

提交问题前请搜索开放和已关闭 Issue，并提供应用版本、macOS、硬件、最短复现步骤、预期和实际结果。不要上传密钥、数据库、健康记录、复盘原文或版权附件。

重大功能建议应先通过 Issue 明确用户问题、数据生命周期、权限、失败处理和 MVP 边界，再开始实现。完整规则见 [CONTRIBUTING.md](CONTRIBUTING.md)；安全问题使用 [私密漏洞报告](https://github.com/yuqiu7554/personal-growth-workbench/security/advisories/new)。

## 许可证

本项目由邱昱以 [GNU GPL v3.0](LICENSE) 许可发布（SPDX：`GPL-3.0-only`）。源码发布门禁、隐私和知识产权事项见 [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md)。安全问题请使用仓库的私密漏洞报告，不要在公开 Issue 中提交敏感信息。
