import { useMainAppState } from "../hooks/useMainAppState";
import { useMainAppLogic } from "../hooks/useMainAppLogic";
import { useMainAppEffects } from "../hooks/useMainAppEffects";
import { CaptureButton } from "./CaptureButton";
import { InfoSection } from "./InfoSection";
import { SelectedImageDisplay } from "./SelectedImageDisplay";
import "../App.css";

export const MainApp = () => {
  const {
    isCapturing,
    setIsCapturing,
    selectedImage,
    setSelectedImage,
    selectedImageInfo,
    setSelectedImageInfo,
    clearSelectedImage,
  } = useMainAppState();

  const { handleCaptureScreen } = useMainAppLogic();

  useMainAppEffects(setSelectedImage, setSelectedImageInfo);

  const onCapture = () => {
    handleCaptureScreen(setIsCapturing);
  };

  return (
    <div className="app">
      <h1>屏幕截图工具</h1>

      <CaptureButton isCapturing={isCapturing} onCapture={onCapture} />

      <InfoSection />

      <SelectedImageDisplay
        selectedImage={selectedImage}
        selectedImageInfo={selectedImageInfo}
        onClear={clearSelectedImage}
      />
    </div>
  );
}; 