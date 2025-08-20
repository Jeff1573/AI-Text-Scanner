import path from "node:path";

/**
 * 获取应用程序图标路径
 * @returns 图标文件的绝对路径
 */
export function getAppIconPath(): string {
  return path.join(__dirname, "./static/icons8-camera-256.ico");
}

/**
 * 获取应用程序图标路径（相对于主进程目录）
 * @returns 图标文件的绝对路径
 */
export function getAppIconPathFromMain(): string {
  return path.join(__dirname, "../static/icons8-camera-256.ico");
}
