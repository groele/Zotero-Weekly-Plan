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
 * 打开周计划窗口 - 统一使用独立对话框
 */
function openWeekPlanZoteroTab(
  win: Window,
  weekPlanManager: WeekPlanManager,
): void {
  // 直接使用独立对话框窗口，避免窗口控制重复问题
  openWeekPlanDialog(win, weekPlanManager);
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

          // 不添加自定义窗口控制按钮，使用系统原生的窗口控制
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
