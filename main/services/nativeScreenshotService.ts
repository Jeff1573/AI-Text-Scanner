/**
 * 原生截图服务（使用系统原生截图工具）
 *
 * macOS: 使用 screencapture 命令
 * Windows: 使用 ms-screenclip 协议或 Snipping Tool
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { app, clipboard } from "electron";
import { createModuleLogger } from "../utils/logger";

const execAsync = promisify(exec);
const logger = createModuleLogger('NativeScreenshotService');

export class NativeScreenshotService {
  // 用于取消当前截图等待的控制器
  private static currentAbortController: AbortController | null = null;
  /**
   * 使用系统原生截图工具进行交互式截图
   *
   * macOS: 使用 screencapture -i 命令
   * Windows: 使用 ms-screenclip 协议，监听剪贴板获取结果
   *
   * @returns {Promise<string>} 截图文件的路径
   */
  static async captureInteractive(): Promise<string> {
    if (process.platform === "darwin") {
      return this.captureMacOS();
    } else if (process.platform === "win32") {
      return this.captureWindows();
    } else {
      throw new Error("原生截图功能仅支持 macOS 和 Windows");
    }
  }

  /**
   * macOS 截图实现
   */
  private static async captureMacOS(): Promise<string> {
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    logger.info("启动 macOS 原生截图", { filepath });

    try {
      await execAsync(`screencapture -i -x "${filepath}"`);

      if (!fs.existsSync(filepath)) {
        throw new Error("用户取消了截图或截图失败");
      }

      const stats = fs.statSync(filepath);
      logger.info("macOS 截图成功", {
        filepath,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      });

      return filepath;
    } catch (error) {
      logger.error("macOS 截图失败", { error });
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  /**
   * 取消当前正在进行的截图等待
   */
  static cancelCurrentCapture(): void {
    if (this.currentAbortController) {
      logger.info("取消当前截图等待");
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Windows 截图实现（使用原生截图工具 + 剪贴板监听）
   */
  private static async captureWindows(): Promise<string> {
    logger.info("启动 Windows 原生截图工具");

    // 取消之前的截图等待（如果存在）
    this.cancelCurrentCapture();

    // 创建新的 AbortController
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    try {
      // 获取截图前的剪贴板图片（用于对比）
      const beforeImage = clipboard.readImage();
      const beforeHash = beforeImage.isEmpty() ? null : beforeImage.toDataURL();

      // 启动 Windows 截图工具
      await execAsync('start ms-screenclip:');

      // 等待用户完成截图（轮询剪贴板）
      const maxWaitTime = 60000; // 最多等待 60 秒（足够长，因为可以被中断）
      const pollInterval = 100; // 每 100ms 检查一次
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        // 检查是否被中断
        if (signal.aborted) {
          logger.info("截图等待被中断", { waitTime: Date.now() - startTime });
          throw new Error("用户取消了截图");
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const currentImage = clipboard.readImage();
        if (!currentImage.isEmpty()) {
          const currentHash = currentImage.toDataURL();

          // 检查剪贴板图片是否发生变化
          if (currentHash !== beforeHash) {
            // 保存截图到文件
            const buffer = currentImage.toPNG();
            fs.writeFileSync(filepath, buffer);

            const stats = fs.statSync(filepath);
            logger.info("Windows 截图成功", {
              filepath,
              size: stats.size,
              sizeKB: Math.round(stats.size / 1024),
              waitTime: Date.now() - startTime
            });

            // 清除 AbortController
            this.currentAbortController = null;
            return filepath;
          }
        }
      }

      // 超时后抛出错误
      logger.info("Windows 截图等待超时", { waitTime: Date.now() - startTime });
      this.currentAbortController = null;
      throw new Error("用户取消了截图");
    } catch (error) {
      logger.error("Windows 截图失败", { error });
      this.currentAbortController = null;
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  /**
   * 使用系统原生截图工具进行全屏截图
   * 
   * @returns {Promise<string>} 截图文件的路径
   */
  static async captureFullScreen(): Promise<string> {
    if (process.platform !== "darwin") {
      throw new Error("原生截图功能仅支持 macOS");
    }

    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    logger.info("启动原生全屏截图", { filepath });

    try {
      // -x: 不播放声音
      await execAsync(`screencapture -x "${filepath}"`);

      if (!fs.existsSync(filepath)) {
        throw new Error("截图失败");
      }

      const stats = fs.statSync(filepath);
      logger.info("全屏截图成功", { 
        filepath, 
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024) 
      });

      return filepath;
    } catch (error) {
      logger.error("原生全屏截图失败", { error });
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      
      throw error;
    }
  }

  /**
   * 读取截图文件并转换为 base64 data URL
   * 
   * @param {string} filepath - 截图文件路径
   * @returns {Promise<string>} base64 编码的 data URL
   */
  static async readScreenshotAsDataURL(filepath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filepath);
      const base64 = buffer.toString('base64');
      const dataURL = `data:image/png;base64,${base64}`;
      
      logger.debug("截图已转换为 data URL", { 
        filepath,
        dataURLLength: dataURL.length 
      });
      
      return dataURL;
    } catch (error) {
      logger.error("读取截图文件失败", { filepath, error });
      throw error;
    }
  }

  /**
   * 清理临时截图文件
   * 
   * @param {string} filepath - 要删除的文件路径
   */
  static cleanupScreenshot(filepath: string): void {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.debug("临时截图已清理", { filepath });
      }
    } catch (error) {
      logger.warn("清理临时截图失败", { filepath, error });
    }
  }

  /**
   * 检查原生截图工具是否可用
   *
   * @returns {Promise<boolean>} 是否可用
   */
  static async isAvailable(): Promise<boolean> {
    if (process.platform === "darwin") {
      try {
        await execAsync('which screencapture');
        logger.info("macOS screencapture 命令可用");
        return true;
      } catch (error) {
        logger.warn("macOS screencapture 命令不可用", { error });
        return false;
      }
    } else if (process.platform === "win32") {
      // Windows 10+ 都支持 ms-screenclip 协议
      logger.info("Windows 原生截图工具可用");
      return true;
    }

    return false;
  }
}




