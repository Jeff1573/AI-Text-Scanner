# Electron Forge 到 Electron Builder 迁移对比

本文档详细对比了从 Electron Forge 迁移到 Electron Builder 的配置变化。

## 📋 迁移概览

| 方面 | Electron Forge | Electron Builder |
|------|----------------|------------------|
| 配置文件 | `forge.config.ts` | `electron-builder.config.js` |
| 主要命令 | `electron-forge make` | `electron-builder` |
| 包管理器 | 任意 | 任意 |
| 构建输出 | `out/` | `dist/` |

## 🔄 配置映射

### 1. 基础配置

#### Electron Forge (forge.config.ts)
```typescript
const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: join(__dirname, "main/static/icons8-camera-256"),
  },
  // ...
};
```

#### Electron Builder (electron-builder.config.js)
```javascript
const config = {
  appId: 'com.ai-text-scanner.app',
  productName: 'AI Text Scanner',
  asar: true,
  icon: 'main/static/icons8-camera-256', // 自动选择扩展名
  // ...
};
```

### 2. 构建目标 (Makers vs Targets)

#### Electron Forge
```typescript
makers: [
  new MakerSquirrel({
    setupIcon: join(__dirname, "main/static/icons8-camera-256.ico"),
  }),
  new MakerZIP({}, ["darwin"]),
  new MakerRpm({}),
  new MakerDeb({}),
]
```

#### Electron Builder
```javascript
win: {
  target: [{ target: 'nsis', arch: ['x64', 'ia32'] }],
  icon: 'main/static/icons8-camera-256.ico',
},
mac: {
  target: [
    { target: 'zip', arch: ['x64', 'arm64'] },
    { target: 'dmg', arch: ['x64', 'arm64'] }
  ],
  icon: 'main/static/icons8-camera-256.icns',
},
linux: {
  target: [
    { target: 'deb', arch: ['x64'] },
    { target: 'rpm', arch: ['x64'] },
    { target: 'AppImage', arch: ['x64'] }
  ],
  icon: 'main/static/icons8-camera-256.png',
}
```

### 3. 安全配置 (Fuses)

#### Electron Forge
```typescript
new FusesPlugin({
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
})
```

#### Electron Builder
```javascript
electronFuses: {
  runAsNode: false,
  enableCookieEncryption: true,
  enableNodeOptionsEnvironmentVariable: false,
  enableNodeCliInspectArguments: false,
  enableEmbeddedAsarIntegrityValidation: true,
  onlyLoadAppFromAsar: true,
  loadBrowserProcessSpecificV8Snapshot: false,
  grantFileProtocolExtraPrivileges: false
}
```

### 4. 发布配置

#### Electron Forge
```typescript
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'Jeff1573',
        name: 'AI-Text-Scanner'
      },
      prerelease: false,
      draft: false,
    } as PublisherGitHubConfig
  }
]
```

#### Electron Builder
```javascript
publish: [
  {
    provider: 'github',
    owner: 'Jeff1573',
    repo: 'AI-Text-Scanner',
    private: false,
    releaseType: 'release' // 'draft', 'prerelease', 'release'
  }
]
```

## 📦 依赖变化

### 移除的依赖 (Electron Forge)
```json
{
  "@electron-forge/cli": "^7.8.2",
  "@electron-forge/maker-deb": "^7.8.2",
  "@electron-forge/maker-rpm": "^7.8.2", 
  "@electron-forge/maker-squirrel": "^7.8.2",
  "@electron-forge/maker-zip": "^7.8.2",
  "@electron-forge/plugin-auto-unpack-natives": "^7.8.2",
  "@electron-forge/plugin-fuses": "^7.8.2",
  "@electron-forge/plugin-vite": "^7.8.2",
  "@electron-forge/publisher-github": "^7.8.3"
}
```

### 添加的依赖 (Electron Builder)
```json
{
  "electron-builder": "^24.13.3"
}
```

### 保留的依赖
```json
{
  "@electron/fuses": "^1.8.0", // 仍用于类型定义
  "electron": "37.2.4"
}
```

## 🛠️ 脚本变化

### package.json 脚本

