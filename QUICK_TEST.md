# 🧪 WeekPlan 快速测试指南

## 📋 前置检查

### 1. 环境检查

```bash
# 检查 Node.js 版本
node --version  # 应该是 v18 或更高

# 检查 Zotero
# 确保已安装 Zotero 7.0 Beta
```

### 2. 依赖安装状态

```bash
cd c:\Users\gro_e\Desktop\A1
npm list --depth=0
```

## 🚀 启动测试

### 步骤 1: 配置环境变量 (首次运行)

创建 `.env` 文件：

```env
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=C:\Program Files\Zotero\zotero.exe
ZOTERO_PLUGIN_PROFILE_PATH=C:\Users\你的用户名\Zotero\Profiles\xxxxx.default
```

### 步骤 2: 安装依赖

```bash
npm install --force
```

如遇权限错误：

- 关闭杀毒软件
- 以管理员身份运行 PowerShell
- 使用 `--force` 参数

### 步骤 3: 启动开发服务器

```bash
npm start
```

**预期输出**:

```
> zotero-plan@1.0.0 start
> zotero-plugin serve

Building plugin...
Starting Zotero...
Plugin loaded successfully
```

## ✅ 功能测试清单

### 在 Zotero 侧边栏测试

1. **打开侧边栏面板**
   - [ ] 在 Zotero 中选择任意条目
   - [ ] 切换到右侧 "计划板" 标签
   - [ ] 确认看到四列看板布局

2. **用户信息卡片**
   - [ ] 看到圆形头像（默认显示首字母）
   - [ ] 看到用户ID "我的任务看板"
   - [ ] 看到格言 "今日事, 今日毕 🚀"
   - [ ] 看到本周统计数字
   - [ ] 点击✏️按钮可以编辑用户ID
   - [ ] 点击格言可以编辑
   - [ ] 点击📷按钮可以上传头像

3. **任务基础操作**
   - [ ] 在"待做"列输入任务，按回车添加
   - [ ] 双击任务可以编辑内容
   - [ ] 点击 × 按钮可以删除任务
   - [ ] 拖拽任务到其他列
   - [ ] 在同一列内拖拽排序

4. **周管理功能**
   - [ ] 点击 ◀ 查看上一周
   - [ ] 点击 ▶ 查看下一周
   - [ ] 点击 "本周" 返回当前周
   - [ ] 点击 "清空" 清除本周任务
   - [ ] 查看周数显示（第 XX 周）

5. **搜索和统计**
   - [ ] 在搜索框输入关键词过滤任务
   - [ ] 点击 📈 统计 显示统计面板
   - [ ] 查看任务数量统计
   - [ ] 查看完成率和进度条

6. **主题切换**
   - [ ] 点击右上角开关切换深色模式
   - [ ] 确认颜色正确切换
   - [ ] 再次切换回浅色模式

7. **实时时钟**
   - [ ] 确认右上角显示当前时间
   - [ ] 等待1分钟确认时间更新

### 在工具菜单测试

1. **打开弹出面板**
   - [ ] 点击 Zotero 菜单 `工具` → `周计划`
   - [ ] 确认弹出遮罩层面板
   - [ ] 重复上述所有功能测试
   - [ ] 点击右上角 × 关闭面板

### 数据持久化测试

1. **创建测试数据**
   - [ ] 在各列添加多个任务
   - [ ] 关闭 Zotero
   - [ ] 重新打开 Zotero
   - [ ] 确认数据仍然存在

2. **跨周数据隔离**
   - [ ] 在本周添加任务
   - [ ] 切换到下一周
   - [ ] 确认下一周是空的
   - [ ] 添加一些任务
   - [ ] 切换回本周
   - [ ] 确认本周数据未受影响

## 🐛 常见问题排查

### 问题 1: 插件未加载

**症状**: Zotero 启动后看不到"计划板"标签

**检查**:

```javascript
// 在 Zotero 开发者工具控制台中运行
Zotero.getInstalledExtensions();
```

**解决**:

1. 确认 `npm start` 运行成功
2. 检查 Zotero 插件管理器
3. 重启 Zotero

### 问题 2: 样式未加载

**症状**: 界面显示但样式混乱

**检查**:

```javascript
// 在控制台检查
document.getElementById("zoteroplan-stylesheet");
```

**解决**:

1. 确认 `addon/content/weekPlan.css` 文件存在
2. 检查 manifest.json 配置
3. 清除 Zotero 缓存

### 问题 3: 数据未保存

**症状**: 关闭后数据丢失

**检查**:

```javascript
// 查看存储的数据
const keys = Object.keys(Zotero.Prefs._prefs).filter((k) =>
  k.includes("zoteroplan"),
);
console.log(keys);
```

**解决**:

1. 确认 `autoSave` 配置为 true
2. 检查 Zotero.Prefs 权限
3. 查看控制台错误日志

### 问题 4: 拖拽不工作

**症状**: 无法拖拽任务

**解决**:

1. 确认鼠标按住任务不松开
2. 检查浏览器控制台错误
3. 刷新页面重试

## 📊 性能测试

### 大量数据测试

```javascript
// 在开发者工具中运行，批量添加任务
function addBulkTasks(column, count) {
  for (let i = 0; i < count; i++) {
    const input = document.querySelector(`#zoteroplan-input-${column}`);
    const btn = document.querySelector(`button[data-add-to="${column}"]`);
    input.value = `测试任务 ${i + 1}`;
    btn.disabled = false;
    btn.click();
  }
}

// 添加 100 个任务到"待做"列
addBulkTasks("todo", 100);
```

**性能指标**:

- [ ] 100个任务：流畅无卡顿
- [ ] 拖拽响应：< 100ms
- [ ] 搜索响应：实时过滤
- [ ] 保存速度：< 1s

## 📝 测试报告模板

```markdown
## 测试报告

**测试日期**: 2025-10-17
**测试人**: [你的名字]
**Zotero 版本**: 7.0.x Beta
**插件版本**: 1.0.1

### 功能测试结果

- 侧边栏集成: ✅/❌
- 工具菜单: ✅/❌
- 用户信息管理: ✅/❌
- 任务CRUD: ✅/❌
- 拖拽功能: ✅/❌
- 周切换: ✅/❌
- 搜索过滤: ✅/❌
- 统计面板: ✅/❌
- 主题切换: ✅/❌
- 数据持久化: ✅/❌

### 发现的问题

1. [描述问题]
2. [描述问题]

### 建议改进

1. [建议]
2. [建议]

### 总体评价

⭐⭐⭐⭐⭐ (1-5星)
```

## 🎯 测试完成标准

- ✅ 所有功能测试通过
- ✅ 无控制台错误
- ✅ 性能测试达标
- ✅ 数据持久化正常
- ✅ 跨会话数据保持

## 🎉 测试通过后

1. 填写测试报告
2. 记录任何问题或建议
3. 开始日常使用
4. 定期备份数据

---

**测试时长预计**: 15-20分钟
**难度**: ⭐⭐☆☆☆ (简单)
