import { desktopCapturer, screen } from "electron";
import type { ScreenSource } from "../types";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('ScreenshotService');

export class ScreenshotService {
  /**
   * 动态计算缩略图尺寸
   * 使用实际屏幕分辨率，考虑设备像素比以支持高DPI屏幕
   */
  private static calculateThumbnailSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor; // 获取设备像素比
    
    // 使用实际物理像素分辨率（逻辑分辨率 × 缩放因子）
    // 这样可以在高DPI屏幕（如Retina）上获得清晰的截图
    const thumbnailSize = {
      width: Math.round(screenWidth * scaleFactor),
      height: Math.round(screenHeight * scaleFactor)
    };
    
    logger.debug("屏幕信息", {
      logicalResolution: `${screenWidth}x${screenHeight}`,
      scaleFactor: scaleFactor,
      physicalResolution: `${thumbnailSize.width}x${thumbnailSize.height}`
    });
    
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