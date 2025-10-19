import path from "node:path";
import fs from "node:fs";

/**
 * 判断路径是否存在
 */
function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * 获取跨平台的主窗口图标路径（BrowserWindow.icon）。
 * - Windows: .ico
 * - macOS: .icns（若无则使用 512 PNG）
 * - Linux: 512 PNG
 * @returns 图标文件的绝对路径（若找不到则返回旧的 ico 路径以保持兼容）
 */
export function getAppIconPath(): string {
  const cwd = process.cwd();
  const fromBuild = {
    darwin: [
      path.join(cwd, "build/icons/app-icon.icns"),
      path.join(cwd, "build/icons/icon_512.png"),
    ],
    win32: [path.join(cwd, "build/icons/app-icon.ico")],
    linux: [path.join(cwd, "build/icons/icon_512.png")],
  } as const;

  const fromStatic = [
    path.join(__dirname, "./static/icons8-camera-256.icns"),
    path.join(__dirname, "./static/icons8-camera-256.png"),
    path.join(__dirname, "./static/icons8-camera-256.ico"),
  ];

  const platform = process.platform as "darwin" | "win32" | "linux" | string;
  const candidates: string[] = [];
  if (platform === "darwin") candidates.push(...fromBuild.darwin);
  else if (platform === "win32") candidates.push(...fromBuild.win32);
  else if (platform === "linux") candidates.push(...fromBuild.linux);
  candidates.push(...fromStatic);

  for (const p of candidates) {
    if (fileExists(p)) return p;
  }
  // 回退：旧文件（尽量不报错）
  return path.join(__dirname, "./static/icons8-camera-256.ico");
}

/**
 * 获取 macOS Dock 使用的图标路径。
 * 优先使用生成的 .icns，其次使用 512 PNG；若都不存在返回空字符串。
 */
export function getDockIconPath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "build/icons/app-icon.icns"),
    path.join(cwd, "build/icons/icon_512.png"),
    path.join(__dirname, "./static/icons8-camera-256.icns"),
    path.join(__dirname, "./static/icons8-camera-256.png"),
  ];
  for (const p of candidates) {
    if (fileExists(p)) return p;
  }
  return "";
}

/**
 * 获取系统托盘图标路径。
 * macOS 托盘使用小尺寸图标（推荐 32x32 以支持 Retina），由系统自动缩放。
 * Windows/Linux 可以使用较大尺寸的图标。
 * @returns 托盘图标的绝对路径
 */
export function getTrayIconPath(): string {
  const cwd = process.cwd();
  const platform = process.platform;

  const candidates: string[] = [];

  if (platform === "darwin") {
    // macOS 托盘使用较大尺寸图标（64px 或 128px）以保持清晰度
    // 系统会自动缩放到托盘尺寸，大尺寸缩小比小尺寸放大更清晰
    candidates.push(
      // path.join(cwd, "build/icons/icon_16.png"),
      // path.join(cwd, "build/icons/app-icon-b.svg"),
      path.join(cwd, "build/icons/icon_24.png"),
    );
  } else if (platform === "win32") {
    // Windows 托盘图标
    candidates.push(
      path.join(cwd, "build/icons/app-icon.ico"),
      path.join(__dirname, "./static/icons8-camera-256.ico"),
    );
  } else {
    // Linux 托盘图标
    candidates.push(
      path.join(cwd, "build/icons/icon_128.png"),
      path.join(cwd, "build/icons/icon_64.png"),
    );
  }

  // 通用回退选项
  candidates.push(
    path.join(cwd, "build/icons/app-icon.icns"),
    path.join(cwd, "build/icons/icon_512.png"),
    path.join(__dirname, "./static/icons8-camera-256.ico"),
  );

  for (const p of candidates) {
    if (fileExists(p)) return p;
  }

  // 最后的回退
  return path.join(cwd, "build/icons/icon_128.png");
}
