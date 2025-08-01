interface Position {
  x: number;
  y: number;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const getImageElement = (): HTMLImageElement | null => {
  return document.querySelector(".screenshot-image") as HTMLImageElement;
};

export const getClampedPosition = (
  clientX: number,
  clientY: number,
  imgElement: HTMLImageElement
): Position => {
  const imgRect = imgElement.getBoundingClientRect();
  const x = clientX - imgRect.left;
  const y = clientY - imgRect.top;

  // 确保坐标在图片范围内
  const clampedX = Math.max(0, Math.min(x, imgRect.width));
  const clampedY = Math.max(0, Math.min(y, imgRect.height));

  return { x: clampedX, y: clampedY };
};

export const calculateSelection = (
  currentPos: Position,
  startPos: Position
): Selection => {
  const width = currentPos.x - startPos.x;
  const height = currentPos.y - startPos.y;

  return {
    x: width < 0 ? currentPos.x : startPos.x,
    y: height < 0 ? currentPos.y : startPos.y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
};

export const isValidSelection = (selection: Selection): boolean => {
  return selection.width >= 10 && selection.height >= 10;
}; 