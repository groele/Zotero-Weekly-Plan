import { getString, initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";
import { WeekPlanManager } from "./modules/weekPlan";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  await Promise.all(
    Zotero.getMainWindows().map((win: Window) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  (win as any).MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });

  // 注册周计划功能
  registerWeekPlanPanel(win);

  // 注册主工具栏按钮
  registerMainToolbarButton(win);

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);

  // Examples removed
}

/**
 * 注册周计划面板
 */
function registerWeekPlanPanel(win: Window): void {
  const doc = win.document;
  const weekPlanManager = new WeekPlanManager();
  // 缓存实例供其他入口复用
  (addon.data as any).weekPlanManager = weekPlanManager;

  // 添加到Zotero工具栏
  const toolsMenu = doc.getElementById("menu_Tools");
  if (toolsMenu) {
    const menuSeparator = doc.createElement("menuseparator");
    toolsMenu.appendChild(menuSeparator);

    const weekPlanMenuItem = doc.createElement("menuitem");
    weekPlanMenuItem.id = "zoteroplan-menu-item";
    weekPlanMenuItem.setAttribute("label", getString("week-plan-menu"));
    weekPlanMenuItem.setAttribute("accesskey", "P");
    weekPlanMenuItem.addEventListener("command", () => {
      openWeekPlanZoteroTab(win, weekPlanManager);
    });
    toolsMenu.appendChild(weekPlanMenuItem);
  }

  // 添加到Zotero右侧面板
  const tabbox = doc.getElementById("zotero-item-pane-tabbox");
  if (tabbox) {
    const tabs = doc.getElementById("zotero-item-pane-tabs");
    const tabpanels = doc.getElementById("zotero-item-pane-tabpanels");

    if (tabs && tabpanels) {
      // 创建标签页
      const tab = doc.createElement("tab");
      tab.id = "zoteroplan-tab";
      tab.setAttribute("label", getString("week-plan-tab"));
      tabs.appendChild(tab);

      // 创建标签面板
      const tabpanel = doc.createElement("tabpanel");
      tabpanel.id = "zoteroplan-tabpanel";
      tabpanel.appendChild(weekPlanManager.createPlanPanel(win));
      tabpanels.appendChild(tabpanel);
    }
  }
}

/**
 * 打开周计划面板(在当前窗口显示)
 */
function openWeekPlanTab(win: Window, weekPlanManager: WeekPlanManager): void {
  const doc = win.document;

  // 检查是否已存在
  let overlay = doc.getElementById("zoteroplan-overlay");
  if (overlay) {
    (overlay as HTMLElement).style.display = "flex";
    return;
  }

  // 创建遮罩层
  overlay = doc.createElement("div");
  overlay.id = "zoteroplan-overlay";
  (overlay as HTMLElement).style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // 创建内容容器
  const container = doc.createElement("div");
  (container as HTMLElement).style.cssText = `
    background: white;
    width: 90%;
    height: 90%;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  `;

  // 添加关闭按钮
  const closeBtn = doc.createElement("button");
  closeBtn.textContent = "×";
  (closeBtn as HTMLElement).style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: #e03131;
    color: white;
    border: none;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    font-size: 24px;
    cursor: pointer;
    z-index: 10001;
  `;
  closeBtn.addEventListener("click", () => {
    (overlay as HTMLElement).style.display = "none";
  });

  // 添加面板
  container.appendChild(weekPlanManager.createPlanPanel(win));
  container.appendChild(closeBtn);
  overlay.appendChild(container);
  if (doc.body) {
    doc.body.appendChild(overlay);
  } else {
    doc.documentElement?.appendChild(overlay);
  }
}

/**
 * 在Zotero的主标签页系统中打开一个内部标签，类似PDF阅读器
 */
function openWeekPlanZoteroTab(
  win: Window,
  weekPlanManager: WeekPlanManager,
): void {
  const Tabs: any =
    (win as any).Zotero_Tabs || ztoolkit.getGlobal("Zotero_Tabs");
  if (!Tabs) {
    // 回退到覆盖层方式
    openWeekPlanTab(win, weekPlanManager);
    return;
  }

  const tabId = (addon.data as any).weekPlanTabId || "zoteroplan-tab-internal";
  // 若已存在同名标签，则直接选中
  try {
    if (Tabs.getById && Tabs.getById(tabId)) {
      Tabs.select(tabId);
      return;
    }
  } catch (e) {
    ztoolkit.log(e);
  }

  const title = getString("week-plan-title");
  const icon = `chrome://${addon.data.config.addonRef}/content/icons/icon.svg`;
  const htmlUrl = `chrome://${addon.data.config.addonRef}/content/weekplan.html`;

  // 创建一个空白浏览器标签，然后注入我们的面板
  try {
    Tabs.add({
      id: tabId,
      type: "browser",
      title,
      icon,
      url: htmlUrl,
      select: true,
    });
    (addon.data as any).weekPlanTabId = tabId;

    const inject = () => {
      try {
        const tab = Tabs.getById ? Tabs.getById(tabId) : undefined;
        const browser: any = tab?.browser || tab?.panel || tab?.iframe;
        const doc = (browser?.contentDocument || browser?.document) as
          | Document
          | undefined;
        if (!doc) {
          win.setTimeout(inject, 50);
          return;
        }
        const mount = doc.getElementById("app") || doc.body;
        if (!mount) return;
        const panel = weekPlanManager.createPlanPanel(win);
        (mount as HTMLElement).appendChild(panel);
      } catch (e) {
        ztoolkit.log(e);
        win.setTimeout(inject, 50);
      }
    };
    // 延迟注入，等待Zotero完成tab创建
    win.setTimeout(inject, 0);
  } catch (e) {
    ztoolkit.log(e);
    // 兜底：使用覆盖层方式
    openWeekPlanTab(win, weekPlanManager);
  }
}

