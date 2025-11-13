# 类型定义说明

本目录包含项目中所有的TypeScript类型定义，按功能模块进行组织。

## 文件结构

### `common.ts`
通用类型定义，包含在多个模块中重复使用的接口：
- `Position`: 位置坐标接口
- `Selection`: 选择区域接口
- `StartPos`: 开始位置接口
- `CropResult`: 裁剪结果接口
- `SelectedImageInfo`: 选中图片信息接口

### `settings.ts`
设置相关类型定义：
- `SettingsFormData`: 设置表单数据接口

### `electron.d.ts`
Electron API类型定义（全局声明文件）：
- `ScreenSource`: 屏幕源接口
- `ElectronAPI`: Electron API接口
- `Window`: 全局Window接口扩展

### `index.ts`
类型定义统一导出文件，方便其他模块导入。

## 使用方式

### 导入通用类型
```typescript
import type { Position, Selection } from '../types/common';
```

### 导入设置类型
```typescript
import type { SettingsFormData } from '../types/settings';
```

### 导入所有类型
```typescript
import type { Position, Selection, SettingsFormData } from '../types';
```

## 主进程类型定义

主进程的类型定义位于 `main/types.ts`，包含：
- `ScreenSource`: 屏幕源接口
- `ConfigProvider`: 配置提供者接口
- `Config`: 配置接口

## 最佳实践

1. **避免重复定义**: 相同的接口应该定义在 `common.ts` 中
2. **按功能分组**: 特定功能的类型定义放在对应的文件中
3. **使用类型导入**: 使用 `import type` 语法导入类型定义
4. **保持一致性**: 接口命名和结构保持一致性 