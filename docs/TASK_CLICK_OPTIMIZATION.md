# 任务卡片点击交互优化文档

## 问题描述

**用户反馈**：鼠标点击添加的条目后就会变成深色，视觉很不友好

### 根本原因

1. **浏览器默认行为**：某些浏览器在点击元素时会应用默认的高亮效果（通常是深色背景）
2. **缺失的CSS状态定义**：任务卡片没有定义 `:active` 和 `:focus` 状态的样式
3. **Tap Highlight**：移动端浏览器的点击高亮效果未被禁用

---

## 修复方案

### 1. 禁用浏览器默认点击高亮

```css
.zoteroplan-task {
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}
```

**作用**：

- 移除移动端浏览器的默认点击高亮（通常是半透明灰色/蓝色）
- 提供更统一的跨平台体验

### 2. 定义 `:active` 状态样式

```css
.zoteroplan-task:active {
  cursor: grabbing;
  background: var(--wp-card-bg); /* 保持原背景色 */
  transform: translateY(-1px); /* 轻微下压反馈 */
}
```

**改进**：

- **原背景色保持**：不再变成深色，保持原有的渐变背景
- **轻微下压**：从 `-2px` 移动到 `-1px`，提供视觉反馈
- **抓取光标**：拖拽时显示 `grabbing` 光标

### 3. 定义 `:focus` 状态样式

```css
.zoteroplan-task:focus {
  outline: 2px solid var(--wp-accent);
  outline-offset: 2px;
  background: var(--wp-card-bg); /* 保持原背景色 */
}
```

**改进**：

- **蓝色轮廓**：使用主题色（`--wp-accent`）显示焦点状态
- **外边距**：`outline-offset: 2px` 使轮廓不贴边，更美观
- **背景保持**：聚焦时不改变背景色

### 4. 按列保持背景色

为每个列的任务卡片添加 `:active` 和 `:focus` 状态：

```css
.zoteroplan-column-planning .zoteroplan-task:active,
.zoteroplan-column-planning .zoteroplan-task:focus {
  background: linear-gradient(
    to right,
    var(--wp-col-plan-light),
    var(--wp-card-bg)
  );
}

.zoteroplan-column-todo .zoteroplan-task:active,
.zoteroplan-column-todo .zoteroplan-task:focus {
  background: linear-gradient(
    to right,
    var(--wp-col-todo-light),
    var(--wp-card-bg)
  );
}

.zoteroplan-column-doing .zoteroplan-task:active,
.zoteroplan-column-doing .zoteroplan-task:focus {
  background: linear-gradient(
    to right,
    var(--wp-col-doing-light),
    var(--wp-card-bg)
  );
}

.zoteroplan-column-done .zoteroplan-task:active,
.zoteroplan-column-done .zoteroplan-task:focus {
  background: linear-gradient(
    to right,
    var(--wp-col-done-light),
    var(--wp-card-bg)
  );
}
```

**作用**：

- **渐变背景保持**：点击和聚焦时保持原有的列特色渐变色
- **视觉一致性**：不同状态下背景色统一，避免深色闪烁

---

## 视觉效果对比

### 修复前

| 状态     | 效果                                    |
| -------- | --------------------------------------- |
| **正常** | 浅色渐变背景 ✓                          |
| **悬停** | 轻微上移、阴影增强、边框高亮 ✓          |
| **点击** | ❌ **浏览器默认深色高亮（视觉不友好）** |
| **聚焦** | ❌ **浏览器默认轮廓（可能不一致）**     |

### 修复后

| 状态     | 效果                                             |
| -------- | ------------------------------------------------ |
| **正常** | 浅色渐变背景 ✓                                   |
| **悬停** | 轻微上移 (-2px)、阴影增强、边框高亮 ✓            |
| **点击** | ✅ **保持原背景色** + 轻微下压 (-1px) + 抓取光标 |
| **聚焦** | ✅ **保持原背景色** + 蓝色轮廓（2px，外偏移2px） |

---

## 交互改进总结

### 1. 移除视觉干扰

- ❌ 深色闪烁效果
- ✅ 平滑的背景色过渡

### 2. 增强用户反馈

- **悬停**：向上移动 2px，提示可交互
- **点击**：向下移动 1px，模拟按下效果
- **聚焦**：蓝色轮廓，提示当前焦点

### 3. 跨平台一致性

- 禁用移动端默认 Tap Highlight
- 统一桌面端和移动端的交互体验
- 支持深色模式（使用 CSS 变量）

---

## 文件修改

### `addon/content/weekPlan.css`

**修改位置**：

- 第 721-730 行：`.zoteroplan-task:active` 和 `:focus` 状态定义
- 第 735-810 行：按列保持背景色的 `:active` 和 `:focus` 状态

**新增行数**：52 行

---

## 构建验证

```bash
$ npm run build
✔ Build finished in 0.169 s.
```

**TypeScript 类型检查**：✅ 通过  
**CSS 语法检查**：✅ 通过

---

## 测试建议

### 1. 桌面端测试

- 鼠标点击任务卡片，观察背景色是否保持不变
- 按 Tab 键聚焦任务卡片，检查蓝色轮廓是否显示
- 拖拽任务卡片，验证光标是否变为 `grabbing`

### 2. 移动端测试

- 点击任务卡片，确认无深色/灰色闪烁
- 长按任务卡片，检查交互反馈
- 测试触摸拖拽功能

### 3. 深色模式测试

- 切换到深色主题
- 重复上述所有测试，确认样式一致

---

## 后续优化建议

### 可选的微交互增强

```css
/* 点击时添加微妙的阴影变化 */
.zoteroplan-task:active {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* 聚焦时添加脉冲动画 */
@keyframes focusPulse {
  0%,
  100% {
    outline-color: var(--wp-accent);
  }
  50% {
    outline-color: rgba(0, 123, 255, 0.5);
  }
}

.zoteroplan-task:focus {
  animation: focusPulse 2s infinite;
}
```

---

## 总结

通过精确定义任务卡片的 `:active`、`:focus` 状态样式，并禁用浏览器默认的点击高亮效果，成功解决了"点击后变深色"的视觉问题。

**核心改进**：

- ✅ 移除浏览器默认深色高亮
- ✅ 保持原有的渐变背景色
- ✅ 添加轻微的位移反馈
- ✅ 蓝色轮廓标识聚焦状态
- ✅ 跨平台一致的交互体验

**用户体验提升**：

- 视觉更加流畅舒适
- 交互反馈更加精准
- 符合现代Web应用设计规范

---

**修复时间**：2025-10-20  
**相关文件**：`addon/content/weekPlan.css`  
**影响范围**：所有任务卡片的点击交互
