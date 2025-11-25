import { config } from "../../package.json";
import { getString } from "../utils/locale";

/**
 * 任务类型定义
 */
export interface Task {
  id: string;
  text: string;
  created: string;
  priority?: "high" | "medium" | "low" | "none";
  tags?: string[];
  note?: string;
}

/**
 * 看板数据类型定义
 */
export interface BoardData {
  [column: string]: Task[];
}

/**
 * 用户配置类型定义
 */
export interface UserConfig {
  userId: string;
  userMotto: string;
  userAvatar?: string;
  theme: "light" | "dark";
  showTimestamp: boolean;
  autoSave: boolean;
}

export class WeekPlanManager {
  private currentWeek: Date = new Date();
  private columns: string[] = ["planning", "todo", "doing", "done"];
  private panelId = "zoteroplan-panel";
  private panelDoc: Document | null = null;
  private currentDraggedEl: HTMLElement | null = null;
  private clockInterval: any = null;
  private searchQuery: string = "";
  private showStats: boolean = false;
  private userConfig: UserConfig = {
    userId: "我的任务看板",
    userMotto: "今日事, 今日毕 🚀",
    theme: "light",
    showTimestamp: true,
    autoSave: true,
  };

  constructor() {
    this.loadUserConfig();
  }

  /**
   * 加载用户配置
   */
  private loadUserConfig(): void {
    try {
      const configKey = `${config.prefsPrefix}.userConfig`;
      const stored = Zotero.Prefs.get(configKey, true) as string;
      if (stored) {
        this.userConfig = { ...this.userConfig, ...JSON.parse(stored) };
      }
    } catch (e) {
      ztoolkit.log("Error loading user config:", e);
    }
  }

  /**
   * 保存用户配置
   */
  private saveUserConfig(): void {
    try {
      const configKey = `${config.prefsPrefix}.userConfig`;
      Zotero.Prefs.set(configKey, JSON.stringify(this.userConfig), true);
    } catch (e) {
      ztoolkit.log("Error saving user config:", e);
    }
  }

  /**
   * 创建周计划面板
   */
  public createPlanPanel(win: Window): Element {
    const doc = win.document;
    this.panelDoc = doc;

    // 创建面板容器
    const panel = doc.createElement("div");
    panel.id = this.panelId;
    panel.className = "zoteroplan-container";
    panel.setAttribute("data-theme", this.userConfig.theme);

    // 加载样式表
    this.loadStyleSheet(doc);

    // 添加用户卡片
    panel.appendChild(this.createUserCard(doc));

    // 添加头部
    panel.appendChild(this.createHeader(doc));

    // 添加工具栏
    panel.appendChild(this.createToolbar(doc));

    // 添加统计面板
    panel.appendChild(this.createStatsPanel(doc));

    // 添加看板主体
    panel.appendChild(this.createBoard(doc));

    // 初始化数据
    this.loadForWeek();

    // 添加事件监听器
    this.addEventListeners();

    // 启动时钟
    this.startClock();

    return panel;
  }

  /**
   * 加载样式表
   */
  private loadStyleSheet(doc: Document): void {
    const linkId = "zoteroplan-stylesheet";
    if (!doc.getElementById(linkId)) {
      const link = doc.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `chrome://${addon.data.config.addonRef}/content/weekPlan.css`;
      if (doc.head) {
        doc.head.appendChild(link);
      } else {
        doc.documentElement?.appendChild(link);
      }
    }
  }

  /**
   * 创建用户卡片 - 满足用户偏好要求
   */
  private createUserCard(doc: Document): Element {
    const card = doc.createElement("div");
    card.className = "zoteroplan-user-card";

    // 头像区域
    const avatarWrapper = doc.createElement("div");
    avatarWrapper.className = "zoteroplan-user-avatar-wrapper";

    const avatar = doc.createElement("div");
    avatar.className = "zoteroplan-user-avatar";
    avatar.id = "zoteroplan-user-avatar";

    if (this.userConfig.userAvatar) {
      const img = doc.createElement("img");
      img.src = this.userConfig.userAvatar;
      avatar.appendChild(img);
    } else {
      const initial = doc.createElement("span");
      initial.textContent = this.userConfig.userId.charAt(0).toUpperCase();
      avatar.appendChild(initial);
    }

    const uploadBtn = doc.createElement("div");
    uploadBtn.className = "zoteroplan-avatar-upload-btn";
    uploadBtn.textContent = "📷";
    uploadBtn.title = "上传头像";
    uploadBtn.addEventListener("click", () => this.uploadAvatar());

    avatarWrapper.appendChild(avatar);
    avatarWrapper.appendChild(uploadBtn);

    // 用户信息区域
    const userInfo = doc.createElement("div");
    userInfo.className = "zoteroplan-user-info";

    const userId = doc.createElement("h2");
    userId.className = "zoteroplan-user-id";

    const userIdText = doc.createElement("span");
    userIdText.id = "zoteroplan-user-id-text";
    userIdText.textContent = this.userConfig.userId;

    const editBtn = doc.createElement("button");
    editBtn.className = "zoteroplan-user-id-edit";
    editBtn.textContent = "✏️";
    editBtn.title = "编辑用户ID";
    editBtn.addEventListener("click", () => this.editUserId());

    userId.appendChild(userIdText);
    userId.appendChild(editBtn);

    const motto = doc.createElement("p");
    motto.className = "zoteroplan-user-motto";
    motto.id = "zoteroplan-user-motto";
    motto.textContent = this.userConfig.userMotto;
    motto.title = "点击编辑格言";
    motto.addEventListener("click", () => this.editMotto());

    const statsMini = doc.createElement("div");
    statsMini.className = "zoteroplan-user-stats-mini";

    const weekTotal = doc.createElement("span");
    weekTotal.className = "zoteroplan-user-stat-item";
    weekTotal.innerHTML =
      '🎯 本周任务: <strong id="zoteroplan-user-week-total">0</strong>';

    const weekDone = doc.createElement("span");
    weekDone.className = "zoteroplan-user-stat-item";
    weekDone.innerHTML =
      '✅ 已完成: <strong id="zoteroplan-user-week-done">0</strong>';

    statsMini.appendChild(weekTotal);
    statsMini.appendChild(weekDone);

    userInfo.appendChild(userId);
    userInfo.appendChild(motto);
    userInfo.appendChild(statsMini);

    card.appendChild(avatarWrapper);
    card.appendChild(userInfo);

    return card;
  }

