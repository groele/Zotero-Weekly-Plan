# WeekPlan Zotero 插件 - 快速启动指南

## 🚀 快速开始

### 前置要求
1. **Zotero Beta版本** (7.0+)
   - 下载地址: https://www.zotero.org/support/beta_builds
   
2. **Node.js LTS版本** (18+)
   - 下载地址: https://nodejs.org/

3. **Git**
   - 下载地址: https://git-scm.com/

### 环境配置

1. **配置 .env 文件**
   ```bash
   # 复制示例配置
   cp .env.example .env
   ```

2. **编辑 .env**
   ```env
   # Windows 示例
   ZOTERO_PLUGIN_ZOTERO_BIN_PATH="C:\\Program Files\\Zotero\\zotero.exe"
   ZOTERO_PLUGIN_PROFILE_PATH="C:\\Users\\YourName\\Zotero\\Profiles\\xxxxxx.dev"
   
   # macOS 示例
   # ZOTERO_PLUGIN_ZOTERO_BIN_PATH="/Applications/Zotero.app/Contents/MacOS/zotero"
   # ZOTERO_PLUGIN_PROFILE_PATH="~/Zotero/Profiles/xxxxxx.dev"
   
   # Linux 示例
   # ZOTERO_PLUGIN_ZOTERO_BIN_PATH="/usr/bin/zotero"
   # ZOTERO_PLUGIN_PROFILE_PATH="~/.zotero/zotero/Profiles/xxxxxx.dev"
   ```

### 安装依赖

```bash
# 安装 npm 包
npm install

# 如果遇到权限问题 (Windows)
npm install --force
```

### 开发模式

```bash
# 启动开发服务器 (自动热重载)
npm start
```

这将：
1. 编译 TypeScript 代码
2. 启动 Zotero
3. 加载插件
4. 监听文件变化并自动重新加载

### 生产构建

```bash
# 构建 XPI 包
npm run build
```

输出文件: `.scaffold/build/*.xpi`

### 发布版本

```bash
# 升级版本并发布到 GitHub
npm run release
```

## 📖 使用指南

### 打开周计划

**方法 1: 工具菜单**
1. 打开 Zotero
2. 点击 `工具` → `周计划`
3. 在新标签页中打开

**方法 2: 侧边栏**
1. 选择任意条目
2. 在右侧详情面板切换到 `计划板` 标签

### 基本操作

#### 添加任务
1. 在任意列底部的输入框中输入任务
2. 点击 `添加` 或按 `Enter` 键

#### 编辑任务
- 双击任务文本进行编辑
- 编辑完成后点击外部区域保存

#### 删除任务
- 点击任务右下角的 `×` 按钮
- 确认删除

#### 移动任务
- 拖拽任务到其他列
- 在列内拖拽调整顺序

#### 周切换
- 点击 `◀` 查看上一周
- 点击 `▶` 查看下一周
- 点击 `本周` 返回当前周

### 高级功能

#### 搜索任务
1. 在顶部搜索框输入关键词
2. 实时过滤显示匹配的任务

#### 查看统计
1. 点击 `📈 统计` 按钮
2. 查看各列任务数和完成率
3. 再次点击隐藏统计面板

#### 个性化设置

**修改用户ID**
1. 点击用户ID旁的 `✏️` 按钮
2. 输入新的用户ID

**修改格言**
1. 点击格言文本
2. 输入新的激励格言

**上传头像**
1. 点击头像右下角的 `📷` 按钮
2. 选择图片文件 (支持 PNG, JPG, GIF)

**切换主题**
- 点击右上角的开关切换深色/浅色模式

#### 清空本周
1. 点击 `清空` 按钮
2. 确认清空所有任务

## 🎨 自定义样式

### 修改颜色主题

编辑 `addon/content/weekPlan.css`:

```css
:root {
  /* 修改主色调 */
  --wp-accent: #007bff;  /* 改为你喜欢的颜色 */
  
  /* 修改列颜色 */
  --wp-col-plan: #339af0;
  --wp-col-todo: #845ef7;
  --wp-col-doing: #fd7e14;
  --wp-col-done: #20c997;
}
```

### 添加自定义样式

在 `weekPlan.css` 末尾添加:

