<div align="center">

# Zotero Weekly Plan

**面向 Zotero 7 的周计划任务看板插件**  
*Weekly planning board for Zotero 7 with draggable tasks, independent windows, progress tracking, and literature-adjacent productivity workflows.*

![Type](https://img.shields.io/badge/type-Zotero%20Plugin-blue?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Zotero%207%2B-red?style=flat-square)
![Language](https://img.shields.io/badge/language-TypeScript-blueviolet?style=flat-square)
![Architecture](https://img.shields.io/badge/architecture-task%20board-purple?style=flat-square)
![License](https://img.shields.io/badge/license-AGPL--3.0-yellow?style=flat-square)

Part of **ResearchFlow Lab** — a local-first research productivity ecosystem for literature, manuscripts, data, and scientific visualization.

</div>

---

## 01. Overview

**Zotero Weekly Plan** is a Zotero 7 plugin that adds a modern weekly planning board to the literature-management environment. It supports draggable tasks, independent windows, responsive UI, quick task entry, search, progress statistics, and per-week persistence through Zotero preferences.

**Zotero Weekly Plan** 是一个面向 Zotero 7 的周计划看板插件。它将周任务、阅读计划、写作任务和文献管理环境结合起来，适合在 Zotero 内部安排论文阅读、笔记整理、投稿准备和项目推进。

---

## 02. Why this project exists

Literature management and weekly planning are often separated. Researchers read papers in Zotero, but planning happens in another app, spreadsheet, or paper notebook. Zotero Weekly Plan keeps reading-adjacent tasks close to the library, making it easier to plan literature review, manuscript writing, and project tasks inside the same research environment.

核心目标：

- Add a week-based task board inside Zotero.
- Support drag-and-drop planning across columns and windows.
- Provide quick add, edit, search, statistics, and progress tracking.
- Store task data in Zotero preferences for a lightweight local workflow.
- Connect weekly planning with literature reading and manuscript workflows.

---

## 03. Key features

| Module | What it does | 中文说明 |
|---|---|---|
| Weekly Board | Organizes tasks by week and board columns | 按周组织任务看板 |
| Drag and Drop | Supports same-column, cross-column, and cross-window task movement | 支持同列、跨列和跨窗口拖拽 |
| Independent Window | Opens a resizable, minimizable, maximizable window outside the main Zotero view | 支持独立窗口和系统级窗口控制 |
| Quick Add | Adds tasks rapidly into weekly columns | 快速新增周任务 |
| Inline Edit | Edits task content directly inside the board | 支持任务内容内联编辑 |
| Search and Stats | Searches tasks and displays progress statistics | 支持任务搜索和进度统计 |
| Theme Adaptation | Supports light and dark visual modes | 支持明暗主题 |
| Zotero Persistence | Saves weekly data through Zotero preferences | 将周计划数据保存于 Zotero 偏好设置 |

---

## 04. Product philosophy

Zotero Weekly Plan follows four design principles:

1. **Literature-adjacent planning** — reading, writing, and project tasks should stay close to the paper library.
2. **Week-based clarity** — weekly planning should be lightweight and time-bounded.
3. **Drag-first interaction** — task movement should feel visual and direct.
4. **Local persistence** — simple planning data should not require a separate server.

---

## 05. Architecture

```text
Zotero Weekly Plan
├── Zotero Plugin Layer
│   ├── menu entry
│   ├── independent window
│   └── plugin lifecycle
├── Board UI Layer
│   ├── weekly columns
│   ├── draggable task cards
│   ├── quick add / inline edit
│   └── progress statistics
├── Interaction Layer
│   ├── same-window drag
│   ├── cross-column move
│   └── cross-window drag payload
└── Data Layer
    ├── Zotero preferences
    ├── per-week task data
    └── UI state persistence
```

---

## 06. Quick start

Build or download the XPI package, then install it in Zotero:

1. Open Zotero.
2. Go to **Tools → Add-ons**.
3. Click the gear icon.
4. Choose **Install Add-on From File**.
5. Select the generated `.xpi` package.
6. Restart Zotero.

Development clone:

```bash
git clone https://github.com/groele/Zotero-Weekly-Plan.git
cd Zotero-Weekly-Plan
```

---

## 07. Recommended workflow

```text
Open Zotero → Open Weekly Plan
            → Add reading / writing / submission tasks
            → Drag tasks across weekly columns
            → Track progress and adjust priorities
            → Continue literature work in Zotero
```

Typical use cases:

- Plan papers to read this week.
- Track manuscript writing tasks.
- Manage revision-response subtasks.
- Keep research project actions close to Zotero literature libraries.

---

## 08. Documentation

Existing documentation may include:

- Chinese user guide
- French user guide
- Architecture overview
- Complete documentation index

Keep these documents aligned with the ResearchFlow Lab README structure when updating them.

---

## 09. Roadmap

- [ ] Add ResearchFlow project/task export
- [ ] Add recurring weekly task templates
- [ ] Add literature-item linked tasks
- [ ] Add better release packaging documentation
- [ ] Add screenshots and demo GIFs
- [ ] Add task backup/export format
- [ ] Add per-project planning mode

---

## 10. Privacy and data ownership

Zotero Weekly Plan stores planning data locally through Zotero preferences unless the user manually syncs Zotero data or exports task records. No external server is required for the core weekly planning workflow.

---

## 11. Related projects

- **ZoteroPreview** — Zotero preview compatibility and UI improvement fork
- **ResearchFlow Companion** — research workflow operating system
- **PaperPilot Pro** — academic search and publisher-page enhancement
- **ClipNote** — browser-native quick notes and Markdown capture

---

## 12. License

AGPL-3.0 License.

Developed by **Shikun Hou / groele**.
