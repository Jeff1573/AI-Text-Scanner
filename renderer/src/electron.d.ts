interface CaptureScreenData {
  thumbnail: string;
  id: string;
  name: string;
  display_id: string;
  width: number;
  height: number;
}

interface ElectronAPI {
  startScreenCapture: () => Promise<void>;
  saveScreenCapture: (dataUrl: string) => Promise<string | null>;
  captureScreenArea: (bounds: {x: number, y: number, width: number, height: number}) => Promise<string | null>;
  onScreenCaptureComplete: (callback: (imagePath: string) => void) => () => void;
  onCaptureScreenData: (callback: (data: CaptureScreenData) => void) => () => void;
  onStartDirectCapture: (callback: (data: {width: number, height: number}) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};