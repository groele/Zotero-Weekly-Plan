declare const _globalThis: {
  [key: string]: any;
  Zotero: any;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

// 全局变量声明 - 使用 any 类型以避免编译错误
declare const Zotero: any;
declare const ztoolkit: ZToolkit;
declare const rootURI: string;
declare const addon: import("../src/addon").default;
declare const __env__: "production" | "development";

// DOM 相关类型扩展
interface Window {
  MozXULElement?: any;
}

// 全局函数声明
declare function confirm(message?: string): boolean;
declare function prompt(message?: string, _default?: string): string | null;
