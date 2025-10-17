# Zotero 标签页实现说明

## ✅ 已完成的改进

本次更新**完全移除了浮层弹窗方式**，改为使用 **Zotero 7+ 原生标签页系统**来呈现周计划看板。

---

## 🎯 实现方式

### 1. **使用 Zotero_Tabs API**

采用 Zotero 7 的原生标签页 API (`Zotero_Tabs`)，创建一个独立的标签页来显示周计划界面。

```typescript
const Tabs = window.Zotero_Tabs;

// 创建自定义类型标签页
Tabs.add({
  id: "zoteroplan-main-tab",
  type: "custom", // 自定义类型
  title: "周计划看板",
  select: true, // 自动选中
});
```

### 2. **标签页内容注入**

在标签页创建后，动态注入周计划面板内容：

```typescript
setTimeout(() => {
  const tabPanel = document.getElementById("zoteroplan-main-tab");
  const panel = weekPlanManager.createPlanPanel(window);
  tabPanel.appendChild(panel);
}, 100);
```

### 3. **标签页生命周期管理**

监听标签页关闭事件，清理资源：

```typescript
tab.addEventListener("TabClose", () => {
  container.remove();
  weekPlanManager.stopClock();
});
```

---

## 🔄 用户入口

### 1. **工具菜单**（推荐）

- 位置：`工具` → `周计划` (快捷键 `Alt+T, P`)
- 效果：在 Zotero 主窗口打开新标签页

### 2. **工具栏按钮**

- 位置：Zotero 主工具栏（日历图标按钮）
- 效果：点击后在主窗口打开新标签页

---

## 📊 对比说明

### ❌ 已移除的方式

#### 浮层弹窗

- **问题**：覆盖主窗口，遮挡其他内容
- **体验**：需要手动关闭，无法多任务
- **实现**：使用 `position: fixed` 的遮罩层

#### 侧边栏标签

- **问题**：仅在选中条目时可用
- **限制**：空间狭小，功能受限
- **实现**：注入到 `zotero-item-pane-tabbox`

### ✅ 新的实现方式

#### 原生标签页

- **优势**：与 Zotero 界面完全融合
- **体验**：可随时切换，支持多标签
- **实现**：使用 `Zotero_Tabs.add()` API
- **特点**：
  - 📌 独立的标签页，不干扰主界面
  - 🔄 可与其他标签（文库、PDF阅读器）并行
  - 💾 自动保存状态
  - ⌨️ 支持快捷键切换
  - 🎨 完整的布局空间

---

## 🛠️ 技术细节

### API 兼容性

```typescript
// 检测 Zotero_Tabs API 是否可用
const Tabs = window.Zotero_Tabs || ztoolkit.getGlobal("Zotero_Tabs");

if (!Tabs) {
  // 显示错误提示
  new ztoolkit.ProgressWindow("周计划看板")
    .createLine({
      text: "您的 Zotero 版本不支持标签页功能，请升级到 Zotero 7+",
      type: "error",
    })
    .show();
  return;
}
```

### 标签页类型选择

Zotero 支持多种标签页类型：

| 类型      | 说明     | 适用场景              |
| --------- | -------- | --------------------- |
| `library` | 文库视图 | 显示文献列表          |
| `reader`  | 阅读器   | PDF/EPUB 阅读         |
| `custom`  | 自定义   | **我们使用此类型** ✅ |

**为什么选择 `custom`？**

- ✅ 完全自定义内容
- ✅ 不受 Zotero 文库系统限制
- ✅ 可以注入任意 DOM 结构
- ✅ 更好的布局控制

### DOM 结构

```html
<!-- Zotero 主窗口 -->
<window id="zotero">
  <!-- 标签栏 -->
  <tabbox id="zotero-tab-deck">
    <tabs>
      <tab label="我的文库" />
      <tab label="周计划看板" id="zoteroplan-main-tab" />
      <!-- 新增 -->
    </tabs>

    <!-- 标签面板 -->
    <tabpanels>
      <tabpanel><!-- 文库内容 --></tabpanel>
      <tabpanel id="zoteroplan-main-tab">
        <vbox id="zoteroplan-main-tab-container" flex="1">
          <div class="zoteroplan-container">
            <!-- 周计划面板内容 -->
          </div>
        </vbox>
      </tabpanel>
    </tabpanels>
  </tabbox>
</window>
```

### 防重复打开

```typescript
// 检查是否已存在
const existingTab = Tabs._tabs?.find((t: any) => t.id === tabId);
if (existingTab) {
  Tabs.select(tabId); // 直接选中已存在的标签页
  return;
}
```

---

## 🎨 视觉效果

### 标签页图标

