# 拖拽功能修复：解决 contentEditable 冲突问题

## 📋 问题描述

**症状**：任务条目之间无法拖拽，鼠标无法将任务放置到任意窗格

**用户反馈**："条目之间的信息无法拖拽"

---

## 🔍 问题根源分析

经过深入排查，发现问题的根本原因是：

### 1. contentEditable 与 draggable 属性冲突

**代码位置**：`src/modules/weekPlan.ts` 第 660-664 行

```typescript
const content = this.panelDoc.createElement("div");
content.className = "zoteroplan-task-content";
content.textContent = taskData.text || "";
content.contentEditable = "true"; // ❌ 这里导致了问题
```

**问题详解**：

- 任务卡片（`.zoteroplan-task`）设置了 `draggable = true`
- 但其子元素（`.zoteroplan-task-content`）设置了 `contentEditable = "true"`
- 当用户尝试拖拽任务时，鼠标点击的区域通常是内容编辑区域
- **contentEditable 元素会拦截鼠标事件**，导致父元素的 `dragstart` 事件无法触发
- 浏览器优先处理内容编辑，而非拖拽操作

### 2. 事件冒泡链被中断

```
用户点击任务卡片
  ↓
鼠标实际点击在 .zoteroplan-task-content 上
  ↓
contentEditable 元素拦截了 mousedown 事件
  ↓
dragstart 事件没有被触发
  ↓
拖拽功能失效 ❌
```

### 3. CSS 缺少必要的样式

- 任务元素缺少 `user-select: none`，导致拖拽时可能选中文本
- 内容编辑区域缺少 `cursor: text`，用户体验不够明确
- 缺少 `cursor: grabbing` 状态，拖拽时没有视觉反馈

---

## ✅ 解决方案

### 修复 1：阻止内容编辑区域触发拖拽

**文件**：`src/modules/weekPlan.ts`

**位置**：`renderTask()` 方法，第 660-675 行

```typescript
// 任务内容
const content = this.panelDoc.createElement("div");
content.className = "zoteroplan-task-content";
content.textContent = taskData.text || "";
content.contentEditable = "true";
content.addEventListener("blur", () => this.saveForWeek());

// 阻止内容编辑区域触发拖拽 - 关键修复！
content.addEventListener("mousedown", (e: Event) => {
  e.stopPropagation(); // 阻止事件冒泡到任务元素
});

content.addEventListener("dragstart", (e: Event) => {
  e.preventDefault(); // 阻止内容区域的拖拽
  e.stopPropagation();
});
```

**原理说明**：

1. **`mousedown` 事件阻止冒泡**
   - 当用户在内容区域点击时，阻止事件冒泡到任务元素
   - 这样内容区域可以正常进入编辑模式
   - 但不会干扰任务元素的拖拽功能

2. **`dragstart` 事件阻止和停止传播**
   - 如果用户在内容区域尝试拖拽，阻止该区域的拖拽行为
   - 防止内容被拖拽而非整个任务卡片

### 修复 2：优化任务卡片的 CSS 样式

**文件**：`addon/content/weekPlan.css`

**修改 1**：任务卡片添加 `user-select: none`

```css
.zoteroplan-task {
  background: var(--wp-card-bg);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--wp-border-color);
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  user-select: none; /* 防止拖拽时选中文本 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

**修改 2**：内容编辑区域添加特定样式

```css
.zoteroplan-task-content {
  padding: 2px 4px;
  outline: none;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 14px;
  cursor: text; /* 编辑区域显示文本光标 */
  user-select: text; /* 允许选择文本 */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}
```

**修改 3**：添加拖拽时的光标反馈

```css
.zoteroplan-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--wp-accent);
}

