import type { Selection, CropResult } from '../types/common';

export const calculateCropCoordinates = (
  selection: Selection,
  originalWidth: number,
  originalHeight: number,
  displayWidth: number,
  displayHeight: number
): CropResult => {
  // 计算缩放比例
  const scaleX = originalWidth / displayWidth;
  const scaleY = originalHeight / displayHeight;

  // 将选择坐标转换为原始图片坐标
  const originalX = Math.round(selection.x * scaleX);
  const originalY = Math.round(selection.y * scaleY);
  const originalWidth_crop = Math.round(selection.width * scaleX);
  const originalHeight_crop = Math.round(selection.height * scaleY);

  // 确保裁剪区域不超出图片边界
  const finalX = Math.max(0, Math.min(originalX, originalWidth - 1));
  const finalY = Math.max(0, Math.min(originalY, originalHeight - 1));
  const finalWidth = Math.min(originalWidth_crop, originalWidth - finalX);
  const finalHeight = Math.min(originalHeight_crop, originalHeight - finalY);

  return {
    x: finalX,
    y: finalY,
    width: finalWidth,
    height: finalHeight,
  };
};

export const cropImage = async (
  imageSrc: string,
  cropCoords: CropResult
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = cropCoords.width;
      canvas.height = cropCoords.height;

      // 绘制选中区域
      ctx?.drawImage(
        img,
        cropCoords.x,
        cropCoords.y,
        cropCoords.width,
        cropCoords.height,
        0,
        0,
        cropCoords.width,
        cropCoords.height
      );

      // 获取选中内容的数据URL
      const selectedImageData = canvas.toDataURL("image/png");
      resolve(selectedImageData);
    };

    img.onerror = reject;
    img.src = imageSrc;
  });
};

export const saveSelectedImage = (imageData: string, width: number, height: number) => {
  localStorage.setItem("selectedImageData", imageData);
  localStorage.setItem(
    "selectedImageInfo",
    JSON.stringify({
      width,
      height,
    })
  );
}; 