# 个人成长工作台

作者：邱昱

个人成长工作台是一款本地优先的 macOS 桌面应用，用于统一管理计划、科研、英语学习、资料、健康记录和复盘。核心记录保存在 SQLite，AI 与词典服务由用户自行配置凭据。

## 当前状态

当前为公开 1.0 前的 `0.6.0` 开发版本。可运行包采用 Objective-C、AppKit、WebKit 和系统 SQLite；`workbench-prototype` 是打包进 `.app` 的界面资源，不是独立网页产品。

项目仓库：<https://github.com/yuqiu7554/personal-growth-workbench>

## 数据原则

- API 密钥只保存到 macOS 钥匙串。
- 核心记录保存在本地 SQLite，可在设置中迁移位置。
- 附件默认引用原文件，用户可选择复制到受管资料库。
- AI 调用前显示用途与数据范围；AI 结果不会静默改写记录。
- 开源仓库不包含用户数据、密钥、考试资料、论文全文或版权媒体。

## 本地构建

阅读 [DEVELOPMENT.md](DEVELOPMENT.md)。当前轻量原生构建：

```bash
./scripts/build-native-preview.sh
```

桌面交付必须使用：

```bash
./skills/workbench-builder/scripts/deliver-desktop.sh
```

## 发布状态

本项目由邱昱以 [GNU GPL v3.0](LICENSE) 许可发布（SPDX：`GPL-3.0-only`）。发布前门禁、签名公证、隐私和知识产权待办见 [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md)。
