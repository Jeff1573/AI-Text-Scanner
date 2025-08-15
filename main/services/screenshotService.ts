import { desktopCapturer, screen } from "electron";
import type { ScreenSource } from "../types";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('ScreenshotService');

export class ScreenshotService {
  /**
   * 动态计算缩略图尺寸
   * 基于主屏幕分辨率，保持宽高比，并限制最大尺寸
   */
  private static calculateThumbnailSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
    
    // 设置最大缩略图尺寸（避免过大影响性能）
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    // 计算缩放比例，保持宽高比
    const scaleX = maxWidth / screenWidth;
    const scaleY = maxHeight / screenHeight;
    const scale = Math.min(scaleX, scaleY, 1); // 不超过1，避免放大
    
    const thumbnailSize = {
      width: Math.round(screenWidth * scale),
      height: Math.round(screenHeight * scale)
    };
    
    // 开发环境下的调试日志
    if (process.env.NODE_ENV === 'development') {
      logger.debug("屏幕信息", {
        screenResolution: `${screenWidth}x${screenHeight}`,
        thumbnailSize: `${thumbnailSize.width}x${thumbnailSize.height}`,
        scale: scale.toFixed(3)
      });
    }
    
    return thumbnailSize;
  }

  static async captureScreen(): Promise<ScreenSource> {
    const thumbnailSize = this.calculateThumbnailSize();
    
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize,
    });

    if (sources.length === 0) {
      throw new Error("没有找到可用的屏幕");
    }

    return {
      id: sources[0].id,
      name: sources[0].name,
      thumbnail: sources[0].thumbnail.toDataURL(),
    };
  }

  static async captureAllScreens(): Promise<ScreenSource[]> {
    const thumbnailSize = this.calculateThumbnailSize();
    
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize,
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  }

  /**
   * 获取当前计算的缩略图尺寸（用于调试和测试）
   */
  static getCurrentThumbnailSize(): { width: number; height: number } {
    return this.calculateThumbnailSize();
  }
}