/**
 * 打开独立对话框窗口 - 支持全屏、最小化
 */
function openWeekPlanDialog(
  win: Window,
  weekPlanManager: WeekPlanManager,
): void {
  // 检查是否已存在窗口
  const existingDialog = (addon.data as any).weekPlanDialog;
  if (existingDialog && !existingDialog.closed) {
    existingDialog.focus();
    return;
  }

  const dialogFeatures = [
    "chrome=yes",
    "titlebar=yes",
    "toolbar=no",
    "menubar=no",
    "location=no",
    "resizable=yes",
    "centerscreen=yes",
    "width=1400",
    "height=900",
    "minimizable=yes",
    "maximizable=yes",
    "dialog=no", // 非模态对话框，可以全屏
  ].join(",");

  const dialogURL = `chrome://${addon.data.config.addonRef}/content/weekplan.html`;

  try {
    const dialog = win.openDialog(
      dialogURL,
      "zoteroplan-window",
      dialogFeatures,
    );

    if (!dialog) {
      ztoolkit.log("无法创建对话框");
      return;
    }

    // 保存窗口引用
    (addon.data as any).weekPlanDialog = dialog;

    // 等待窗口加载完成
    dialog.addEventListener("load", () => {
      try {
        const dialogDoc = dialog.document;
        if (!dialogDoc) return;

        // 设置窗口标题
        dialogDoc.title = getString("week-plan-title");

        // 注入面板
        const mount = dialogDoc.getElementById("app") || dialogDoc.body;
        if (mount) {
          const panel = weekPlanManager.createPlanPanel(dialog);
          (mount as HTMLElement).appendChild(panel);

          // 添加窗口控制按钮
          addWindowControls(dialogDoc, dialog);
        }
      } catch (e) {
        ztoolkit.log("注入面板失败:", e);
      }
    });

    // 窗口关闭时清理
    dialog.addEventListener("unload", () => {
      (addon.data as any).weekPlanDialog = null;
      if (weekPlanManager) {
        weekPlanManager.stopClock();
      }
    });
  } catch (e) {
    ztoolkit.log("打开对话框失败:", e);
  }
}

/**
 * 添加窗口控制按钮（全屏、最小化、关闭）
 */