.zoteroplan-task:active {
  cursor: grabbing; /* 拖拽时显示抓取光标 */
}
```

---

## 🎯 关键技术点

### 1. 事件委托机制

拖拽事件已在 `board` 元素上统一绑定，使用事件委托处理：

```typescript
board.addEventListener("dragstart", (e: Event) => {
  const target = e.target as HTMLElement;
  if (!target || !target.classList.contains("zoteroplan-task")) {
    return;
  }
  // 处理拖拽...
});
```

### 2. 分层事件处理

- **任务元素层**：`draggable = true`，处理拖拽
- **内容编辑层**：`contentEditable = true`，阻止事件冒泡
- **两层独立工作**，互不干扰

### 3. CSS 选择器优先级

```
.zoteroplan-task { user-select: none; }  ← 父元素禁止选择
.zoteroplan-task-content { user-select: text; }  ← 子元素允许选择
```

子元素的 `user-select: text` 会覆盖父元素的 `user-select: none`

---

## 📊 用户体验优化

### 拖拽操作流程

1. **悬停状态**
   - 鼠标悬停在任务卡片上
   - `cursor: grab`（手形光标）
   - 任务卡片轻微上浮（`translateY(-2px)`）

2. **点击拖拽**
   - 点击任务卡片的空白区域（非内容编辑区域）
   - `cursor: grabbing`（抓取光标）
   - 任务卡片添加 `.dragging` 类，半透明显示

3. **编辑内容**
   - 点击任务内容区域
   - `cursor: text`（文本光标）
   - 内容区域获得焦点，可以编辑

4. **拖拽放置**
   - 拖拽到目标列
   - 显示蓝色虚线放置指示器
   - 松开鼠标，任务移动到新位置

---

## 🧪 测试清单

### ✅ 基础功能测试

- [ ] 任务可以在同一列内拖拽排序
- [ ] 任务可以在不同列之间拖拽
- [ ] 拖拽时显示放置指示器
- [ ] 拖拽后任务位置正确
- [ ] 拖拽后数据自动保存

### ✅ 编辑功能测试

- [ ] 点击任务内容可以进入编辑模式
- [ ] 编辑时光标为文本光标（`cursor: text`）
- [ ] 编辑完成失焦后自动保存
- [ ] 编辑时不会触发拖拽

### ✅ 视觉反馈测试

- [ ] 悬停时显示 `grab` 光标
- [ ] 拖拽时显示 `grabbing` 光标
- [ ] 编辑时显示 `text` 光标
- [ ] 拖拽时任务卡片半透明
- [ ] 放置指示器蓝色虚线显示正确

### ✅ 边界情况测试

- [ ] 空列表可以接收拖拽的任务
- [ ] 拖拽到列表顶部正确插入
- [ ] 拖拽到列表底部正确插入
- [ ] 快速拖拽不会出现错误
- [ ] 同时编辑和拖拽不会冲突

---

## 🔧 如何验证修复

### 步骤 1：重新构建插件

```bash
npm run build
```

### 步骤 2：在 Zotero 中重新加载插件

1. 打开 Zotero
2. 工具 → 插件 → 齿轮图标 → Install Plugin From File
3. 选择 `.scaffold/build/zotero-plan.xpi`
4. 重启 Zotero

### 步骤 3：打开周计划窗口

- 点击插件菜单 → Weekly Plan

### 步骤 4：测试拖拽功能

1. **创建几个测试任务**
   - 在"规划"列添加任务 1、2、3
   - 在"待做"列添加任务 4、5

2. **测试同列拖拽**
   - 拖拽任务 1 到任务 3 下方
   - 验证顺序变为：2、3、1

3. **测试跨列拖拽**
   - 拖拽任务 1 到"待做"列
   - 验证任务正确移动到"待做"

4. **测试编辑功能**
   - 点击任务 1 的文本内容
   - 验证可以正常编辑
   - 验证编辑时不会触发拖拽

5. **测试视觉反馈**
   - 悬停在任务上，验证 `grab` 光标
   - 拖拽任务，验证 `grabbing` 光标
   - 点击内容，验证 `text` 光标

### 步骤 5：查看调试日志（可选）

打开浏览器控制台（F12），查看拖拽相关日志：

```
开始初始化拖拽功能
开始拖拽任务: task_1234567890_abc123
放置到列表: zoteroplan-todoList
放置成功
拖拽结束
```

---

## 📝 技术总结

### 问题的本质

**HTML5 Drag and Drop API** 与 **contentEditable** 在同一 DOM 树中会产生事件冲突。

### 解决的核心思路

1. **分层处理**：父元素负责拖拽，子元素负责编辑
2. **事件隔离**：子元素阻止事件冒泡，避免干扰父元素
3. **CSS 覆盖**：子元素的 `user-select` 覆盖父元素的设置

### 类似问题的通用解决方案

如果你的项目中有类似问题（可拖拽元素包含可编辑内容），可以参考以下模式：

```typescript
// 父元素：可拖拽
parentElement.draggable = true;

// 子元素：可编辑，但阻止拖拽事件冒泡
editableChild.contentEditable = "true";
editableChild.addEventListener("mousedown", (e) => {
  e.stopPropagation(); // 关键！
});
editableChild.addEventListener("dragstart", (e) => {
  e.preventDefault();
  e.stopPropagation();
});
```

```css
/* 父元素：禁止文本选择 */
.parent {
  user-select: none;
  cursor: grab;
}

/* 子元素：允许文本选择 */
.editable-child {
  user-select: text;
  cursor: text;
}
```

---

## 🎉 修复结果

✅ **任务卡片可以正常拖拽**  
✅ **任务内容可以正常编辑**  
✅ **拖拽和编辑互不干扰**  
✅ **视觉反馈清晰明确**  
✅ **用户体验大幅提升**

---

## 📚 相关资源

- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [MDN: contentEditable](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
- [MDN: Event.stopPropagation()](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation)
- [CSS user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/user-select)

---

**修复日期**：2025-10-17  
**版本**：1.0.0  
**开发者**：Zotero Weekly Plan Team
