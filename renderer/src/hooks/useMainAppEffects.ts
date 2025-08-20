import { useEffect } from "react";
import type { SelectedImageInfo } from "../types/common";

export const useMainAppEffects = (
  setSelectedImage: (image: string | null) => void,
  setSelectedImageInfo: (info: SelectedImageInfo | null) => void
) => {
  useEffect(() => {
    // 从localStorage读取之前保存的选中图片数据
    const savedImageData = localStorage.getItem("selectedImageData");
    const savedImageInfo = localStorage.getItem("selectedImageInfo");

    if (savedImageData && savedImageInfo) {
      setSelectedImage(savedImageData);
      setSelectedImageInfo(JSON.parse(savedImageInfo));
    }

    // 监听窗口焦点事件，检查是否有新的选中图片数据
    const handleWindowFocus = () => {
      const newImageData = localStorage.getItem("selectedImageData");
      const newImageInfo = localStorage.getItem("selectedImageInfo");

      if (newImageData && newImageInfo) {
        setSelectedImage(newImageData);
        setSelectedImageInfo(JSON.parse(newImageInfo));
      }
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [setSelectedImage, setSelectedImageInfo]);
}; 