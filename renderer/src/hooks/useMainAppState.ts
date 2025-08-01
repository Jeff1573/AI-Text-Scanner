import { useState, useEffect } from "react";
import type { SelectedImageInfo } from "../types/common";

export const useMainAppState = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageInfo, setSelectedImageInfo] = useState<SelectedImageInfo | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 从本地存储恢复侧边栏状态
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageInfo(null);
    localStorage.removeItem("selectedImageData");
    localStorage.removeItem("selectedImageInfo");
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  return {
    isCapturing,
    setIsCapturing,
    selectedImage,
    setSelectedImage,
    selectedImageInfo,
    setSelectedImageInfo,
    clearSelectedImage,
    isSidebarCollapsed,
    toggleSidebar,
  };
}; 