  /**
   * 创建头部区域
   */
  private createHeader(doc: Document): Element {
    const header = doc.createElement("div");
    header.className = "zoteroplan-header";

    // 标题
    const title = doc.createElement("h2");
    title.textContent = "📊 周任务看板";

    // 右侧控制区域
    const headerInfo = doc.createElement("div");
    headerInfo.className = "zoteroplan-header-info";

    // 周控制
    const weekControls = doc.createElement("div");
    weekControls.className = "zoteroplan-week-controls";

    // 当前日期
    const currentDate = doc.createElement("div");
    currentDate.id = "zoteroplan-current-date";
    currentDate.className = "zoteroplan-current-date";
    this.updateCurrentDate(currentDate);

    const prevWeekBtn = doc.createElement("button");
    prevWeekBtn.className = "zoteroplan-btn";
    prevWeekBtn.textContent = "◀";
    prevWeekBtn.title = "上一周";
    prevWeekBtn.addEventListener("click", () => this.prevWeek());

    const weekLabel = doc.createElement("span");
    weekLabel.id = "zoteroplan-weekLabel";
    weekLabel.className = "zoteroplan-week-label";
    weekLabel.textContent = this.fmtRange(this.currentWeek);

    const weekNumber = doc.createElement("span");
    weekNumber.id = "zoteroplan-weekNumber";
    weekNumber.className = "zoteroplan-week-number";
    weekNumber.textContent = `(第 ${this.getWeekNumber(this.currentWeek)} 周)`;

    const nextWeekBtn = doc.createElement("button");
    nextWeekBtn.className = "zoteroplan-btn";
    nextWeekBtn.textContent = "▶";
    nextWeekBtn.title = "下一周";
    nextWeekBtn.addEventListener("click", () => this.nextWeek());

    const todayBtn = doc.createElement("button");
    todayBtn.className = "zoteroplan-btn";
    todayBtn.textContent = "本周";
    todayBtn.addEventListener("click", () => this.goToToday());

    const clearBtn = doc.createElement("button");
    clearBtn.className = "zoteroplan-btn danger";
    clearBtn.textContent = "清空";
    clearBtn.title = "清空本周所有任务";
    clearBtn.addEventListener("click", () => this.clearCurrentWeek());

    weekControls.appendChild(currentDate);
    weekControls.appendChild(prevWeekBtn);
    weekControls.appendChild(weekLabel);
    weekControls.appendChild(weekNumber);
    weekControls.appendChild(nextWeekBtn);
    weekControls.appendChild(todayBtn);
    weekControls.appendChild(clearBtn);

    // 实时时钟
    const liveClock = doc.createElement("div");
    liveClock.id = "zoteroplan-live-clock";
    liveClock.className = "zoteroplan-live-clock";

    // 主题切换
    const themeToggle = doc.createElement("label");
    themeToggle.className = "zoteroplan-theme-toggle";
    themeToggle.title = "切换深色模式";

    const themeInput = doc.createElement("input");
    themeInput.type = "checkbox";
    themeInput.id = "zoteroplan-theme-toggle";
    themeInput.checked = this.userConfig.theme === "dark";
    themeInput.addEventListener("change", (e) =>
      this.toggleTheme((e.target as HTMLInputElement).checked),
    );

    const themeSlider = doc.createElement("span");
    themeSlider.className = "zoteroplan-theme-slider";

    themeToggle.appendChild(themeInput);
    themeToggle.appendChild(themeSlider);

    headerInfo.appendChild(weekControls);
    headerInfo.appendChild(liveClock);
    headerInfo.appendChild(themeToggle);

    header.appendChild(title);
    header.appendChild(headerInfo);

    return header;
  }

  /**
   * 创建工具栏 - 满足对齐要求
   */
  private createToolbar(doc: Document): Element {
    const toolbar = doc.createElement("div");
    toolbar.className = "zoteroplan-toolbar";

    // 搜索栏
    const searchBar = doc.createElement("div");
    searchBar.className = "zoteroplan-search-bar";

    const searchInput = doc.createElement("input");
    searchInput.type = "text";
    searchInput.id = "zoteroplan-search-input";
    searchInput.placeholder = "🔍 搜索任务...";
    searchInput.addEventListener("input", (e) =>
      this.onSearch((e.target as HTMLInputElement).value),
    );

    searchBar.appendChild(searchInput);

    // 统计按钮
    const statsBtn = doc.createElement("button");
    statsBtn.className = "zoteroplan-btn";
    statsBtn.textContent = "📈 统计";
    statsBtn.title = "查看统计";
    statsBtn.addEventListener("click", () => this.toggleStats());

    toolbar.appendChild(searchBar);
    toolbar.appendChild(statsBtn);

    return toolbar;
  }

