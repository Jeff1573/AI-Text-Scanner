import { desktopCapturer, screen } from "electron";
import type { ScreenSource } from "../types";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('ScreenshotService');

export class ScreenshotService {
  /**
   * 动态计算缩略图尺寸（优化版）
   * 
   * 平衡清晰度和性能：
   * - 使用逻辑分辨率（不乘以 scaleFactor）
   * - 对于超高分辨率屏幕，限制最大尺寸
   * - 这样可以避免巨大的图片导致性能问题
   */
  private static calculateThumbnailSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor;
    
    // 使用逻辑分辨率，不乘以 scaleFactor
    // 这样 1920x1080 的屏幕就是 1920x1080，而不是更大的物理分辨率
    let width = screenWidth;
    let height = screenHeight;
    
    // 对于超大屏幕（如 4K），限制最大尺寸以提升性能
    const MAX_DIMENSION = 2560; // 最大边长
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      logger.info("屏幕尺寸过大，缩小截图尺寸", {
        original: `${screenWidth}x${screenHeight}`,
        scaled: `${width}x${height}`
      });
    }
    
    logger.debug("屏幕信息（优化后）", {
      logicalResolution: `${screenWidth}x${screenHeight}`,
      scaleFactor: scaleFactor,
      thumbnailSize: `${width}x${height}`,
      estimatedSizeMB: ((width * height * 4) / 1024 / 1024).toFixed(2)
    });
    
    return { width, height };
  }

  static async captureScreen(): Promise<ScreenSource> {
    const thumbnailSize = this.calculateThumbnailSize();
    
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize,
      });

      if (sources.length === 0) {
        throw new Error("没有找到可用的屏幕");
      }

      logger.info("截图成功");
      
      return {
        id: sources[0].id,
        name: sources[0].name,
        thumbnail: sources[0].thumbnail.toDataURL(),
      };
    } catch (error) {
      logger.error("截图失败", { error });
      throw error;
    }
  }

  static async captureAllScreens(): Promise<ScreenSource[]> {
    const thumbnailSize = this.calculateThumbnailSize();
    
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize,
      });

      logger.info("截取所有屏幕成功", { count: sources.length });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
    } catch (error) {
      logger.error("截取所有屏幕失败", { error });
      throw error;
    }
  }

  /**
   * 获取当前计算的缩略图尺寸（用于调试和测试）
   */
  static getCurrentThumbnailSize(): { width: number; height: number } {
    return this.calculateThumbnailSize();
  }
}