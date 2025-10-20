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
      const configKey = "extensions.zotero.zoteroplan.userConfig";
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
      const configKey = "extensions.zotero.zoteroplan.userConfig";
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

    // 添加任务输入
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

    column.appendChild(header);
    column.appendChild(list);
    column.appendChild(addRow);

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
      const storedData = Zotero.Prefs.get(key, true) as string;
      if (storedData) {
        data = JSON.parse(storedData);
      }
    } catch (e) {
      ztoolkit.log("Error loading week data:", e);
    }

    // 渲染每个列的任务
    this.columns.forEach((col) => {
      const listElement = this.panelDoc!.getElementById(
        `zoteroplan-${col}List`,
      );
      if (!listElement) return;

      listElement.innerHTML = "";
      const tasksForColumn = (data[col] || []).filter(Boolean);

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
    if (!this.panelDoc || !this.userConfig.autoSave) return;

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
      Zotero.Prefs.set(key, JSON.stringify(data), true);
    } catch (e) {
      ztoolkit.log("Error saving week data:", e);
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
    // 关键：设置任务元素可拖拽
    taskElement.setAttribute("draggable", "true");

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

    // 添加拖拽手柄
    const dragHandle = this.panelDoc.createElement("div");
    dragHandle.className = "zoteroplan-task-drag-handle";
    dragHandle.innerHTML = "⋮";
    dragHandle.title = "拖拽移动任务";
    taskElement.appendChild(dragHandle);

    // 任务内容
    const content = this.panelDoc.createElement("div");
    content.className = "zoteroplan-task-content";
    content.textContent = taskData.text || "";
    content.contentEditable = "true";
    content.setAttribute("spellcheck", "false");
    content.setAttribute("draggable", "false"); // 禁止内容区域拖拽
    content.addEventListener("blur", () => this.saveForWeek());

    // 阻止内容区域的拖拽事件冒泡
    content.addEventListener(
      "dragstart",
      (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
      },
      true,
    );

    // 双击复制任务内容
    content.addEventListener("dblclick", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      const text = content.textContent?.trim() || "";
      if (!text) return;

      try {
        const clipboardHelper = (Components.classes as any)[
          "@mozilla.org/widget/clipboardhelper;1"
        ].getService((Components.interfaces as any).nsIClipboardHelper);
        clipboardHelper.copyString(text);

        // 选中全部文本
        const selection = this.panelDoc!.defaultView?.getSelection();
        const range = this.panelDoc!.createRange();
        range.selectNodeContents(content);
        selection?.removeAllRanges();
        selection?.addRange(range);

        ztoolkit.log("任务内容已复制:", text);
      } catch (err) {
        ztoolkit.log("复制失败:", err);
      }
    });

    // Enter键保存并退出编辑，Shift+Enter换行
    content.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        content.blur();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        content.textContent = taskData.text || "";
        content.blur();
      }
    });

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

    // 不再在这里添加拖拽事件监听器
    // 所有拖拽事件通过 addEventListeners() 中的事件委托统一处理

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
   * 添加拖拽相关事件监听器 - 使用事件委托模式
   */
  private addEventListeners(): void {
    if (!this.panelDoc) return;

    const board = this.panelDoc.getElementById("zoteroplan-board");
    if (!board) {
      ztoolkit.log("找不到看板元素");
      return;
    }

    // 拖拽状态管理
    let draggedEl: HTMLElement | null = null;
    const dropIndicator = this.panelDoc.createElement("div");
    dropIndicator.className = "zoteroplan-drop-indicator";

    // 事件：dragstart - 使用捕获阶段
    board.addEventListener(
      "dragstart",
      (e: Event) => {
        const dragEvent = e as DragEvent;
        const target = dragEvent.target as HTMLElement;

        // 确认是任务元素
        if (!target || !target.classList.contains("zoteroplan-task")) {
          ztoolkit.log("拖拽的不是任务元素", target);
          return;
        }

        draggedEl = target;
        draggedEl.classList.add("dragging", "zoteroplan-task-dragging"); // 添加两个类名保证兼容

        // 设置拖拽数据
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = "move";
          dragEvent.dataTransfer.setData(
            "text/plain",
            draggedEl.dataset.id || "",
          );
          try {
            dragEvent.dataTransfer.setDragImage(draggedEl, 20, 20);
          } catch (err) {
            // 忽略错误
          }
        }

        ztoolkit.log("开始拖拽任务:", draggedEl.dataset.id);
      },
      true,
    ); // 捕获阶段

    // 事件：dragend - 清理拖拽状态
    board.addEventListener(
      "dragend",
      (e: Event) => {
        ztoolkit.log("拖拽结束");

        if (draggedEl) {
          draggedEl.classList.remove("dragging", "zoteroplan-task-dragging");
          draggedEl = null;
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
      },
      true,
    ); // 捕获阶段

    // 事件：dragover - 显示放置指示器
    board.addEventListener(
      "dragover",
      (e: DragEvent) => {
        // 关键：始终 preventDefault
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "move";
        }

        if (!draggedEl) {
          return;
        }

        // 找到目标列表
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
      },
      true,
    ); // 捕获阶段

    // 事件：drop - 执行放置操作
    board.addEventListener(
      "drop",
      (e: DragEvent) => {
        // 关键：必须 preventDefault
        e.preventDefault();
        e.stopPropagation();

        ztoolkit.log("执行放置操作");

        if (!draggedEl) {
          ztoolkit.log("没有拖拽元素");
          return;
        }

        // 找到目标列表
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

        // 执行放置
        if (dropIndicator.parentNode === targetList) {
          targetList.insertBefore(draggedEl, dropIndicator);
        } else {
          targetList.appendChild(draggedEl);
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
      },
      true,
    ); // 捕获阶段
  }

  /**
   * 获取拖拽元素应该放置在哪个元素之后
   */
  // 更智能的定位：
  // - 返回元素: 在该元素前插入
  // - 返回 undefined: 插入到列表顶部
  // - 返回 null: 插入到列表底部
  private getDragAfterElement(
    container: Element,
    y: number,
  ): Element | null | undefined {
    const candidates: Element[] = Array.from(
      container.querySelectorAll(
        ".zoteroplan-task:not(.zoteroplan-task-dragging)",
      ),
    );
    const listRect = container.getBoundingClientRect();

    if (candidates.length === 0) {
      // 空列表：根据鼠标在上半/下半返回不同标记
      const mid = listRect.top + listRect.height / 2;
      return y < mid ? undefined : null;
    }

    // 顶部/底部缓冲区域，减少误触
    const topBuffer = listRect.top + listRect.height * 0.15;
    const bottomBuffer = listRect.bottom - listRect.height * 0.05;
    if (y < topBuffer) return candidates[0];
    if (y > bottomBuffer) return null;

    // 在任务间查找最近的插入点
    for (let i = 0; i < candidates.length; i++) {
      const box = (candidates[i] as HTMLElement).getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0) return candidates[i];
    }

    // 默认放在末尾
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
}