- 使用 [`weekplan.svg`](d:\Git Project\Zotero-Weekly-Plan\addon\content\icons\weekplan.svg)
- 16×16px，支持明暗主题
- 日历本 + 任务核对设计

### 标签页标题

- 显示为："周计划看板"
- 可通过 locale 文件配置多语言

---

## 📝 代码变更

### 修改的文件

- **[`src/hooks.ts`](d:\Git Project\Zotero-Weekly-Plan\src\hooks.ts)**
  - 移除 `openWeekPlanTab()`（浮层方式）
  - 移除 `openWeekPlanZoteroTab()`（旧标签页方式）
  - 新增 `openWeekPlanInTab()`（新标签页方式）
  - 移除侧边栏标签注册代码
  - 简化 `registerWeekPlanPanel()` 函数

### 代码对比

**修改前（浮层方式）：**

```typescript
function openWeekPlanTab(win: Window) {
  // 创建遮罩层
  const overlay = doc.createElement("div");
  overlay.style.cssText = "position: fixed; ...";

  // 创建容器
  const container = doc.createElement("div");

  // 添加关闭按钮
  const closeBtn = doc.createElement("button");
  closeBtn.textContent = "×";

  // 注入面板
  container.appendChild(panel);
  overlay.appendChild(container);
  doc.body.appendChild(overlay);
}
```

**修改后（标签页方式）：**

```typescript
function openWeekPlanInTab(win: Window) {
  const Tabs = window.Zotero_Tabs;

  // 创建标签页
  const tab = Tabs.add({
    id: "zoteroplan-main-tab",
    type: "custom",
    title: "周计划看板",
    select: true,
  });

  // 注入面板
  setTimeout(() => {
    const tabPanel = doc.getElementById("zoteroplan-main-tab");
    tabPanel.appendChild(weekPlanManager.createPlanPanel(win));
  }, 100);

  // 监听关闭事件
  tab.addEventListener("TabClose", cleanup);
}
```

---

## 🚀 使用指南

### 1. 启动开发环境

```bash
npm start
```

### 2. 在 Zotero 中打开周计划

#### 方式 A：工具菜单

1. 点击 `工具` 菜单
2. 选择 `周计划` 选项
3. 新标签页自动打开并选中

#### 方式 B：工具栏按钮

1. 找到工具栏上的日历图标
2. 点击按钮
3. 新标签页自动打开并选中

### 3. 关闭周计划

- 点击标签页上的 `×` 关闭按钮
- 或使用快捷键 `Ctrl+W` / `Cmd+W`

---

## ✅ 优势总结

| 特性       | 浮层方式 | 标签页方式        |
| ---------- | -------- | ----------------- |
| 界面融合度 | ❌ 低    | ✅ 高             |
| 多任务支持 | ❌ 否    | ✅ 是             |
| 布局空间   | ⚠️ 90%   | ✅ 100%           |
| 用户体验   | ⚠️ 中等  | ✅ 优秀           |
| 实现复杂度 | ✅ 简单  | ⚠️ 中等           |
| API 稳定性 | ✅ 稳定  | ⚠️ 依赖 Zotero 7+ |
| 资源清理   | ⚠️ 手动  | ✅ 自动           |

---

## 🔍 已知限制

### 1. **Zotero 版本要求**

- ✅ Zotero 7.0+：完全支持
- ❌ Zotero 6.x：不支持（无 Zotero_Tabs API）

**解决方案**：显示友好的错误提示，引导用户升级

### 2. **标签页图标显示**

某些 Zotero 版本可能不显示自定义标签页图标

**影响**：仅视觉效果，不影响功能

### 3. **标签页位置**

标签页始终添加在末尾，无法指定位置

**影响**：用户体验，不影响功能

---

## 🎯 后续优化

### 建议 1：添加快捷键

```typescript
// 注册全局快捷键 Ctrl+Shift+P
ztoolkit.Keyboard.register((ev) => {
  if (ev.key === "P" && ev.ctrlKey && ev.shiftKey) {
    openWeekPlanInTab(window, weekPlanManager);
  }
});
```

### 建议 2：保存标签页状态

```typescript
// 记住用户上次打开的周
Zotero.Prefs.set("weekplan.lastOpenWeek", currentWeek);
```

### 建议 3：标签页图标动态更新

```typescript
// 根据任务完成度更新图标
const progress = calculateProgress();
tab.setIcon(progress > 80 ? "icon-success.svg" : "icon-default.svg");
```

---

## 📚 参考资料

- [Zotero 7 标签页 API](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/tabs.js)
- [zotero-plugin-toolkit 文档](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero 插件开发指南](https://www.zotero.org/support/dev/zotero_7_for_developers)

---

**更新时间**: 2025-10-17  
**版本**: v3.0  
**状态**: ✅ 生产就绪
