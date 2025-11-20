# 截图速率限制功能测试

## 功能说明

为了防止短时间内多次调用截图功能导致的性能问题或意外行为，已在两个截图接口中添加了速率限制（防抖）机制。

## 实现细节

### 1. 防抖时间设置
- **默认间隔**: 500毫秒（0.5秒）
- **限制范围**: 
  - `capture-screen-native` (原生截图)
  - `capture-screen` (Electron desktopCapturer 截图)

### 2. 核心代码位置
- **后端 WindowManager**: `main/managers/windowManager.ts`
  - 第77-79行: 防抖相关属性定义
  - 第1012-1100行: `capture-screen-native` 处理器（含防抖逻辑）
  - 第1102-1169行: `capture-screen` 处理器（含防抖逻辑）

- **后端 HotkeyManager**: `main/managers/hotkeyManager.ts`
  - 第18-22行: 防抖相关属性定义
  - 第44-111行: 快捷键截图回调（含防抖逻辑）

- **前端**: `renderer/src/hooks/useMainAppLogic.ts`
  - 第30-43行: 处理 `IN_PROGRESS` 和 `RATE_LIMITED` 错误码

### 3. 工作流程
1. 用户触发截图操作
2. **检查是否有截图正在进行中**:
   - 如果有 → 返回错误: `截图正在进行中，请完成当前截图后再试`
   - 错误码: `IN_PROGRESS`
3. 检查距离上次截图的时间间隔:
   - 如果间隔 < 500ms → 返回错误: `请稍后再试（还需等待 X 秒）`
   - 错误码: `RATE_LIMITED`
4. 如果所有检查通过:
   - 设置 `_isScreenshotInProgress = true`
   - 更新时间戳
   - 执行截图流程
   - 完成后(成功或失败)设置 `_isScreenshotInProgress = false`

## 测试步骤

### 基础功能测试
1. 启动应用
2. 点击截图按钮，应该正常工作
3. 等待 1 秒后再次点击，应该正常工作

### 速率限制测试
1. 启动应用
2. 连续快速点击截图按钮（间隔 < 0.5秒）
3. **预期结果**:
   - 第一次点击: 正常触发截图
   - 后续快速点击: 弹出提示 "请稍后再试（还需等待 X 秒）"
   - 控制台显示警告日志

### 并发截图测试（新增）
1. 启动应用
2. 点击截图按钮,启动截图工具
3. **在截图选择界面显示期间**,再次点击截图按钮
4. **预期结果**:
   - 第一次点击: 正常弹出截图选择界面
   - 第二次点击(截图进行中): 弹出提示 "截图正在进行中，请完成当前截图后再试"
   - 用户选择第一个截图区域后,只会创建一个预览窗口
   - 控制台显示 "截图流程正在进行中，已拒绝新的调用"

### 日志验证
在控制台中应该看到类似日志:
```
[WindowManager] WARN: 截图调用过于频繁，已拒绝 {
  timeSinceLastScreenshot: 150,
  debounceMs: 500,
  remainingSeconds: 1
}
```

### 两种截图方式都应测试
- macOS: 使用原生截图（`capture-screen-native`）
- Windows/Linux: 使用 Electron 截图（`capture-screen`）

### 快捷键测试（新增）
1. 快速连续按快捷键（默认 Ctrl+Shift+S）
2. **预期结果**:
   - 第一次按键: 正常弹出截图选择界面
   - 第二次按键(在第一个截图进行中): 控制台显示 "截图流程正在进行中，已拒绝新的调用"
   - 只会创建一个预览窗口

## 可配置选项

如果需要调整防抖时间间隔，修改 `windowManager.ts` 第78行:
```typescript
private _screenshotDebounceMs = 500; // 单位：毫秒
```

建议值范围: 300-1000ms
