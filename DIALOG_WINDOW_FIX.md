# 周计划窗口实现修复说明

## ❌ 问题描述

**错误信息**:

```
创建标签页失败：PDF f755fa0f1a512569d73dce6ea422f2ff
[1.6 Acrobat Distiller 24.0 (Windows); modified using iText 4.2.0 by 1T3XT / LaTeX with hyperref package]
(PDF.js: 4.10.0 [67a1769])
```

**根本原因**:

- Zotero 7 的标签页 API **不支持** `type: "custom"` 参数
- 尝试使用 `Zotero_Tabs.add()` 创建自定义标签页失败
- ztoolkit 的 Reader Tab API 也不适用于通用面板

---

## ✅ 解决方案

改用 **独立对话框窗口** 方式打开周计划，这是 Zotero 插件的标准做法。

### 实现方式

使用 `window.openDialog()` API 创建一个独立的浏览器窗口：

```typescript
const dialogWindow = win.openDialog(
  `chrome://${addon.data.config.addonRef}/content/weekplan.html`,
  `${addon.data.config.addonRef}-weekplan-window`,
  `chrome,centerscreen,resizable,width=1200,height=800`,
  dialogData,
) as Window | null;
```

### 关键特性

1. **独立窗口** - 不依赖 Zotero 主窗口的标签页系统
2. **可调整大小** - `resizable` 参数
3. **居中显示** - `centerscreen` 参数
4. **合适的尺寸** - 1200×800 像素
5. **防重复打开** - 检查现有窗口实例

---

## 🔄 实现对比

### ❌ 之前的实现（失败）

```typescript
// 尝试使用标签页 API - 不支持
const tab = Tabs.add({
  id: "zoteroplan-main-tab",
  type: "custom", // ❌ Zotero 不支持此类型
  title: "周计划看板",
  select: true,
});
```

**问题**:

- `type: "custom"` 不被 Zotero 识别
- Zotero 尝试将其作为 PDF 打开
- 导致奇怪的 PDF 错误信息

### ✅ 现在的实现（成功）

```typescript
// 使用对话框窗口 API
const dialogWindow = win.openDialog(
  `chrome://zotero-plan/content/weekplan.html`,
  `zotero-plan-weekplan-window`,
  `chrome,centerscreen,resizable,width=1200,height=800`,
  dialogData,
) as Window | null;

if (!dialogWindow) {
  ztoolkit.log("无法创建对话框窗口");
  return;
}

// 监听窗口关闭
dialogWindow.addEventListener("unload", () => {
  weekPlanManager.stopClock();
  delete (addon.data as any).weekPlanDialog;
});

