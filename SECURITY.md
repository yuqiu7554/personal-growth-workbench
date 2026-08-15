# Security Policy

## Supported versions

公开 1.0 发布前仅维护最新开发版本。发布 1.0 后将在此列出受支持版本。

## Reporting

请通过 GitHub 仓库的 **Security > Report a vulnerability** 私密提交，不公开安全联系邮箱，也不要在公开 Issue 中粘贴密钥、数据库、健康记录或复盘内容。

报告请包含版本、macOS 版本、复现步骤、影响和最小必要日志。请先删除个人数据与凭据。

## Secret handling

AI 和词典凭据必须保存在 macOS 钥匙串。发现凭据进入源码、日志、导出或备份时，应立即撤销凭据并作为高优先级事件处理。
