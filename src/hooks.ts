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
  const weekPlanManager = new WeekPlanManager();
  // 缓存实例供其他入口复用
  (addon.data as any).weekPlanManager = weekPlanManager;

  // 添加到 Zotero 工具菜单
  const doc = win.document;
  const toolsMenu = doc.getElementById("menu_Tools");
  if (toolsMenu) {
    const menuSeparator = doc.createElement("menuseparator");
    toolsMenu.appendChild(menuSeparator);

    const weekPlanMenuItem = doc.createElement("menuitem");
    weekPlanMenuItem.id = "zoteroplan-menu-item";
    weekPlanMenuItem.setAttribute("label", getString("week-plan-menu"));
    weekPlanMenuItem.setAttribute("accesskey", "P");
    weekPlanMenuItem.addEventListener("command", () => {
      openWeekPlanInTab(win, weekPlanManager);
    });
    toolsMenu.appendChild(weekPlanMenuItem);
  }
}

/**
 * 在独立窗口中打开周计划
 * 使用 Zotero 对话框系统
 */
function openWeekPlanInTab(
  win: Window,
  weekPlanManager: WeekPlanManager,
): void {
  try {
    // 检查是否已经打开
    if ((addon.data as any).weekPlanDialog) {
      (addon.data as any).weekPlanDialog.focus();
      return;
    }

    // 创建对话框窗口
    const dialogData: { [key: string]: any } = {
      weekPlanManager,
      loadCallback: () => {
        ztoolkit.log("周计划窗口加载完成");
      },
    };

    const dialogWindow = win.openDialog(
      `chrome://${addon.data.config.addonRef}/content/weekplan.html`,
      `${addon.data.config.addonRef}-weekplan-window`,
      `chrome,centerscreen,resizable,width=1200,height=800`,
      dialogData,
    ) as Window | null;

    if (!dialogWindow) {
      ztoolkit.log("无法创建对话框窗口");
      return;
    }

    // 保存窗口引用
    (addon.data as any).weekPlanDialog = dialogWindow;

    // 监听窗口关闭
    dialogWindow.addEventListener("unload", () => {
      weekPlanManager.stopClock();
      delete (addon.data as any).weekPlanDialog;
      ztoolkit.log("周计划窗口已关闭");
    });

    // 等待窗口加载完成后注入内容
    dialogWindow.addEventListener("DOMContentLoaded", () => {
      try {
        const doc = dialogWindow.document;
        const appContainer = doc.getElementById("app");

        if (!appContainer) {
          ztoolkit.log("找不到 app 容器");
          return;
        }

        // 创建周计划面板
        const panel = weekPlanManager.createPlanPanel(dialogWindow);
        appContainer.appendChild(panel);

        ztoolkit.log("周计划内容注入成功");
      } catch (e) {
        ztoolkit.log("注入周计划内容时出错：", e);
      }
    });
  } catch (e) {
    ztoolkit.log("打开周计划窗口时出错：", e);
    new ztoolkit.ProgressWindow("周计划看板")
      .createLine({
        text: `打开窗口失败: ${e}`,
        type: "error",
      })
      .show();
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
    `chrome://${addon.data.config.addonRef}/content/icons/weekplan-toolbar.svg`,
  );
  button.addEventListener("command", () => {
    const mgr: WeekPlanManager =
      (addon.data as any).weekPlanManager || new WeekPlanManager();
    (addon.data as any).weekPlanManager = mgr;
    openWeekPlanInTab(win, mgr);
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