  /**
   * 创建统计面板
   */
  private createStatsPanel(doc: Document): Element {
    const panel = doc.createElement("div");
    panel.id = "zoteroplan-stats-panel";
    panel.className = "zoteroplan-stats-panel";
    panel.style.display = this.showStats ? "grid" : "none";

    const stats = [
      { id: "total", label: "总任务", value: "0" },
      { id: "planning", label: "规划中", value: "0" },
      { id: "todo", label: "待做", value: "0" },
      { id: "doing", label: "进行中", value: "0" },
      { id: "done", label: "已完成", value: "0" },
      { id: "progress", label: "完成率", value: "0%", hasProgress: true },
    ];

    stats.forEach((stat) => {
      const card = doc.createElement("div");
      card.className = "zoteroplan-stat-card";

      const number = doc.createElement("div");
      number.className = "zoteroplan-stat-number";
      number.id = `zoteroplan-stat-${stat.id}`;
      number.textContent = stat.value;

      const label = doc.createElement("div");
      label.className = "zoteroplan-stat-label";
      label.textContent = stat.label;

      card.appendChild(number);
      card.appendChild(label);

      if (stat.hasProgress) {
        const progressBar = doc.createElement("div");
        progressBar.className = "zoteroplan-progress-bar";

        const progressFill = doc.createElement("div");
        progressFill.className = "zoteroplan-progress-fill";
        progressFill.id = "zoteroplan-progress-fill";
        progressFill.style.width = "0%";

        progressBar.appendChild(progressFill);
        card.appendChild(progressBar);
      }

      panel.appendChild(card);
    });

    return panel;
  }

  /**
   * 创建看板主体
   */
  private createBoard(doc: Document): Element {
    const board = doc.createElement("div");
    board.id = "zoteroplan-board";
    board.className = "zoteroplan-board";

    // 创建四个列
    this.columns.forEach((col) => {
      const column = this.createColumn(doc, col);
      board.appendChild(column);
    });

    return board;
  }

  /**
   * 创建单个列
   */
  private createColumn(doc: Document, colKey: string): Element {
    const columnNames: { [key: string]: string } = {
      planning: "规划",
      todo: "待做",
      doing: "正在做",
      done: "完成",
    };

    const column = doc.createElement("div");
    column.className = `zoteroplan-column zoteroplan-column-${colKey}`;
    column.setAttribute("data-column", colKey);

    // 列标题
    const header = doc.createElement("div");
    header.className = "zoteroplan-col-header";

    const titleWrapper = doc.createElement("div");
    titleWrapper.className = "zoteroplan-col-title";

    const title = doc.createElement("span");
    title.textContent = columnNames[colKey];

    const count = doc.createElement("span");
    count.id = `zoteroplan-count-${colKey}`;
    count.className = "zoteroplan-task-count";
    count.textContent = "0";

    titleWrapper.appendChild(title);
    titleWrapper.appendChild(count);

    header.appendChild(titleWrapper);

    // 任务列表
    const list = doc.createElement("div");
    list.id = `zoteroplan-${colKey}List`;
    list.className = "zoteroplan-col-list";

    // 添加任务输入 - 恢复到底部，符合直觉
    const addRow = doc.createElement("div");
    addRow.className = "zoteroplan-add-row";

    const input = doc.createElement("input");
    input.id = `zoteroplan-input-${colKey}`;
    input.type = "text";
    input.placeholder = `添加到${columnNames[colKey]}...`;

    const addBtn = doc.createElement("button");
    addBtn.className = "zoteroplan-btn";
    addBtn.textContent = "添加";
    addBtn.setAttribute("data-add-to", colKey);
    addBtn.disabled = true;
    addBtn.addEventListener("click", () => {
      this.addTask(colKey, input.value);
      input.value = "";
      addBtn.disabled = true;
    });

    input.addEventListener("input", () => {
      addBtn.disabled = !input.value.trim();
    });

    input.addEventListener("keypress", (e) => {
      if ((e as KeyboardEvent).key === "Enter" && !addBtn.disabled) {
        this.addTask(colKey, input.value);
        input.value = "";
        addBtn.disabled = true;
      }
    });

    addRow.appendChild(input);
    addRow.appendChild(addBtn);

    // 正确顺序：标题 → 任务列表 → 添加框（底部）
    column.appendChild(header);
    column.appendChild(list);     // 任务列表在中间
    column.appendChild(addRow);   // 添加框在底部

    return column;
  }

  /**
   * 加载指定周的数据
   */
  private loadForWeek(): void {
    if (!this.panelDoc) return;

    const key = this.weekKey(this.currentWeek);
    let data: BoardData = {
      planning: [],
      todo: [],
      doing: [],
      done: [],
    };

    try {
      ztoolkit.log(`尝试加载周数据，key: ${key}`);
      const storedData = Zotero.Prefs.get(key, true) as string;
      if (storedData) {
        data = JSON.parse(storedData);
        ztoolkit.log("✅ 成功加载数据:", data);
      } else {
        ztoolkit.log("⚠️ 未找到保存的数据，使用空数据");
      }
    } catch (e) {
      ztoolkit.log("❌ 加载数据失败:", e);
    }

    // 渲染每个列的任务
    this.columns.forEach((col) => {
      const listElement = this.panelDoc!.getElementById(
        `zoteroplan-${col}List`,
      );
      if (!listElement) return;

      listElement.innerHTML = "";
      const tasksForColumn = (data[col] || []).filter(Boolean);

      ztoolkit.log(`渲染列 ${col}，任务数: ${tasksForColumn.length}`);

      if (tasksForColumn.length === 0) {
        this.showEmptyState(listElement as HTMLElement);
      } else {
        tasksForColumn.forEach((taskData) => {
          const taskElement = this.renderTask(taskData);
          if (taskElement) {
            listElement.appendChild(taskElement);
          }
        });
      }
    });

    // 更新UI
    this.updateWeekLabel();
    this.updateTaskCounts();
    this.updateStats();
    this.applySearchFilter();
  }