// 注入内容
dialogWindow.addEventListener("DOMContentLoaded", () => {
  const appContainer = dialogWindow.document.getElementById("app");
  const panel = weekPlanManager.createPlanPanel(dialogWindow);
  appContainer.appendChild(panel);
});
```

---

## 📋 代码变更

### 修改的文件

**`src/hooks.ts`** - [openWeekPlanInTab()](d:\Git Project\Zotero-Weekly-Plan\src\hooks.ts#L94-L163) 函数

**变更内容**:

- ❌ 删除 `Zotero_Tabs.add()` 调用
- ❌ 删除标签页检测逻辑
- ✅ 新增 `window.openDialog()` 调用
- ✅ 新增对话框窗口管理
- ✅ 新增内容注入逻辑

**代码行数**:

- 删除: ~90 行
- 新增: ~70 行
- 净减少: ~20 行（更简洁）

---

## 🎯 使用方式

### 1. 工具菜单

```
工具 → 周计划
```

### 2. 工具栏按钮

点击工具栏上的日历图标

### 效果

- 打开一个独立的窗口
- 窗口标题：`weekplan.html`
- 窗口大小：1200×800
- 可调整大小和位置
- 关闭窗口时自动清理资源

---

## 📊 对比分析

| 特性           | 标签页方式  | 对话框窗口方式 |
| -------------- | ----------- | -------------- |
| **兼容性**     | ❌ 不稳定   | ✅ 完全兼容    |
| **实现复杂度** | ⚠️ 复杂     | ✅ 简单        |
| **多任务支持** | ✅ 可并行   | ✅ 独立窗口    |
| **空间利用**   | ✅ 100%     | ✅ 可自定义    |
| **API 稳定性** | ❌ 未文档化 | ✅ 官方 API    |
| **错误处理**   | ❌ 困难     | ✅ 简单        |
| **资源清理**   | ⚠️ 手动     | ✅ 自动        |

---

## ✅ 优势

### 1. **稳定性**

- 使用 Zotero 官方支持的对话框 API
- 不依赖未文档化的标签页系统
- 不会出现奇怪的 PDF 错误

### 2. **简洁性**

- 代码更简单易懂
- 减少了约 20 行代码
- 更容易维护

### 3. **灵活性**

- 用户可以自由调整窗口大小
- 可以移动窗口到任意位置
- 可以最小化/最大化

### 4. **独立性**

- 不占用 Zotero 主窗口空间
- 可以独立于主窗口操作
- 关闭主窗口不影响周计划窗口

---

## 🔍 技术细节

### 窗口参数说明

```typescript
const features = `
  chrome,           // 使用 Chrome 窗口框架
  centerscreen,     // 居中显示
  resizable,        // 可调整大小
  width=1200,       // 初始宽度
  height=800        // 初始高度
`;
```

### 防重复打开机制

```typescript
if ((addon.data as any).weekPlanDialog) {
  (addon.data as any).weekPlanDialog.focus(); // 聚焦现有窗口
  return;
}
```

### 资源清理机制

```typescript
dialogWindow.addEventListener("unload", () => {
  weekPlanManager.stopClock(); // 停止时钟
  delete (addon.data as any).weekPlanDialog; // 删除引用
  ztoolkit.log("周计划窗口已关闭");
});
```

### 内容注入时机

```typescript
dialogWindow.addEventListener("DOMContentLoaded", () => {
  // 确保 DOM 已完全加载后再注入内容
  const panel = weekPlanManager.createPlanPanel(dialogWindow);
  appContainer.appendChild(panel);
});
```

---

## 🚀 后续优化建议

### 1. 窗口状态保存

```typescript
// 保存窗口位置和大小
Zotero.Prefs.set("weekplan.windowX", dialogWindow.screenX);
Zotero.Prefs.set("weekplan.windowY", dialogWindow.screenY);
Zotero.Prefs.set("weekplan.windowWidth", dialogWindow.outerWidth);
Zotero.Prefs.set("weekplan.windowHeight", dialogWindow.outerHeight);

// 下次打开时恢复
const x = Zotero.Prefs.get("weekplan.windowX");
const y = Zotero.Prefs.get("weekplan.windowY");
const features = `left=${x},top=${y},width=${width},height=${height}`;
```

### 2. 窗口图标

在 `weekplan.html` 中添加：

```html
<head>
  <link rel="icon" href="chrome://zotero-plan/content/icons/weekplan.svg" />
</head>
```

### 3. 窗口标题

设置有意义的窗口标题：

```typescript
dialogWindow.document.title = getString("week-plan-title");
```

---

## 📝 测试清单

- [x] 窗口可以正常打开
- [x] 内容正确显示
- [x] 防重复打开生效
- [x] 窗口可以调整大小
- [x] 关闭时资源正确清理
- [x] 不再出现 PDF 错误
- [x] 构建成功无错误

---

## 🎓 经验教训

### 1. **不要盲目使用未文档化的 API**

Zotero 的标签页 API 并非所有类型都支持，`custom` 类型不被官方支持。

### 2. **优先使用稳定的官方 API**

`window.openDialog()` 是 Mozilla/Firefox 的标准 API，有完整文档和长期支持。

### 3. **简单的方案往往更可靠**

对话框窗口比标签页实现更简单，也更稳定。

### 4. **错误信息可能具有误导性**

"PDF f755fa0f..." 错误实际上是因为 Zotero 不知道如何处理 `type: "custom"`。

---

## 📚 参考资料

- [Mozilla openDialog() 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/openDialog)
- [Zotero 插件开发指南](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Firefox Chrome 窗口特性](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Features_of_a_Window)

---

**修复完成时间**: 2025-10-17  
**修复版本**: 1.0.1  
**状态**: ✅ 已验证可用
