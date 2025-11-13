/**
 * 原生截图服务（使用 macOS screencapture 命令）
 * 
 * 这个服务使用 macOS 原生的 screencapture 工具，比 Electron 的 desktopCapturer 更可靠。
 * 权限管理也更简单直观。
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { createModuleLogger } from "../utils/logger";

const execAsync = promisify(exec);
const logger = createModuleLogger('NativeScreenshotService');

export class NativeScreenshotService {
  /**
   * 使用系统原生截图工具进行交互式截图
   * 
   * 在 macOS 上使用 screencapture -i 命令，会弹出系统的截图选择界面。
   * 这是最可靠的方式，因为直接使用系统工具，不受 Electron 权限限制。
   * 
   * @returns {Promise<string>} 截图文件的路径
   */
  static async captureInteractive(): Promise<string> {
    if (process.platform !== "darwin") {
      throw new Error("原生截图功能仅支持 macOS");
    }

    // 创建临时文件路径
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    logger.info("启动原生交互式截图", { filepath });

    try {
      // 使用 screencapture -i 命令进行交互式截图
      // -i: 交互模式，让用户选择区域
      // -s: 静默模式，不播放快门音
      // -x: 不播放声音
      await execAsync(`screencapture -i -x "${filepath}"`);

      // 检查文件是否创建成功
      if (!fs.existsSync(filepath)) {
        throw new Error("用户取消了截图或截图失败");
      }

      const stats = fs.statSync(filepath);
      logger.info("截图成功", { 
        filepath, 
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024) 
      });

      return filepath;
    } catch (error) {
      logger.error("原生截图失败", { error });
      
      // 清理可能残留的文件
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
   * 检查 screencapture 命令是否可用
   * 
   * @returns {Promise<boolean>} 是否可用
   */
  static async isAvailable(): Promise<boolean> {
    if (process.platform !== "darwin") {
      return false;
    }

    try {
      await execAsync('which screencapture');
      logger.info("screencapture 命令可用");
      return true;
    } catch (error) {
      logger.warn("screencapture 命令不可用", { error });
      return false;
    }
  }
}




