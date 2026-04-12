# 厦门理工高校邦考试 AI 助手 (DeepSeek)

[![ScriptCat](https://img.shields.io/badge/ScriptCat-安装脚本-blue?logo=javascript)](https://scriptcat.org/zh-CN/script-show-page/你的脚本ID)
[![GitHub release](https://img.shields.io/github/v/release/Wu557666/gaoxiaobangai)](https://github.com/Wu557666/gaoxiaobangai/releases)

调用 DeepSeek API（支持自定义地址）自动回答高校邦平台 **考试/测验** 题目，支持单选和多选。

> ⚠️ **免责声明**：本脚本仅供学习辅助，请勿用于作弊。使用产生的任何后果（包括但不限于成绩作废、账号封禁）由使用者自行承担。

---

## ✨ 功能亮点

- **精准匹配**：仅在 `/exam/` 和 `/quiz/` 页面生效，不影响其他课程内容。
- **一键答题**：右下角浮动按钮，点击即自动提取题目与选项，调用 AI 返回答案并勾选。
- **灵活配置**：支持自定义 **API 地址**、**模型名称**，可搭配官方 API、第三方代理或自建转发。
- **菜单管理**：通过脚本管理器菜单轻松设置/查看/重置所有配置。
- **多选支持**：可识别 AI 返回的 `AB`、`BCD` 等多字母答案。

---

## 📦 安装

1. 安装脚本管理器 [ScriptCat](https://scriptcat.org/) 或 [Tampermonkey](https://www.tampermonkey.net/)。
2. [点击此处安装脚本]() （链接替换为实际发布地址）或复制本仓库 `exam-ai.user.js` 代码手动创建。

---

## 🔧 配置指南

点击浏览器右上角扩展图标 → 找到 **厦门理工高校邦考试AI助手**，可见以下菜单：

| 菜单项 | 说明 |
|--------|------|
| 🔑 设置 DeepSeek API Key | 输入从 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取的密钥 |
| 🌐 设置 API 地址 | 自定义完整 API URL（默认为官方 `https://api.deepseek.com/chat/completions`） |
| 🤖 设置模型名称 | 可切换 `deepseek-chat`（默认）、`deepseek-reasoner` 等 |
| 📋 查看当前配置 | 显示当前 Key（部分隐藏）、地址、模型 |
| 🔄 重置所有配置 | 一键清除所有设置，恢复出厂默认 |

### 使用自定义 API 地址
- 若使用**第三方代理**或**自建转发**，请在“设置 API 地址”中输入完整 URL（如 `https://your-proxy.com/v1/chat/completions`）。
- **重要**：非官方域名需要在脚本头部的 `@connect` 中添加对应域名，否则请求会被浏览器阻止。例如：
  ```javascript
  // @connect      api.deepseek.com
  // @connect      your-proxy.com