function addWindowControls(doc: Document, win: Window): void {
  const container = doc.getElementById("app") || doc.body;
  if (!container) return;

  const controlsBar = doc.createElement("div");
  controlsBar.className = "zoteroplan-window-controls";
  controlsBar.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    display: flex;
    gap: 8px;
    background: var(--wp-card-bg);
    padding: 8px;
    border-radius: 8px;
    box-shadow: var(--wp-shadow-md);
    border: 1px solid var(--wp-border-color);
  `;

  // 全屏按钮
  const fullscreenBtn = createControlButton(
    doc,
    "⛶",
    "全屏 / Fullscreen",
    () => {
      try {
        if (!doc.fullscreenElement) {
          doc.documentElement?.requestFullscreen();
          fullscreenBtn.textContent = "❏";
        } else {
          doc.exitFullscreen();
          fullscreenBtn.textContent = "⛶";
        }
      } catch (e) {
        ztoolkit.log("全屏切换失败:", e);
      }
    },
  );

  // 最小化按钮
  const minimizeBtn = createControlButton(
    doc,
    "─",
    "最小化 / Minimize",
    () => {
      try {
        win.minimize();
      } catch (e) {
        ztoolkit.log("最小化失败:", e);
      }
    },
  );

  // 关闭按钮
  const closeBtn = createControlButton(
    doc,
    "×",
    "关闭 / Close",
    () => {
      win.close();
    },
  );
  closeBtn.style.color = "var(--wp-danger)";

  controlsBar.appendChild(fullscreenBtn);
  controlsBar.appendChild(minimizeBtn);
  controlsBar.appendChild(closeBtn);

  (container as HTMLElement).insertBefore(
    controlsBar,
    container.firstChild,
  );
}

/**
 * 创建控制按钮
 */
function createControlButton(
  doc: Document,
  text: string,
  title: string,
  onclick: () => void,
): HTMLElement {
  const btn = doc.createElement("button");
  btn.textContent = text;
  btn.title = title;
  btn.style.cssText = `
    background: transparent;
    border: 1px solid var(--wp-border-color);
    color: var(--wp-text-main);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms;
  `;
  btn.addEventListener("click", onclick);
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "var(--wp-info-light)";
    btn.style.borderColor = "var(--wp-accent)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent";
    btn.style.borderColor = "var(--wp-border-color)";
  });
  return btn;
}

/**
 * 在主窗口工具栏添加WeekPlan按钮
 */
function registerMainToolbarButton(win: Window): void {
  const doc = win.document;
  // 优先选择主工具栏，其次是条目工具栏
  const toolbar =
    doc.getElementById("zotero-toolbar") ||
    doc.getElementById("zotero-items-toolbar");
  if (!toolbar) return;

  // 已存在则跳过
  if (doc.getElementById("zoteroplan-toolbarbutton")) return;

  // 使用XUL元素创建按钮，确保图标按平台样式显示
  const button =
    (doc as any).createXULElement?.("toolbarbutton") ||
    doc.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      "toolbarbutton",
    );
  button.id = "zoteroplan-toolbarbutton";
  button.classList.add("toolbarbutton-1", "chromeclass-toolbar-additional");
  button.setAttribute("label", getString("week-plan-menu"));
  button.setAttribute("tooltiptext", getString("week-plan-title"));
  button.setAttribute("type", "button");
  button.setAttribute(
    "image",
    `chrome://${addon.data.config.addonRef}/content/icons/toolbar-icon.svg`,
  );
  button.addEventListener("command", () => {
    const mgr: WeekPlanManager =
      (addon.data as any).weekPlanManager || new WeekPlanManager();
    (addon.data as any).weekPlanManager = mgr;
    // 使用独立窗口模式
    openWeekPlanDialog(win, mgr);
  });

  toolbar.appendChild(button);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  try {
    const mgr: WeekPlanManager | undefined = (addon.data as any)
      .weekPlanManager;
    if (mgr) mgr.stopClock();
  } catch (e) {
    ztoolkit.log(e);
  }
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  try {
    const mgr: WeekPlanManager | undefined = (addon.data as any)
      .weekPlanManager;
    if (mgr) mgr.stopClock();
  } catch (e) {
    ztoolkit.log(e);
  }
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // Keep minimal notify logging for debugging
  ztoolkit.log("notify", event, type, ids, extraData);
  return;
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
// Preferences, shortcuts, and example dialogs removed

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
};