```css
/* 自定义样式 */
.zoteroplan-task {
  /* 你的自定义样式 */
}
```

## 🔧 故障排除

### 问题 1: npm install 失败

**错误**: `EPERM: operation not permitted`

**解决方案**:
```bash
# 方法1: 使用管理员权限 (Windows)
# 右键 PowerShell → 以管理员身份运行

# 方法2: 强制安装
npm install --force

# 方法3: 清理缓存
npm cache clean --force
npm install
```

### 问题 2: Zotero 未启动

**错误**: `Cannot find Zotero executable`

**解决方案**:
1. 检查 `.env` 文件中的路径是否正确
2. 确保 Zotero Beta 已安装
3. 使用绝对路径

### 问题 3: 插件未加载

**解决方案**:
1. 在 Zotero 中打开: `工具` → `插件`
2. 检查插件是否已启用
3. 尝试重启 Zotero

### 问题 4: 样式未生效

**解决方案**:
1. 清除 Zotero 缓存
2. 完全重启 Zotero
3. 检查 CSS 文件路径

### 问题 5: TypeScript 编译错误

**错误**: `Cannot find name 'Zotero'`

**解决方案**:
这是正常的 TypeScript 类型检查警告，不影响运行:
```bash
# 忽略并继续构建
npm run build
```

## 📊 数据管理

### 查看存储的数据

在 Zotero 中:
1. 打开 `工具` → `开发者` → `Run JavaScript`
2. 运行以下代码:

```javascript
// 查看所有周数据
const keys = Object.keys(Zotero.Prefs._prefs)
  .filter(k => k.startsWith('extensions.zotero.zoteroplan.week'));
console.log(keys);

// 查看特定周的数据
const data = Zotero.Prefs.get('extensions.zotero.zoteroplan.week.2025-10-14', true);
console.log(JSON.parse(data));

// 查看用户配置
const config = Zotero.Prefs.get('extensions.zotero.zoteroplan.userConfig', true);
console.log(JSON.parse(config));
```

### 备份数据

```javascript
// 导出所有周数据
const allData = {};
const keys = Object.keys(Zotero.Prefs._prefs)
  .filter(k => k.startsWith('extensions.zotero.zoteroplan.week'));

keys.forEach(key => {
  allData[key] = Zotero.Prefs.get(key, true);
});

// 复制到剪贴板
Zotero.Utilities.Internal.copyTextToClipboard(JSON.stringify(allData, null, 2));
```

### 恢复数据

```javascript
// 从 JSON 恢复数据
const backupData = {/* 粘贴你的备份数据 */};

Object.keys(backupData).forEach(key => {
  Zotero.Prefs.set(key, backupData[key], true);
});
```

## 🎯 最佳实践

### 1. 任务组织
- **规划**: 未明确要做的想法
- **待做**: 计划本周完成的任务
- **正在做**: 当前正在进行的任务 (建议不超过3个)
- **完成**: 已完成的任务

### 2. 优先级使用
- **高**: 紧急且重要
- **中**: 重要但不紧急
- **低**: 既不紧急也不重要

### 3. 标签使用
- 按项目: `#项目A`, `#项目B`
- 按类型: `#文档`, `#代码`, `#会议`
- 按时间: `#今天`, `#本周`, `#紧急`

### 4. 周回顾
- 每周五下午查看本周完成情况
- 将未完成任务移至下周
- 清空已完成任务

## 📚 更多资源

### 文档
- [Zotero 插件开发文档](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero Types](https://github.com/windingwind/zotero-types)

### 社区
- [Zotero 论坛](https://forums.zotero.org/)
- [Zotero 中文社区](https://zotero-chinese.com/)

### 示例插件
- [Zotero Better Notes](https://github.com/windingwind/zotero-better-notes)
- [Zotero PDF Translate](https://github.com/windingwind/zotero-pdf-translate)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发工作流
1. Fork 仓库
2. 创建特性分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📄 许可

AGPL-3.0-or-later

---

**版本**: 1.0.0  
**更新日期**: 2025-10-17  
**维护者**: Zotero Plan Team

## 💡 提示

- 使用 `Ctrl+F` 在本文档中快速查找
- 遇到问题先查看"故障排除"章节
- 定期备份数据
- 享受高效的任务管理！

Happy Planning! 🎉
