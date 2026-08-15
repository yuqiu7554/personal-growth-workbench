# 个人成长工作台发布准备

负责人：邱昱
项目：个人成长工作台
目标：macOS 桌面公开 1.0

## 当前结论

`0.6.0` 已具备本地 SQLite、钥匙串、设置中心、隐私清单、加密备份、正式 Bundle ID 和旧版数据迁移，但还不是可直接公开分发的正式 1.0。公开源码与公开二进制是两道不同门禁。

## 发布前必须完成

- 已采用 `GPL-3.0-only` 并添加正式 `LICENSE`；公开前继续核对所有第三方资源兼容性。
- GitHub 仓库为 `yuqiu7554/personal-growth-workbench`；启用 Issues、Private Vulnerability Reporting 和 `main` 分支保护。
- 确认名称、图标、README 截图和演示数据均为原创或具有明确授权。
- 全仓扫描密钥、个人绝对路径、SQLite、日志、备份、真题、音频和论文全文。
- 对所有数据库迁移、30天回收站、导出、加密备份与恢复执行往返测试。
- 用 Apple Developer Program 的 Developer ID Application 证书启用 Hardened Runtime 并最小化 entitlements。
- 对最终 `.app`/DMG 执行签名、公证、staple、Gatekeeper 和隔离属性测试。
- 生成并审核 Xcode Privacy Report；核对 `PrivacyInfo.xcprivacy` 与实际 API 使用。
- 在一台未信任开发证书的 Mac 或干净账户完成安装、首次启动、权限拒绝与离线验收。
- 建立版本号、变更日志、发布哈希、回滚包和安全响应记录。

## 许可证

作者已选择 GNU GPL v3.0，仅采用 `GPL-3.0-only`。分发修改版时须按许可证提供对应源码；项目名称、图标和第三方内容不因代码许可证自动获得商标或内容授权。

## 知识产权

- 邱昱创作的代码、文档与原创图标自创作完成时自动产生著作权；保留版本记录和原始设计文件作为证据。
- 开源许可证只授权代码使用，不自动授权“个人成长工作台”名称、标识或第三方内容。
- 发布前检索名称冲突；如长期运营，可咨询专业人士评估商标注册。
- 不捆绑 CET-6/IELTS 真题、商业词典数据、论文 PDF、新闻正文或用户上传资料。
- AI 生成的代码和素材应保留来源/审查记录，并人工确认没有复制性表达或第三方标识。
- 专利只在确有新颖技术方案且准备承担检索、申请和维护成本时评估；普通界面和业务规则通常不应先假定可获专利。

## 签名与分发顺序

1. 冻结版本和数据迁移。
2. Release 构建，启用 Hardened Runtime。
3. 从内到外使用 Developer ID 签名，不使用 `--deep` 作为正式签名方案。
4. 创建仅含应用和 Applications 链接的 DMG。
5. `notarytool` 提交并处理全部警告。
6. staple 应用/DMG，运行 `codesign`、`spctl` 和 quarantine 测试。
7. 发布校验和、变更日志、隐私协议和已知问题。

## 当前明确未决项

- GitHub 仓库尚需完成首次推送、Private Vulnerability Reporting 与分支保护验收；不公开安全邮箱。
- 本机没有 Apple Developer Team、Developer ID Application 证书和公证凭据，正式二进制发布因此阻塞。
- 当前默认图标为项目原创临时正式图标；后续可在不改变数据的情况下替换品牌定稿。
- App Sandbox：当前外部文件路径尚未全面升级为 security-scoped bookmarks，因此候选 entitlements 暂不用于当前构建。
- 自动备份密码不持久化；跨重启自动加密备份需要单独设计安全解锁方式，不能退化为明文备份。
