# Zotero Weekly Plan / 周计划看板

> A modern weekly planning board for Zotero 7 with draggable tasks, independent window, and beautiful responsive UI.
> 适配 Zotero 7 的现代化周计划看板，支持拖拽、独立窗口与响应式精美界面。

[![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![Zotero](https://img.shields.io/badge/Zotero-7%2B-red.svg)](https://www.zotero.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## 📚 Documentation / 文档导航

- 📖 **[中文用户手册](./docs/README-zhCN.md)** - Chinese User Guide
- 🇫🇷 **[Guide en Français](./docs/README-frFR.md)** - French User Guide
- 🏗️ **[项目架构说明](./ARCHITECTURE.md)** - Architecture Overview
- 📂 **[完整文档索引](./docs/README.md)** - Complete Documentation Index

---

## Features / 功能特性

- Drag and drop across columns and windows
  - Same-window reorder and cross-column move
  - Cross-window drag via serialized task payload
- Independent window with OS-level controls
  - Resizable, minimizable, maximizable
  - Works outside Zotero main window
- Beautiful and responsive UI
  - Light/Dark themes, adaptive spacing and font sizing
  - Smooth board layout with per-column scroll
- Handy productivity tools
  - Quick add, inline edit, search, stats and progress
  - Per-week data saved in Zotero prefs

- 任务拖拽支持（同列/跨列/跨窗口）
  - 同窗口排序与跨列移动
  - 通过序列化任务数据实现跨窗口拖拽
- 独立窗口（系统级控制）
  - 窗口可调整大小、最小化、最大化
  - 支持拖出 Zotero 主窗口
- 精美响应式 UI
  - 明暗主题、自适应间距与字号
  - 流畅看板布局与按列滚动
- 高效工具集
  - 快速添加、内联编辑、搜索、统计与进度
  - 每周数据保存于 Zotero 偏好

---

## Install / 安装

### From XPI / 通过 XPI 安装

1. Build the plugin or download the XPI
   - Local build: see Build section below
   - The XPI will be available at `.scaffold/build/zotero-weekly-plan.xpi`
2. Zotero → Tools → Add-ons → Gear → Install Add-on From File → select XPI
3. Restart Zotero

4. 构建或下载 XPI
   - 本地构建：见下文“构建”
   - XPI 默认生成路径：`.scaffold/build/zotero-weekly-plan.xpi`
5. Zotero → 工具 → 插件 → 齿轮 → 从文件安装 → 选择 XPI
6. 重启 Zotero

---

## Usage / 使用

- Open from menu: Tools → 周计划 / Weekly Plan
- Add tasks in each column; drag to reorder or move across columns
- Double-click task content to copy; Enter to save, Shift+Enter new line
- Use header controls to switch weeks and toggle stats
- Independent window can be dragged outside Zotero and maximized

- 通过菜单打开：工具 → 周计划 / Weekly Plan
- 在各列添加任务；拖拽可排序或跨列移动
- 双击内容复制；Enter 保存、Shift+Enter 换行
- 使用顶部控件切换周次与显示统计
- 独立窗口可拖出 Zotero 并可最大化

---

## Build / 构建

Prerequisites / 前置

- Node.js 18+ and npm
- Windows/macOS/Linux with Zotero 7

Commands / 命令

```bash
npm install
npm run build       # build to .scaffold/build and type-check
npm run release     # optional, pack for release (requires git metadata)
```

常见问题 / Notes

- If `npm install` fails due to permission, set project-local cache:
  ```bash
  npm config set cache .npm-cache --location=project
  npm install --no-audit --no-fund --legacy-peer-deps
  ```
- 构建输出在 `.scaffold/build`，包括 `update.json` 与 XPI。

---

## Drag & Drop Notes / 拖拽说明

- ContentEditable vs Drag
  - We prevent drag from the editable area and delegate drag to the task card
  - This avoids event conflicts and ensures reliable dragstart
- Cross-window
  - Task payload serialized to `application/x-zoteroplan-task`
  - On drop, payload is restored if source element is not available

- 可编辑内容与拖拽冲突
  - 编辑区域阻止拖拽与冒泡，拖拽绑定在任务卡上
  - 保证 dragstart 稳定触发
- 跨窗口拖拽
  - 任务通过自定义 MIME `application/x-zoteroplan-task` 序列化
  - drop 时若源元素不可用则反序列化重建

---

## Window & Layout / 窗口与布局

- Independent dialog with titlebar and OS-level minimize/maximize
- CSP allows `chrome:` resources; stylesheet loads from `chrome://.../weekPlan.css`
- Fullscreen adaptive layout: container is a vertical flex, board fills remaining space, per-column scrolls

- 独立对话框，带系统级最小化/最大化
- CSP 放宽以加载 `chrome:` 资源，样式从 `chrome://.../weekPlan.css` 引入
- 全屏适配：外层纵向 flex，看板充满剩余高度，列内滚动

---

## Troubleshooting / 故障排查

- Window shows blank
  - Ensure CSP in `addon/content/weekplan.html` includes `chrome:` for default-src and style-src
  - Remove `noopener` from `openDialog` feature string
- Cannot drag tasks
  - Ensure not dragging from the editable area; try dragging from task card edge
  - Check console logs for dragstart/drop diagnostics
- Cross-window drop fails
  - Verify both windows are WeekPlan windows of the plugin
  - Data transfer must include `application/x-zoteroplan-task`

- 窗口空白
  - 确认 `addon/content/weekplan.html` 的 CSP 允许 `chrome:` 源
  - 打开窗口参数中不要包含 `noopener`
- 无法拖拽
  - 确保非编辑区域开始拖拽；从卡片边缘按下再移动
  - 打开控制台查看拖拽日志
- 跨窗口放置失败
  - 确认两个窗口均为插件的周计划窗口
  - 数据传输需包含 `application/x-zoteroplan-task`

---

## License / 许可

AGPL-3.0-or-later

---

## 📂 Project Structure / 项目结构

```
Zotero-Weekly-Plan-1.0/
├── src/              # TypeScript 源代码
├── addon/            # 插件资源 (HTML/CSS/Locale)
├── docs/             # 📚 项目文档
├── typings/          # TypeScript 类型定义
├── test/             # 测试代码
└── ARCHITECTURE.md   # 架构详细说明
```

详细架构说明请查看 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🎨 Latest Updates / 最新更新

### v1.0.0 (2025-10-20)

- ✨ 全面响应式 UI 优化（320px - 2560px 完美适配）
- 📱 触摸设备友好优化（44px 最小点击区域）
- 🎯 6个响应式断点，流畅缩放
- 🌓 深色/浅色主题完美兼容
- 📊 优化滚动条和动画效果
- 📚 完善项目文档和架构说明

查看详细优化内容: [UI 优化报告](./docs/UI_OPTIMIZATION_COMPLETE.md)

---

## 🔗 Quick Links / 快速链接

| 链接                                          | 说明         |
| --------------------------------------------- | ------------ |
| [安装指南](#install--安装)                    | 如何安装插件 |
| [使用说明](#usage--使用)                      | 基本使用方法 |
| [构建指南](#build--构建)                      | 从源码构建   |
| [文档中心](./docs/README.md)                  | 完整文档索引 |
| [架构说明](./ARCHITECTURE.md)                 | 技术架构详解 |
| [UI 优化](./docs/UI_OPTIMIZATION_COMPLETE.md) | 界面优化详情 |
| [故障排查](#troubleshooting--故障排查)        | 常见问题解决 |

---

## Acknowledgements / 致谢

- Built on `zotero-plugin-scaffold` and `zotero-plugin-toolkit`
- 感谢社区用户的反馈与建议，帮助我们不断改进体验
- Special thanks to all contributors and testers

---

## 📄 License

AGPL-3.0-or-later - See [LICENSE](./LICENSE) for details