  /**
   * 保存当前周的数据
   */
  private saveForWeek(): void {
    if (!this.panelDoc) {
      ztoolkit.log("警告：panelDoc 为空，无法保存数据");
      return;
    }

    // 移除 autoSave 检查，确保数据总是被保存
    const key = this.weekKey(this.currentWeek);
    const data: BoardData = {
      planning: [],
      todo: [],
      doing: [],
      done: [],
    };

    this.columns.forEach((col) => {
      const tasks: Task[] = [];
      const taskElements = this.panelDoc!.querySelectorAll(
        `#zoteroplan-${col}List .zoteroplan-task`,
      );

      ztoolkit.log(`正在保存列 ${col}，找到 ${taskElements.length} 个任务`);

      taskElements.forEach((taskElement: Element) => {
        const htmlElement = taskElement as HTMLElement;
        const contentElement = taskElement.querySelector(
          ".zoteroplan-task-content",
        );
        if (contentElement && htmlElement.dataset.id) {
          const task: Task = {
            id: htmlElement.dataset.id,
            text: contentElement.textContent || "",
            created: htmlElement.dataset.created || new Date().toISOString(),
            priority: (htmlElement.dataset.priority as any) || "none",
          };

          // 保存标签
          if (htmlElement.dataset.tags) {
            task.tags = htmlElement.dataset.tags
              .split(",")
              .filter((t) => t.trim());
          }

          // 保存备注
          if (htmlElement.dataset.note) {
            task.note = htmlElement.dataset.note;
          }

          tasks.push(task);
        }
      });

      data[col] = tasks;
    });

    try {
      ztoolkit.log(`尝试保存数据到 key: ${key}`);
      ztoolkit.log("保存的数据:", JSON.stringify(data, null, 2));
      
      Zotero.Prefs.set(key, JSON.stringify(data), true);
      
      // 验证保存是否成功
      const saved = Zotero.Prefs.get(key, true) as string;
      if (saved) {
        ztoolkit.log("✅ 数据保存成功！验证读取:", saved.substring(0, 100) + "...");
      } else {
        ztoolkit.log("❌ 警告：保存后读取为空");
      }
    } catch (e) {
      ztoolkit.log("❌ 保存数据失败:", e);
      // 显示错误提示给用户
      if (this.panelDoc?.defaultView) {
        this.panelDoc.defaultView.alert(
          `保存任务失败！请检查 Zotero 权限。\n错误: ${e}`
        );
      }
    }

    this.updateTaskCounts();
    this.updateStats();
  }

