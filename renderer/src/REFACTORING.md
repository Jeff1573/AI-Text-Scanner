# App.tsx 重构说明

## 重构概述

原始 `App.tsx` 文件包含 486 行代码，包含两个主要组件（MainApp 和 ScreenshotViewer），符合重构指南中的"超复杂"情况。通过状态与逻辑分离的设计原则，将代码重构为更易维护和测试的结构。

## 重构策略

### 1. 状态管理分离

**创建的状态管理Hook：**
- `useMainAppState` - 管理主应用的状态
- `useScreenshotViewerState` - 管理截图查看器的状态

**优势：**
- 状态逻辑集中管理
- 提供清理和重置函数
- 不包含业务逻辑和API调用

### 2. 业务逻辑分离

**创建的业务逻辑Hook：**
- `useMainAppLogic` - 处理主应用的业务逻辑
- `useMainAppEffects` - 处理主应用的副作用
- `useScreenshotViewerEffects` - 处理截图查看器的副作用

**优势：**
- 函数接收参数而非直接访问状态
- 统一的错误处理策略
- 可以独立测试

### 3. 工具函数提取

**创建的工具函数：**
- `imageUtils.ts` - 图片处理相关工具函数
- `mouseUtils.ts` - 鼠标事件处理相关工具函数

**优势：**
- 纯函数形式，易于测试
- 可复用性强
- 职责单一

### 4. 子组件抽离

**创建的子组件：**
- `CaptureButton` - 截图按钮组件
- `InfoSection` - 信息展示组件
- `SelectedImageDisplay` - 选中图片显示组件
- `ScreenshotHeader` - 截图查看器头部组件
- `ScreenshotContent` - 截图内容组件
- `LoadingState` - 加载状态组件
- `ErrorState` - 错误状态组件
- `NoDataState` - 无数据状态组件

**优势：**
- 功能独立且完整
- 有复用价值
- Props设计合理

## 文件结构

```
renderer/src/
├── hooks/
│   ├── useMainAppState.ts
│   ├── useMainAppLogic.ts
│   ├── useMainAppEffects.ts
│   ├── useScreenshotViewerState.ts
│   └── useScreenshotViewerEffects.ts
├── utils/
│   ├── imageUtils.ts
│   └── mouseUtils.ts
├── components/
│   ├── index.ts
│   ├── MainApp.tsx
│   ├── ScreenshotViewer.tsx
│   ├── CaptureButton.tsx
│   ├── InfoSection.tsx
│   ├── SelectedImageDisplay.tsx
│   ├── ScreenshotHeader.tsx
│   ├── ScreenshotContent.tsx
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   └── NoDataState.tsx
└── App.tsx (重构后)
```

## 重构效果

### 成功指标

✅ **主组件代码减少 85%+** - 从 486 行减少到 28 行
✅ **每个Hook/组件职责单一** - 每个文件都有明确的职责
✅ **可以独立编写单元测试** - 工具函数和Hook都可以独立测试
✅ **新功能开发效率提升** - 组件化结构便于扩展
✅ **Bug修复范围更精确** - 问题定位更准确

### 代码质量提升

1. **可维护性** - 代码结构清晰，职责分离
2. **可测试性** - 工具函数和Hook可以独立测试
3. **可复用性** - 组件和Hook可以在其他地方复用
4. **可读性** - 每个文件都有明确的职责和功能

## 命名规范

### Hook命名
- `useMainAppState` - 主应用状态管理
- `useMainAppLogic` - 主应用业务逻辑
- `useMainAppEffects` - 主应用副作用
- `useScreenshotViewerState` - 截图查看器状态管理
- `useScreenshotViewerEffects` - 截图查看器副作用

### 组件命名
- `MainApp` - 主应用组件
- `ScreenshotViewer` - 截图查看器组件
- `CaptureButton` - 截图按钮组件
- `InfoSection` - 信息展示组件
- `SelectedImageDisplay` - 选中图片显示组件

## 使用示例

```typescript
// 使用状态Hook
const {
  isCapturing,
  selectedImage,
  clearSelectedImage,
} = useMainAppState();

// 使用业务逻辑Hook
const { handleCaptureScreen } = useMainAppLogic();

// 使用工具函数
const cropCoords = calculateCropCoordinates(selection, width, height);
const selectedImageData = await cropImage(imageSrc, cropCoords);
```

## 后续优化建议

1. **添加单元测试** - 为工具函数和Hook编写测试
2. **类型安全** - 完善TypeScript类型定义
3. **错误边界** - 添加React错误边界处理
4. **性能优化** - 使用React.memo优化组件渲染
5. **国际化** - 提取文本到国际化文件 