#### 之前 (Electron Forge)
```json
{
  "start": "electron-forge start",
  "package": "electron-forge package", 
  "make": "electron-forge make",
  "publish": "electron-forge publish"
}
```

#### 之后 (Electron Builder)
```json
{
  "start": "electron .",
  "dev": "node scripts/build.js dev && electron .",
  "build": "node scripts/build.js build",
  "package": "node scripts/build.js package",
  "dist": "npm run build && electron-builder",
  "publish": "node scripts/build.js publish"
}
```

## 🏗️ 构建流程变化

### Electron Forge 流程
```
electron-forge start → 自动构建 + 启动
electron-forge make → 构建 + 打包
electron-forge publish → 发布
```

### Electron Builder 流程
```
构建阶段: Vite 构建 → 生成 .vite/ 目录
打包阶段: electron-builder → 读取 .vite/ → 生成 dist/
发布阶段: electron-builder --publish → 上传到平台
```

## 📁 目录结构变化

### 构建输出

#### Electron Forge
```
out/
├── make/
│   ├── zip/
│   ├── squirrel.windows/
│   ├── deb/
│   └── rpm/
└── {app-name}-{platform}-{arch}/
```

#### Electron Builder  
```
dist/
├── {app-name}-{version}.exe        # Windows
├── {app-name}-{version}.dmg        # macOS DMG
├── {app-name}-{version}-mac.zip    # macOS ZIP
├── {app-name}_{version}_amd64.deb  # Linux DEB
├── {app-name}-{version}.x86_64.rpm # Linux RPM
└── {app-name}-{version}.AppImage   # Linux AppImage
```

### 配置文件

#### Electron Forge
```
forge.config.ts          # 主配置
vite.main.config.ts      # 主进程构建
vite.preload.config.ts   # 预加载脚本构建
vite.renderer.config.ts  # 渲染进程构建
```

#### Electron Builder
```
electron-builder.config.js    # 主配置
scripts/build.js             # 构建脚本
build/                       # 构建资源
├── entitlements.mac.plist   # macOS 权限
├── installer.nsh            # Windows NSIS 脚本
└── dmg-background.png       # DMG 背景图
```

## ⚡ 新增功能

### 1. 更丰富的平台支持
- Windows: NSIS, MSI, AppX, Portable
- macOS: DMG, ZIP, PKG
- Linux: DEB, RPM, AppImage, Snap, Flatpak

### 2. 高级安装程序定制
- Windows NSIS 脚本定制
- macOS DMG 外观定制
- Linux 桌面集成

### 3. 自动更新增强
- 内置更新服务器支持
- 增量更新
- 多渠道发布

### 4. 代码签名改进
- Windows 代码签名
- macOS 公证支持
- 证书管理

## 🔧 使用建议

### 1. 渐进式迁移
1. 保留原有 Vite 配置
2. 替换打包配置
3. 测试各平台构建
4. 逐步添加高级功能

### 2. 调试技巧
```bash
# 启用详细日志
DEBUG=electron-builder npm run dist

# 跳过代码签名 (开发时)
export CSC_IDENTITY_AUTO_DISCOVERY=false

# 指定架构
npm run dist -- --x64
```

### 3. 性能优化
- 使用 `compression: 'normal'` 平衡大小和速度
- 配置 `files` 字段减少打包内容
- 使用 `asar: true` 提高启动速度

## ❗ 注意事项

### 1. 破坏性变化
- 构建输出目录从 `out/` 改为 `dist/`
- 命令行参数格式不同
- 配置文件结构完全不同

### 2. 兼容性
- 需要 Node.js 16+ 
- Electron Builder 24+ 支持 Electron 22+
- 某些 Forge 插件可能没有直接对应

### 3. 学习成本
- 配置选项更复杂
- 文档更详细但也更庞大
- 需要理解不同平台的打包机制

## 📚 推荐阅读

- [Electron Builder 配置参考](https://www.electron.build/configuration/configuration)
- [平台特定配置](https://www.electron.build/configuration/win)
- [发布配置指南](https://www.electron.build/configuration/publish)
- [自动更新实现](https://www.electron.build/auto-update)