  /**
   * 渲染单个任务
   */
  private renderTask(taskData: Task): HTMLElement | null {
    if (!this.panelDoc || !taskData || typeof taskData !== "object")
      return null;

    const taskElement = this.panelDoc.createElement("div");
    taskElement.className = "zoteroplan-task";
    taskElement.dataset.id =
      taskData.id ||
      `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    taskElement.dataset.created = taskData.created || new Date().toISOString();
    taskElement.dataset.priority = taskData.priority || "none";
    taskElement.draggable = true;

    if (taskData.tags && taskData.tags.length > 0) {
      taskElement.dataset.tags = taskData.tags.join(",");
    }

    if (taskData.note) {
      taskElement.dataset.note = taskData.note;
    }

    // 优先级标记
    let priorityBadge = "";
    if (taskData.priority && taskData.priority !== "none") {
      taskElement.setAttribute("data-priority", taskData.priority);
      priorityBadge = `<span class="zoteroplan-priority-badge ${taskData.priority}"></span>`;
    }

    // 任务内容
    const content = this.panelDoc.createElement("div");
    content.className = "zoteroplan-task-content";
    content.textContent = taskData.text || "";
    content.contentEditable = "true";
    content.setAttribute("spellcheck", "false"); // 禁用拼写检查
    content.addEventListener("blur", () => this.saveForWeek());

    // 阻止内容编辑区域触发拖拽 - 关键修复！
    content.addEventListener("mousedown", (e: Event) => {
      e.stopPropagation(); // 阻止事件冒泡到任务元素
    });

    content.addEventListener("dragstart", (e: Event) => {
      e.preventDefault(); // 阻止内容区域的拖拽
      e.stopPropagation();
    });

    // 双击复制任务内容到剪贴板 - 新增功能！
    content.addEventListener("dblclick", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const text = content.textContent?.trim() || "";
      if (!text) return;

      try {
        // 使用 Zotero 的剪贴板 API
        const clipboardHelper = (Components.classes as any)[
          "@mozilla.org/widget/clipboardhelper;1"
        ].getService((Components.interfaces as any).nsIClipboardHelper);
        clipboardHelper.copyString(text);

        // 显示复制成功提示
        this.showCopyFeedback(content, "已复制！");

        // 选中全部文本
        const selection = this.panelDoc!.defaultView?.getSelection();
        const range = this.panelDoc!.createRange();
        range.selectNodeContents(content);
        selection?.removeAllRanges();
        selection?.addRange(range);

        ztoolkit.log("任务内容已复制:", text);
      } catch (err) {
        ztoolkit.log("复制失败:", err);
        this.showCopyFeedback(content, "复制失败", true);
      }
    });

    // Enter键保存并退出编辑，Shift+Enter换行
    content.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        content.blur(); // 退出编辑模式，触发保存
      }
      // Esc键取消编辑
      if (e.key === "Escape") {
        e.preventDefault();
        content.textContent = taskData.text || ""; // 恢复原内容
        content.blur();
      }
    });

    // 鼠标悬停时显示提示
    content.title = "双击复制 | Enter保存 | Shift+Enter换行 | Esc取消";

    // 标签
    const tagsHtml = "";
    if (taskData.tags && taskData.tags.length > 0) {
      const tagsContainer = this.panelDoc.createElement("div");
      tagsContainer.className = "zoteroplan-task-tags";
      taskData.tags.forEach((tag) => {
        const tagSpan = this.panelDoc!.createElement("span");
        tagSpan.className = "zoteroplan-tag";
        tagSpan.textContent = tag;
        tagsContainer.appendChild(tagSpan);
      });
      taskElement.appendChild(content);
      taskElement.appendChild(tagsContainer);
    } else {
      taskElement.appendChild(content);
    }

    // 备注
    if (taskData.note) {
      const noteDiv = this.panelDoc.createElement("div");
      noteDiv.className = "zoteroplan-task-note";
      noteDiv.textContent = `📝 ${taskData.note}`;
      taskElement.appendChild(noteDiv);
    }

    // 元数据
    const meta = this.panelDoc.createElement("div");
    meta.className = "zoteroplan-task-meta";

    const createdAt = new Date(taskElement.dataset.created);
    const timestamp = this.panelDoc.createElement("span");
    timestamp.className = "zoteroplan-task-timestamp";
    timestamp.textContent = `创建于 ${createdAt.toLocaleDateString()}`;
    timestamp.title = createdAt.toLocaleString();
    timestamp.style.display = this.userConfig.showTimestamp ? "inline" : "none";

    const delBtn = this.panelDoc.createElement("button");
    delBtn.className = "zoteroplan-task-delete";
    delBtn.textContent = "×";
    delBtn.title = "删除任务";
    delBtn.addEventListener("click", () => {
      if (confirm("确定要删除该任务吗？")) {
        taskElement.remove();
        this.saveForWeek();
      }
    });

    meta.appendChild(timestamp);
    meta.appendChild(delBtn);
    taskElement.appendChild(meta);

    // 不再在这里添加拖拽事件监听器，使用事件委托处理
    // 拖拽事件已在 addEventListeners() 中统一处理

    // 任务级拖拽兜底：确保无论委托是否失效，都能触发 dragstart
    taskElement.addEventListener("dragstart", (e: DragEvent) => {
      this.currentDraggedEl = taskElement;
      taskElement.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskElement.dataset.id || "");
        const contentEl = taskElement.querySelector(
          ".zoteroplan-task-content",
        ) as HTMLElement | null;
        const serialized = {
          id: taskElement.dataset.id || "",
          text: contentEl?.textContent || "",
          created: taskElement.dataset.created || new Date().toISOString(),
          priority: taskElement.dataset.priority || "none",
          tags: (taskElement.dataset.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          note: taskElement.dataset.note || "",
        } as Task;
        try {
          e.dataTransfer.setData(
            "application/x-zoteroplan-task",
            JSON.stringify(serialized),
          );
        } catch (_) {}
      }
    });

    // 右键菜单（可扩展）
    taskElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // 这里可以添加右键菜单功能
    });

    return taskElement;
  }

  /**
   * 添加任务
   */
  private addTask(column: string, text: string): void {
    if (!text.trim() || !this.panelDoc) return;

    const listElement = this.panelDoc.getElementById(
      `zoteroplan-${column}List`,
    );
    if (!listElement) return;

    // 移除空状态提示
    const emptyState = listElement.querySelector(".zoteroplan-empty-state");
    if (emptyState) {
      emptyState.remove();
    }

    const taskData: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      created: new Date().toISOString(),
      priority: "none",
    };

    const taskElement = this.renderTask(taskData);
    if (taskElement) {
      taskElement.classList.add("newly-added");
      listElement.appendChild(taskElement);

      setTimeout(() => {
        taskElement.classList.remove("newly-added");
      }, 400);
    }

    this.saveForWeek();
  }

  /**
   * 显示空状态
   */
  private showEmptyState(container: HTMLElement): void {
    if (!this.panelDoc) return;

    const emptyState = this.panelDoc.createElement("div");
    emptyState.className = "zoteroplan-empty-state";

    const icon = this.panelDoc.createElement("div");
    icon.className = "zoteroplan-empty-state-icon";
    icon.textContent = "✨";

    const text = this.panelDoc.createElement("div");
    text.className = "zoteroplan-empty-state-text";
    text.textContent = "还没有任务，点击下方添加吧！";

    emptyState.appendChild(icon);
    emptyState.appendChild(text);
    container.appendChild(emptyState);
  }

  /**
   * 添加拖拽相关事件监听器
   */
  private addEventListeners(): void {
    if (!this.panelDoc) return;

    const board = this.panelDoc.getElementById("zoteroplan-board");
    if (!board) {
      ztoolkit.log("找不到看板元素");
      return;
    }

    ztoolkit.log("开始初始化拖拽功能");

    // 拖拽增强：使用放置指示器，精确定位插入点，修复空列表及顶部/底部判定
    let draggedEl: HTMLElement | null = null;
    const dropIndicator = this.panelDoc.createElement("div");
    dropIndicator.className = "zoteroplan-drop-indicator";

    // 事件：dragstart - 统一绑定在看板容器上，使用事件委托
    board.addEventListener("dragstart", (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.classList.contains("zoteroplan-task")) {
        ztoolkit.log("拖拽的不是任务元素", target);
        return;
      }

      draggedEl = target;
      this.currentDraggedEl = target;
      draggedEl.classList.add("dragging");

      const dragEvent = e as DragEvent;
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = "move";

        // 基础兼容数据
        dragEvent.dataTransfer.setData(
          "text/plain",
          draggedEl.dataset.id || "",
        );

        // 序列化任务数据，支持跨窗口/跨文档放置
        const contentEl = draggedEl.querySelector(
          ".zoteroplan-task-content",
        ) as HTMLElement | null;
        const serialized = {
          id: draggedEl.dataset.id || "",
          text: contentEl?.textContent || "",
          created: draggedEl.dataset.created || new Date().toISOString(),
          priority: draggedEl.dataset.priority || "none",
          tags: (draggedEl.dataset.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          note: draggedEl.dataset.note || "",
        } as Task;

        try {
          dragEvent.dataTransfer.setData(
            "application/x-zoteroplan-task",
            JSON.stringify(serialized),
          );
        } catch (err) {
          ztoolkit.log("序列化拖拽数据失败", err);
        }

        // 设置拖拽预览图像，提升可视化反馈
        try {
          const dragImage = (draggedEl as HTMLElement).cloneNode(
            true,
          ) as HTMLElement;
          dragImage.style.position = "absolute";
          dragImage.style.pointerEvents = "none";
          dragImage.style.width = `${(draggedEl as HTMLElement).offsetWidth}px`;
          dragImage.style.opacity = "0.85";
          // 将克隆体临时添加到文档以计算样式
          if (this.panelDoc && this.panelDoc.body) {
            this.panelDoc.body.appendChild(dragImage);
            dragEvent.dataTransfer.setDragImage(dragImage, 16, 16);
            // 下一帧移除，避免污染 DOM（requestAnimationFrame 在某些上下文不可用）
            const raf = (this.panelDoc.defaultView &&
              this.panelDoc.defaultView.requestAnimationFrame)
              ? this.panelDoc.defaultView.requestAnimationFrame.bind(
                  this.panelDoc.defaultView,
                )
              : null;
            if (raf) {
              raf(() => dragImage.remove());
            } else {
              setTimeout(() => dragImage.remove(), 0);
            }
          }
        } catch (err) {
          // 忽略 drag image 失败
        }
      }

      ztoolkit.log("开始拖拽任务:", draggedEl.dataset.id);
    });

    // 事件：dragend - 清理拖拽状态
    board.addEventListener("dragend", (e: Event) => {
      ztoolkit.log("拖拽结束");

      if (draggedEl) {
        draggedEl.classList.remove("dragging");
        draggedEl = null;
        this.currentDraggedEl = null;
      }
      dropIndicator.remove();

      // 清理所有列的 drag-over 状态
      this.columns.forEach((col) => {
        const listEl = this.panelDoc!.getElementById(`zoteroplan-${col}List`);
        if (listEl) {
          listEl.classList.remove("drag-over");
        }
      });

      // 保存数据并更新UI
      this.saveForWeek();
      this.applySearchFilter();
    });

    // 事件：dragover - 显示放置指示器
    board.addEventListener("dragover", (e: DragEvent) => {
      if (!draggedEl && !this.currentDraggedEl) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      // 找到目标列表 - 改进选择器
      let targetList: HTMLElement | null = null;
      let target = e.target as Element;

      // 向上查找直到找到列表容器
      while (target && target !== board) {
        if (
          target.classList &&
          target.classList.contains("zoteroplan-col-list")
        ) {
          targetList = target as HTMLElement;
          break;
        }
        target = target.parentElement as Element;
      }

      // 清理所有列表的 drag-over 状态
      this.columns.forEach((col) => {
        const el = this.panelDoc!.getElementById(`zoteroplan-${col}List`);
        if (el) {
          el.classList.remove("drag-over");
        }
      });

      if (!targetList) {
        dropIndicator.remove();
        return;
      }

      targetList.classList.add("drag-over");

      // 计算应该放置的位置
      const afterElement = this.getDragAfterElement(targetList, e.clientY);

      if (afterElement === null) {
        // 放在列表末尾
        targetList.appendChild(dropIndicator);
      } else if (afterElement === undefined) {
        // 放在列表开头
        if (targetList.firstChild) {
          targetList.insertBefore(dropIndicator, targetList.firstChild);
        } else {
          targetList.appendChild(dropIndicator);
        }
      } else {
        // 放在指定元素之前
        targetList.insertBefore(dropIndicator, afterElement);
      }
    });

    // 事件：dragleave - 清理状态
    board.addEventListener("dragleave", (e: DragEvent) => {
      const related = e.relatedTarget as Node | null;

      // 只在完全离开看板时清理
      if (!board.contains(related)) {
        this.columns.forEach((col) => {
          const el = this.panelDoc!.getElementById(`zoteroplan-${col}List`);
          if (el) {
            el.classList.remove("drag-over");
          }
        });
        dropIndicator.remove();
      }
    });

    // 事件：drop - 执行放置操作（支持跨文档/跨窗口）
    board.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      ztoolkit.log("执行放置操作");

      // 注意：跨窗口拖拽时，本窗口可能没有 draggedEl 引用

      // 找到目标列表 - 改进选择器
      let targetList: HTMLElement | null = null;
      let target = e.target as Element;

      while (target && target !== board) {
        if (
          target.classList &&
          target.classList.contains("zoteroplan-col-list")
        ) {
          targetList = target as HTMLElement;
          break;
        }
        target = target.parentElement as Element;
      }

      if (!targetList) {
        ztoolkit.log("找不到目标列表");
        return;
      }

      ztoolkit.log("放置到列表:", targetList.id);

      // 移除空状态提示
      const emptyState = targetList.querySelector(".zoteroplan-empty-state");
      if (emptyState) {
        emptyState.remove();
      }

      // 构造插入的节点：
      // 1) 同文档拖拽：直接移动现有元素
      // 2) 跨文档拖拽：从 dataTransfer 反序列化并新建元素
      let nodeToInsert: HTMLElement | null = null;

      const activeDragged = draggedEl || this.currentDraggedEl;
      const sameDocumentMove =
        activeDragged && activeDragged.ownerDocument === targetList.ownerDocument;

      if (sameDocumentMove) {
        nodeToInsert = activeDragged!;
      } else if (e.dataTransfer) {
        const custom = e.dataTransfer.getData("application/x-zoteroplan-task");
        try {
          if (custom) {
            const parsed = JSON.parse(custom) as Task;
            // 在目标文档渲染一个新的任务节点
            nodeToInsert = this.renderTask(parsed);
          }
        } catch (err) {
          ztoolkit.log("解析跨窗口拖拽数据失败", err);
        }
      }

      if (!nodeToInsert) {
        ztoolkit.log("没有可插入的任务节点");
        return;
      }

      // 执行放置
      if (dropIndicator.parentNode === targetList) {
        targetList.insertBefore(nodeToInsert, dropIndicator);
      } else {
        targetList.appendChild(nodeToInsert);
      }

      ztoolkit.log("放置成功");

      // 检查源列表是否为空，如果为空则显示空状态
      this.columns.forEach((col) => {
        const listEl = this.panelDoc!.getElementById(`zoteroplan-${col}List`);
        if (listEl) {
          const tasks = listEl.querySelectorAll(".zoteroplan-task");
          if (
            tasks.length === 0 &&
            !listEl.querySelector(".zoteroplan-empty-state")
          ) {
            this.showEmptyState(listEl as HTMLElement);
          }
        }
      });

      // 清理指示器
      dropIndicator.remove();

      // 保存数据
      this.saveForWeek();
    });

    ztoolkit.log("拖拽功能初始化完成");
  }

  /**
   * 获取拖拽元素应该放置在哪个元素之前
   *
   * @param container 目标列表容器
   * @param y 鼠标的 Y 坐标
   * @returns
   *   - Element: 在该元素前插入
   *   - undefined: 插入到列表顶部（列表为空或在第一个元素上方）
   *   - null: 插入到列表底部
   */
  private getDragAfterElement(
    container: Element,
    y: number,
  ): Element | null | undefined {
    // 获取所有非拖拽中的任务元素
    const candidates: Element[] = Array.from(
      container.querySelectorAll(".zoteroplan-task:not(.dragging)"),
    );

    // 空列表时，根据鼠标位置返回不同值
    if (candidates.length === 0) {
      const listRect = container.getBoundingClientRect();
      const listMiddle = listRect.top + listRect.height / 2;
      // 鼠标在上半部分返回 undefined（顶部），下半部分返回 null（底部）
      return y < listMiddle ? undefined : null;
    }

    // 获取列表容器的位置信息
    const listRect = container.getBoundingClientRect();

    // 如果鼠标位置在列表顶部区域（前15%高度），直接返回第一个元素
    if (y < listRect.top + listRect.height * 0.15) {
      return candidates[0];
    }

    // 减小底部区域判定范围，从10%改为5%，减少意外放置在底部的情况
    if (y > listRect.bottom - listRect.height * 0.05) {
      return null;
    }

    // 正常计算放置位置 - 更精确的任务间定位
    for (let i = 0; i < candidates.length; i++) {
      const elem = candidates[i] as HTMLElement;
      const box = elem.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0) {
        return elem;
      }
    }

    // 只有在鼠标非常接近底部时才默认放在末尾
    if (y > listRect.bottom - listRect.height * 0.2 && candidates.length > 1) {
      return candidates[candidates.length - 1];
    }

    return null;
  }

  /**
   * 更新任务计数
   */
  private updateTaskCounts(): void {
    if (!this.panelDoc) return;

    let totalTasks = 0;
    let doneTasks = 0;

    this.columns.forEach((col) => {
      const countElement = this.panelDoc!.getElementById(
        `zoteroplan-count-${col}`,
      );
      if (!countElement) return;

      const taskElements = this.panelDoc!.querySelectorAll(
        `#zoteroplan-${col}List .zoteroplan-task`,
      );
      const count = taskElements.length;
      countElement.textContent = count.toString();

