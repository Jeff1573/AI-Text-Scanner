# AI Text Scanner - Electron Builder 构建指南

这个项目已经从 Electron Forge 迁移到 Electron Builder，以获得更强大的打包和发布能力。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 构建并启动开发版本
npm run dev

# 或者分步操作
npm run build  # 构建代码
npm start      # 启动应用
```

### 构建应用

```bash
# 清理构建目录
npm run clean

# 构建所有代码（不打包）
npm run build

# 打包应用（当前平台）
npm run package

# 打包特定平台
npm run package:win    # Windows
npm run package:mac    # macOS  
npm run package:linux  # Linux
```

### 分发构建

```bash
# 构建并打包（当前平台）
npm run dist

# 构建并打包特定平台
npm run dist:win     # Windows (.exe 安装程序)
npm run dist:mac     # macOS (.dmg 和 .zip)
npm run dist:linux   # Linux (.deb, .rpm, .AppImage)

# 构建、打包并发布到GitHub
npm run publish
```

## 📁 项目结构

```
fast-ocr/
├── main/                    # 主进程代码
├── renderer/               # 渲染进程代码  
├── scripts/                # 构建脚本
│   └── build.js           # 主构建脚本
├── build/                  # 构建资源
│   ├── entitlements.mac.plist  # macOS 权限配置
│   ├── installer.nsh       # Windows NSIS 自定义脚本
│   └── dmg-background.png  # DMG 背景图（需要添加）
├── dist/                   # 构建输出目录
├── .vite/                  # Vite 构建缓存
├── electron-builder.config.js  # Electron Builder 配置
├── package.json            # 项目配置
└── README-electron-builder.md  # 本文档
```

## ⚙️ 配置说明

### Electron Builder 配置

主要配置文件是 `electron-builder.config.js`，包含：

- **基础配置**: 应用ID、名称、图标等
- **安全配置**: Electron Fuses 设置
- **平台配置**: Windows、macOS、Linux 特定设置
- **发布配置**: GitHub Releases 集成
- **自动更新**: 更新服务器配置

### 构建脚本

`scripts/build.js` 是主要的构建脚本，支持以下命令：

```bash
node scripts/build.js <command> [platform]

# 命令:
#   clean              清理构建目录
#   build              构建所有代码（不打包）
#   package [platform] 构建并打包应用
#   publish            构建、打包并发布应用
#   dev                开发模式构建

# 平台 (可选):
#   win                Windows
#   mac                macOS  
#   linux              Linux
```

## 🔧 平台特定说明

### Windows

- 生成 NSIS 安装程序 (.exe)
- 支持 x64 和 ia32 架构
- 自定义安装脚本位于 `build/installer.nsh`
- 需要 `.ico` 格式图标

### macOS

- 生成 DMG 和 ZIP 包
- 支持 x64 和 ARM64 (Apple Silicon) 架构
- 需要 `.icns` 格式图标
- 包含代码签名和公证配置

### Linux

- 生成 DEB、RPM 和 AppImage 包
- 支持 x64 架构
- 需要 `.png` 格式图标
- 包含桌面文件配置

## 🔒 安全配置

项目使用 Electron Fuses 增强安全性：

- ✅ 禁用 Node.js 运行模式
- ✅ 启用 Cookie 加密
- ✅ 禁用环境变量注入
- ✅ 启用 ASAR 完整性验证
- ✅ 仅从 ASAR 加载应用代码

## 🚀 发布流程

### 自动发布到GitHub

1. 确保设置了 `GITHUB_TOKEN` 环境变量
2. 运行发布命令：

```bash
npm run publish
```

### 手动发布

1. 构建应用：`npm run dist`
2. 在 `dist/` 目录找到构建产物
3. 手动上传到发布平台

## 🛠️ 自定义配置

### 修改应用信息

编辑 `electron-builder.config.js` 中的相关字段：

```javascript
{
  appId: 'com.your-company.your-app',
  productName: 'Your App Name',
  // ...
}
```

### 添加自定义图标

将图标文件放在 `main/static/` 目录：

- Windows: `icons8-camera-256.ico`
- macOS: `icons8-camera-256.icns`  
- Linux: `icons8-camera-256.png`

### 自定义安装程序

- Windows: 编辑 `build/installer.nsh`
- macOS: 修改 `build/entitlements.mac.plist`
- Linux: 调整 `electron-builder.config.js` 中的 Linux 配置

## 🐛 故障排除

### 常见问题

1. **构建失败**: 检查 Node.js 版本是否兼容
2. **图标问题**: 确保图标文件存在且格式正确
3. **权限错误**: 在 Windows 上以管理员身份运行
4. **发布失败**: 检查 GitHub Token 权限

### 调试模式

启用详细日志：

```bash
DEBUG=electron-builder npm run dist
```

## 📚 相关文档

- [Electron Builder 官方文档](https://www.electron.build/)
- [Electron 文档](https://www.electronjs.org/docs)
- [Vite 文档](https://vitejs.dev/)

## 🆚 与 Electron Forge 的差异

| 功能 | Electron Forge | Electron Builder |
|------|----------------|------------------|
| 配置方式 | TypeScript 配置 | JavaScript/JSON 配置 |
| 自动更新 | 需要额外配置 | 内置支持 |
| 代码签名 | 基础支持 | 高级支持 |
| 安装程序定制 | 有限 | 丰富的选项 |
| 发布平台 | GitHub, S3 等 | 更多平台支持 |
| 构建速度 | 较快 | 中等 |
| 学习曲线 | 简单 | 中等 |

## 📝 许可证

MIT License