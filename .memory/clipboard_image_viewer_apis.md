# 剪贴板图片预览功能相关文档记录

> 记录本次实现中用到的核心库/API 的官方文档入口与版本信息，后续复用时优先参考。

## React

- name: React
- chosen_version: 18.2.0（来自当前项目 package.json）
- doc_url: https://react.dev
- last_updated: 参考 React 18.2.0 发布（以官方博客与 Release Notes 为准）
- 主要使用点：
  - 函数组件与 JSX
  - `useState` / `useEffect` / `useCallback` 等基础 Hook

## Electron

- name: Electron
- chosen_version: 37.2.4（来自当前项目 devDependencies）
- doc_url: https://www.electronjs.org/docs/latest
- last_updated: 以 Electron 官方 Release Notes 为准
- 主要使用点：
  - `BrowserWindow`：创建截图预览窗口，动态设置窗口大小以匹配图片尺寸。
  - `nativeImage`：从 data URL 创建图片对象并获取宽高信息。
  - `ipcMain.handle` / `ipcRenderer.invoke`：主进程与渲染进程之间的 IPC 通信。
  - `contextBridge.exposeInMainWorld`：在 `preload` 中暴露安全的 `electronAPI`。

## Web Clipboard API（浏览器剪贴板 API）

- name: Clipboard API
- chosen_version: 基于浏览器实现（以标准规范为准）
- doc_url: https://developer.mozilla.org/docs/Web/API/Clipboard
- last_updated: 以 MDN 文档更新为准
- 主要使用点：
  - `navigator.clipboard.write()`：写入剪贴板内容。
  - `ClipboardItem`：封装图片 Blob，作为剪贴板项目写入。

