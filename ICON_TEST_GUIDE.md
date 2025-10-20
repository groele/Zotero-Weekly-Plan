# 工具栏图标显示测试指南

## 🎯 测试目的
验证Zotero主页面工具栏图标是否正确显示。

## 📋 前置条件
- Zotero 6.0+ 或 Zotero 7.*
- 已完成插件构建（运行 `npm run build`）

## 🔧 测试方法

### 方法1: 开发模式测试（推荐）

#### 1. 启动开发服务器
```bash
npm start
```

#### 2. 观察输出
- 等待构建完成
- Zotero应该会自动重启并加载插件

#### 3. 检查工具栏
1. 打开Zotero主窗口
2. 查看主工具栏（通常在顶部）
3. 寻找周计划图标（紫色背景，三列看板，带"周"徽章）

### 方法2: 生产模式测试

#### 1. 构建插件
```bash
npm run build
```

#### 2. 手动安装
1. 打开 `.scaffold/build/` 目录
2. 找到生成的 `.xpi` 文件
3. 在Zotero中: `Tools` → `Add-ons` → 齿轮图标 → `Install Add-on From File`
4. 选择 `.xpi` 文件

#### 3. 重启Zotero
完全关闭并重新打开Zotero

## 🔍 调试步骤

### 步骤1: 打开开发者控制台

**Zotero 7**:
- `Tools` → `Developer` → `Run JavaScript`
- 或按 `Ctrl+Shift+J` (Windows/Linux) / `Cmd+Shift+J` (Mac)

**Zotero 6**:
- `Tools` → `Developer` → `Error Console`

### 步骤2: 检查CSS加载

在控制台执行:
```javascript
// 检查CSS样式表是否加载
const cssLink = document.querySelector('link[href*="zoteroPane.css"]');
console.log("CSS Link:", cssLink);
console.log("CSS href:", cssLink?.href);
```

**预期输出**:
```
CSS Link: <link rel="stylesheet" type="text/css" href="chrome://Zotero-Weekly-Plan/content/zoteroPane.css">
CSS href: chrome://Zotero-Weekly-Plan/content/zoteroPane.css
```

### 步骤3: 检查按钮元素

```javascript
// 查找工具栏按钮
const button = document.getElementById('zoteroplan-toolbarbutton');
console.log("Button:", button);
console.log("Button classes:", button?.className);
console.log("Image attribute:", button?.getAttribute('image'));
```

**预期输出**:
```
Button: <toolbarbutton id="zoteroplan-toolbarbutton" class="toolbarbutton-1 chromeclass-toolbar-additional" ...>
Button classes: toolbarbutton-1 chromeclass-toolbar-additional
Image attribute: chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg
```

### 步骤4: 检查图标样式

```javascript
// 检查计算后的样式
const button = document.getElementById('zoteroplan-toolbarbutton');
const styles = window.getComputedStyle(button);
console.log("list-style-image:", styles.getPropertyValue('list-style-image'));
```

**预期输出**:
```
list-style-image: url("chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg")
```

### 步骤5: 验证SVG资源

```javascript
// 测试SVG图标是否可访问
fetch('chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg')
  .then(r => r.text())
  .then(svg => console.log("SVG loaded, length:", svg.length))
  .catch(e => console.error("Failed to load SVG:", e));
```

**预期输出**:
```
SVG loaded, length: 2257
```

### 步骤6: 查看插件日志

在控制台查找以下日志（由插件输出）:
```
[Zotero Weekly Plan] CSS样式表路径: chrome://Zotero-Weekly-Plan/content/zoteroPane.css
[Zotero Weekly Plan] CSS样式表加载成功: chrome://Zotero-Weekly-Plan/content/zoteroPane.css
[Zotero Weekly Plan] 工具栏按钮已创建，图标路径: chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg
```

## ✅ 成功标准

### 视觉检查
- [ ] 工具栏上显示图标
- [ ] 图标清晰锐利（无模糊）
- [ ] 图标颜色正确（紫色背景，蓝色卡片）
- [ ] 悬停时透明度变化（80%）
- [ ] 点击时透明度变化（60%）
- [ ] 深色主题下图标正常显示

### 功能检查
- [ ] 点击图标打开周计划窗口
- [ ] 工具提示显示正确文本
- [ ] 按钮在窗口调整大小后仍可见

## 🐛 常见问题排查

### 问题1: 图标完全不显示

**可能原因**:
1. CSS文件未加载
2. 图标文件路径错误
3. XPI包中缺少图标文件

**解决方法**:
```javascript
// 检查所有link标签
document.querySelectorAll('link').forEach(link => {
  console.log(link.href);
});

// 手动添加CSS（临时）
const style = document.createElement('style');
style.textContent = `
  #zoteroplan-toolbarbutton {
    list-style-image: url("chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg") !important;
  }
`;
document.head.appendChild(style);
```

### 问题2: 图标显示为空白方框

**可能原因**:
1. SVG文件格式错误
2. 颜色主题问题
3. SVG未正确渲染

**解决方法**:
- 在浏览器中直接打开SVG: `chrome://Zotero-Weekly-Plan/content/icons/toolbar-icon.svg`
- 检查SVG语法是否正确
- 尝试切换Zotero主题（亮色/深色）

### 问题3: 开发模式下不显示，生产模式正常

**可能原因**:
- 缓存问题
- 热重载同步延迟

**解决方法**:
```bash
# 清理并重建
npm run build
# 完全重启Zotero
```

### 问题4: 某些Zotero版本不显示

**检查兼容性**:
```javascript
// 检查Zotero版本
console.log("Zotero version:", Zotero.version);

// 检查是否支持XUL元素
console.log("createXULElement:", typeof document.createXULElement);
```

## 📊 测试报告模板

```markdown
### 测试环境
- Zotero版本: [例如: 7.0.0]
- 操作系统: [例如: Windows 11]
- 插件版本: 1.0.0

### 测试结果
- [ ] 图标显示正常
- [ ] 亮色主题正常
- [ ] 深色主题正常
- [ ] 悬停效果正常
- [ ] 点击功能正常

### 问题记录
[如有问题，请详细描述]

### 控制台输出
```
[粘贴相关日志]
```

### 截图
[如可能，附上截图]
```

## 🔄 重新测试流程

如果测试失败，按以下顺序操作：

1. **完全关闭Zotero**
2. **清理构建缓存**:
   ```bash
   rm -rf .scaffold/build
   npm run build
   ```
3. **重新安装插件**
4. **启动Zotero并检查**
5. **查看开发者控制台日志**

## 📝 联系支持

如果图标仍然不显示，请提供：
1. Zotero版本号
2. 操作系统信息
3. 开发者控制台完整日志
4. 测试步骤的结果截图

---

**文档版本**: 1.0  
**最后更新**: 2025-10-20
