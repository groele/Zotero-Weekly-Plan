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

  // @ts-ignore - Zotero specific API
  win.MozXULElement.insertFTLIfNeeded(
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

  // 添加到Zotero工具栏
  const toolsMenu = doc.getElementById("menu_Tools");
  if (toolsMenu) {
    const menuSeparator = doc.createElement("menuseparator");
    toolsMenu.appendChild(menuSeparator);

    const weekPlanMenuItem = doc.createElement("menuitem");
    weekPlanMenuItem.id = "zoteroplan-menu-item";
    weekPlanMenuItem.setAttribute("label", "周计划");
    weekPlanMenuItem.setAttribute("accesskey", "P");
    weekPlanMenuItem.addEventListener("command", () => {
      openWeekPlanTab(win, weekPlanManager);
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
      tab.setAttribute("label", "计划板");
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
  }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
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