      totalTasks += count;
      if (col === "done") {
        doneTasks = count;
      }
    });

    // 更新用户卡片统计
    const weekTotalEl = this.panelDoc.getElementById(
      "zoteroplan-user-week-total",
    );
    const weekDoneEl = this.panelDoc.getElementById(
      "zoteroplan-user-week-done",
    );

    if (weekTotalEl) weekTotalEl.textContent = totalTasks.toString();
    if (weekDoneEl) weekDoneEl.textContent = doneTasks.toString();
  }

  /**
   * 更新统计面板
   */
  private updateStats(): void {
    if (!this.panelDoc) return;

    let totalTasks = 0;
    const colCounts: { [key: string]: number } = {};

    this.columns.forEach((col) => {
      const taskElements = this.panelDoc!.querySelectorAll(
        `#zoteroplan-${col}List .zoteroplan-task`,
      );
      const count = taskElements.length;
      colCounts[col] = count;
      totalTasks += count;
    });

    // 更新统计数字
    const statTotal = this.panelDoc.getElementById("zoteroplan-stat-total");
    if (statTotal) statTotal.textContent = totalTasks.toString();

    this.columns.forEach((col) => {
      const statEl = this.panelDoc!.getElementById(`zoteroplan-stat-${col}`);
      if (statEl) statEl.textContent = colCounts[col].toString();
    });

    // 更新进度
    const progress =
      totalTasks > 0 ? Math.round((colCounts.done / totalTasks) * 100) : 0;
    const statProgress = this.panelDoc.getElementById(
      "zoteroplan-stat-progress",
    );
    const progressFill = this.panelDoc.getElementById(
      "zoteroplan-progress-fill",
    );

    if (statProgress) statProgress.textContent = `${progress}%`;
    if (progressFill)
      (progressFill as HTMLElement).style.width = `${progress}%`;
  }

  /**
   * 更新周标签
   */
  private updateWeekLabel(): void {
    if (!this.panelDoc) return;

    const weekLabelEl = this.panelDoc.getElementById("zoteroplan-weekLabel");
    const weekNumberEl = this.panelDoc.getElementById("zoteroplan-weekNumber");

    if (weekLabelEl) {
      weekLabelEl.textContent = this.fmtRange(this.currentWeek);
    }

    if (weekNumberEl) {
      weekNumberEl.textContent = `(第 ${this.getWeekNumber(this.currentWeek)} 周)`;
    }
  }

  /**
   * 更新当前日期
   */
  private updateCurrentDate(element: HTMLElement): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    };
    element.textContent = now.toLocaleDateString("zh-CN", options);
  }

  /**
   * 启动时钟
   */
  private startClock(): void {
    if (!this.panelDoc) return;

    const clockEl = this.panelDoc.getElementById("zoteroplan-live-clock");
    if (!clockEl) return;

    const updateClock = () => {
      clockEl.textContent = new Date().toLocaleTimeString("zh-CN", {
        hour12: false,
      });
    };

    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  /**
   * 停止时钟
   */
  public stopClock(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  /**
   * 前往上一周
   */
  private prevWeek(): void {
    const currentTime = this.currentWeek.getTime();
    this.currentWeek = new Date(currentTime - 7 * 24 * 60 * 60 * 1000);
    this.loadForWeek();
  }

  /**
   * 前往下一周
   */
  private nextWeek(): void {
    const currentTime = this.currentWeek.getTime();
    this.currentWeek = new Date(currentTime + 7 * 24 * 60 * 60 * 1000);
    this.loadForWeek();
  }

  /**
   * 返回本周
   */
  private goToToday(): void {
    this.currentWeek = new Date();
    this.loadForWeek();
  }

  /**
   * 清空当前周
   */
  private clearCurrentWeek(): void {
    if (!confirm("确定要清空本周所有任务吗？此操作不可撤销！")) {
      return;
    }

    if (!this.panelDoc) return;

    this.columns.forEach((col) => {
      const listElement = this.panelDoc!.getElementById(
        `zoteroplan-${col}List`,
      );
      if (listElement) {
        listElement.innerHTML = "";
        this.showEmptyState(listElement as HTMLElement);
      }
    });

    this.saveForWeek();
  }

  /**
   * 切换主题
   */
  private toggleTheme(isDark: boolean): void {
    this.userConfig.theme = isDark ? "dark" : "light";
    this.saveUserConfig();

    const container = this.panelDoc?.getElementById(this.panelId);
    if (container) {
      container.setAttribute("data-theme", this.userConfig.theme);
    }
  }

  /**
   * 切换统计面板
   */
  private toggleStats(): void {
    this.showStats = !this.showStats;
    const panel = this.panelDoc?.getElementById("zoteroplan-stats-panel");
    if (panel) {
      (panel as HTMLElement).style.display = this.showStats ? "grid" : "none";
    }
  }

  /**
   * 搜索任务
   */
  private onSearch(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.applySearchFilter();
  }

  /**
   * 应用搜索过滤
   */
  private applySearchFilter(): void {
    if (!this.panelDoc) return;

    this.columns.forEach((col) => {
      const tasks = this.panelDoc!.querySelectorAll(
        `#zoteroplan-${col}List .zoteroplan-task`,
      );
      tasks.forEach((task: Element) => {
        const content = task.querySelector(".zoteroplan-task-content");
        if (content) {
          const text = content.textContent || "";
          const visible =
            !this.searchQuery ||
            text.toLowerCase().indexOf(this.searchQuery) >= 0;
          (task as HTMLElement).style.display = visible ? "" : "none";
        }
      });
    });
  }

  /**
   * 上传头像
   */
  private uploadAvatar(): void {
    // 使用 zotero-plugin-toolkit 的文件选择器
    // 文件选择器功能需要根据Zotero API调整
    // ztoolkit.FilePicker.getFilePath("上传头像", "open", [["图片文件", "*.png;*.jpg;*.jpeg;*.gif"]])
    // 暂时使用默认头像
    this.userConfig.userAvatar = "default-avatar.png";
    this.saveUserConfig();

    // 头像上传功能暂时禁用，等待Zotero API支持
    // 注释掉的文件选择器代码
  }

  /**
   * 编辑用户ID
   */
  private editUserId(): void {
    const newId = prompt("请输入新的用户ID：", this.userConfig.userId);
    if (newId && newId.trim()) {
      this.userConfig.userId = newId.trim();
      this.saveUserConfig();

      const userIdText = this.panelDoc?.getElementById(
        "zoteroplan-user-id-text",
      );
      if (userIdText) {
        userIdText.textContent = this.userConfig.userId;
      }
    }
  }

  /**
   * 编辑格言
   */
  private editMotto(): void {
    const newMotto = prompt("请输入新的格言：", this.userConfig.userMotto);
    if (newMotto && newMotto.trim()) {
      this.userConfig.userMotto = newMotto.trim();
      this.saveUserConfig();

      const mottoEl = this.panelDoc?.getElementById("zoteroplan-user-motto");
      if (mottoEl) {
        mottoEl.textContent = this.userConfig.userMotto;
      }
    }
  }

  /**
   * 获取一周的开始日期
   */
  private startOfWeek(d: Date): Date {
    const date = new Date(d.getTime());
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * 获取周的存储键
   */
  private weekKey(d: Date): string {
    const startDate = this.startOfWeek(d);
    return `extensions.zotero.zoteroplan.week.${startDate.toISOString().slice(0, 10)}`;
  }

  /**
   * 格式化日期范围
   */
  private fmtRange(d: Date): string {
    const start = this.startOfWeek(d);
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);
    return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  }

  /**
   * 获取周数
   */
  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
  }

  /**
   * 显示复制反馈提示
   */
  private showCopyFeedback(
    element: HTMLElement,
    message: string,
    isError: boolean = false,
  ): void {
    if (!this.panelDoc) return;

    // 创建提示元素
    const feedback = this.panelDoc.createElement("div");
    feedback.className = "zoteroplan-copy-feedback";
    feedback.textContent = message;
    feedback.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${isError ? "#fa5252" : "#20c997"};
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      pointer-events: none;
      animation: copyFeedbackPulse 0.6s ease-out;
    `;

    // 添加到任务元素
    const taskElement = element.closest(".zoteroplan-task") as HTMLElement;
    if (taskElement) {
      // 确保父元素是 relative 定位
      const originalPosition = taskElement.style.position;
      taskElement.style.position = "relative";
      taskElement.appendChild(feedback);

      // 600ms 后移除
      setTimeout(() => {
        feedback.remove();
        taskElement.style.position = originalPosition;
      }, 600);
    }
  }
}
