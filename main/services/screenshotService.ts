import { desktopCapturer, screen } from "electron";
import type { ScreenSource } from "../types";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('ScreenshotService');

export class ScreenshotService {
  /**
   * 计算缩略图尺寸
   * 
   * 默认：使用物理分辨率（size * scaleFactor）以保证高DPI清晰度。
   * 可通过环境变量回退：
   * - ELECTRON_SCREENSHOT_USE_PHYSICAL=false  使用逻辑分辨率（DIP）
   * - ELECTRON_SCREENSHOT_MAX_DIMENSION=8192  限制最大边长，避免显存/内存压力
   */
  private static calculateThumbnailSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: dipWidth, height: dipHeight } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor || 1;

    const envUsePhysical = process.env.ELECTRON_SCREENSHOT_USE_PHYSICAL;
    const usePhysical = envUsePhysical
      ? ["1", "true", "yes"].includes(envUsePhysical.toLowerCase())
      : true; // 默认启用物理分辨率

    const envMax = process.env.ELECTRON_SCREENSHOT_MAX_DIMENSION;
    const MAX_DIMENSION = (() => {
      const n = envMax ? parseInt(envMax, 10) : 8192; // 提高默认上限以覆盖 4K/5K/8K
      return Number.isFinite(n) && n > 0 ? n : 8192;
    })();

    // 基于开关决定初始尺寸
    let width = usePhysical ? Math.round(dipWidth * scaleFactor) : dipWidth;
    let height = usePhysical ? Math.round(dipHeight * scaleFactor) : dipHeight;

    // 对超大尺寸做一次等比收缩，避免极端情况下产生超大位图
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      const scaledW = Math.max(1, Math.round(width * scale));
      const scaledH = Math.max(1, Math.round(height * scale));
      logger.info("缩略图尺寸超过上限，按等比收缩", {
        usePhysical,
        logical: `${dipWidth}x${dipHeight}`,
        scaleFactor,
        original: `${width}x${height}`,
        maxDimension: MAX_DIMENSION,
        scaled: `${scaledW}x${scaledH}`,
      });
      width = scaledW;
      height = scaledH;
    }

    logger.debug("缩略图尺寸计算完成", {
      mode: usePhysical ? "physical" : "logical",
      logicalResolution: `${dipWidth}x${dipHeight}`,
      scaleFactor,
      thumbnailSize: `${width}x${height}`,
      estimatedSizeMB: ((width * height * 4) / 1024 / 1024).toFixed(2),
      maxDimension: MAX_DIMENSION,
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
