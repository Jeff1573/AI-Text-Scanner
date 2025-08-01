interface SelectedImageInfo {
  width: number;
  height: number;
}

interface SelectedImageDisplayProps {
  selectedImage: string | null;
  selectedImageInfo: SelectedImageInfo | null;
  onClear: () => void;
}

export const SelectedImageDisplay = ({
  selectedImage,
  selectedImageInfo,
  onClear,
}: SelectedImageDisplayProps) => {
  if (!selectedImage) return null;

  return (
    <div className="selected-image-container">
      <div className="selected-image-header">
        <h3>选中的图片</h3>
        <button onClick={onClear} className="clear-btn">
          清除
        </button>
      </div>
      <div className="selected-image-content">
        <img
          src={selectedImage}
          alt="选中的图片"
          className="selected-image"
        />
        {selectedImageInfo && (
          <div className="selected-image-info">
            <p>
              尺寸: {selectedImageInfo.width} x {selectedImageInfo.height} 像素
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 