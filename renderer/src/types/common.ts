// 通用类型定义

// 位置坐标接口
export interface Position {
  x: number;
  y: number;
}

// 选择区域接口
export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 开始位置接口
export interface StartPos {
  x: number;
  y: number;
}

// 裁剪结果接口
export interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 选中图片信息接口
export interface SelectedImageInfo {
  width: number;
  height: number;
} 