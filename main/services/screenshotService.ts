import { desktopCapturer } from "electron";
import type { ScreenSource } from "../types";

export class ScreenshotService {
  static async captureScreen(): Promise<ScreenSource> {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
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
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  }
}