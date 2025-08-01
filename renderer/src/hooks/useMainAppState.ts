import { useState } from "react";

interface SelectedImageInfo {
  width: number;
  height: number;
}

export const useMainAppState = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageInfo, setSelectedImageInfo] = useState<SelectedImageInfo | null>(null);

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageInfo(null);
    localStorage.removeItem("selectedImageData");
    localStorage.removeItem("selectedImageInfo");
  };

  return {
    isCapturing,
    setIsCapturing,
    selectedImage,
    setSelectedImage,
    selectedImageInfo,
    setSelectedImageInfo,
    clearSelectedImage,
  };
}; 