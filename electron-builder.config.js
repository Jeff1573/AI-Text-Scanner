/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: "com.ai-text-scanner.app",
  productName: "AI Text Scanner",
  directories: {
    output: "dist",
    buildResources: "build",
  },
  files: [
    ".vite/**/*",
    "node_modules/**/*",
    "package.json",
    // 排除开发时依赖和工具
    "!node_modules/@types/**",
    "!node_modules/@typescript-eslint/**",
    "!node_modules/eslint*/**",
    "!node_modules/typescript/**",
    "!node_modules/@vitejs/**",
    "!node_modules/vite/**",
    "!node_modules/babel-plugin-react-compiler/**",
    // 排除不必要的文件但保持依赖完整性
    "!node_modules/**/*.md",
    "!node_modules/**/*.txt",
    "!node_modules/**/README*",
    "!node_modules/**/CHANGELOG*",
    "!node_modules/**/LICENSE*",
    "!node_modules/**/test/**",
    "!node_modules/**/tests/**",
    "!node_modules/**/__tests__/**",
    "!node_modules/**/spec/**",
    "!node_modules/**/example/**",
    "!node_modules/**/examples/**",
    "!node_modules/**/demo/**",
    "!node_modules/**/docs/**",
    "!node_modules/**/.github/**",
    "!node_modules/**/coverage/**",
    "!node_modules/**/*.map",
    "!node_modules/**/*.d.ts",
    "!node_modules/**/tsconfig.json",
    "!node_modules/**/webpack.config.js",
    "!node_modules/**/rollup.config.js",
    "!node_modules/**/jest.config.js",
    "!node_modules/**/.eslintrc*",
    "!node_modules/**/.prettierrc*",
    "!node_modules/**/karma.conf.js",
    // 优化语言包但保留必要的
    "!**/node_modules/**/locales/**",
    "**/node_modules/**/locales/{en-US,zh-CN,en-GB}.pak",
    "!**/node_modules/**/locale/**",
    "**/node_modules/**/locale/{en,zh,zh-CN}/**",
  ],
  extraResources: [
    {
      from: "main/static",
      to: "static",
      filter: ["**/*"],
    },
  ],
  asar: true,

  // 通用图标配置 (electron-builder会自动根据平台选择正确的扩展名)
  icon: "main/static/icons8-camera-256",

  // 注意: electronFuses 在 electron-builder 24.13.3 中不支持
  // 可以考虑升级到更新版本或使用 afterPack 钩子手动配置

  // Windows 配置
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"], // 只构建 x64，减少一半大小
      },
    ],
    icon: "main/static/icons8-camera-256.ico",
    publisherName: "AI Text Scanner",
    verifyUpdateCodeSignature: false,
  },

  // NSIS 安装程序配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "AI Text Scanner",
    installerIcon: "main/static/icons8-camera-256.ico",
    uninstallerIcon: "main/static/icons8-camera-256.ico",
    license: "LICENSE",
    language: "2052", // 简体中文
    include: "build/installer.nsh", // 可选的自定义NSIS脚本
    differentialPackage: true, // 启用差分更新包
    packElevateHelper: false, // 不打包权限提升助手以减小体积
  },

  // macOS 配置
  mac: {
    target: [
      {
        target: "zip",
        arch: ["x64", "arm64"],
      },
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "main/static/icons8-camera-256.icns",
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },

  // DMG 配置
  dmg: {
    background: "build/dmg-background.png",
    iconSize: 100,
    contents: [
      {
        x: 255,
        y: 85,
        type: "file",
      },
      {
        x: 253,
        y: 325,
        type: "link",
        path: "/Applications",
      },
    ],
    window: {
      width: 500,
      height: 500,
    },
  },

  // Linux 配置
  linux: {
    target: [
      {
        target: "deb",
        arch: ["x64"],
      },
      {
        target: "rpm",
        arch: ["x64"],
      },
      {
        target: "AppImage",
        arch: ["x64"],
      },
    ],
    icon: "main/static/icons8-camera-256.png",
    category: "Office",
    desktop: {
      Name: "AI Text Scanner",
      Comment: "AI-powered text scanner with OCR and translation capabilities",
      Keywords: "OCR;Text;Scanner;AI;Translation;",
      StartupNotify: "true",
      MimeType: "image/png;image/jpeg;image/gif;",
    },
  },

  // DEB 包配置
  deb: {
    priority: "optional",
    maintainer: "jf <your-email@example.com>",
    synopsis: "AI-powered text scanner",
    description:
      "AI Text Scanner is a powerful desktop application that provides OCR and translation capabilities.",
    depends: [
      "libgtk-3-0",
      "libnotify-dev",
      "libnss3-dev",
      "libxss1",
      "libgconf-2-4",
      "libxrandr2",
      "libasound2-dev",
      "libxtst6",
      "libatspi2.0-0",
      "libdrm2",
      "libxcomposite1",
      "libxdamage1",
    ],
  },

  // RPM 包配置
  rpm: {
    synopsis: "AI-powered text scanner",
    vendor: "AI Text Scanner Team",
    depends: [
      "gtk3",
      "libnotify",
      "nss",
      "libXScrnSaver",
      "GConf2",
      "libXrandr",
      "alsa-lib",
    ],
  },

  // 发布配置 - 在CI环境中禁用自动发布
  publish: null, // 禁用自动发布，在GitHub Actions中手动处理

  // 删除包脚本以减小大小
  removePackageScripts: true,
  removePackageKeywords: true,

  // 不包含 PDB 文件（Windows 调试文件）
  includePdb: false,

  // 不从源码构建依赖
  buildDependenciesFromSource: false,

  // 不重建原生模块（如果不需要）
  nodeGypRebuild: false,

  // 包含子节点模块以确保所有运行时依赖正常工作
  includeSubNodeModules: true,

  // 压缩配置 - 使用最大压缩
  compression: "maximum",

  // 构建前钩子
  beforeBuild: async (context) => {
    console.log("Building with electron-builder...");
    console.log("Platform:", context.platform.name);
    console.log("Arch:", context.arch);
  },

  // 构建后钩子
  afterPack: async (context) => {
    console.log("Packaging completed for:", context.outDir);
  },

  // 签名后钩子 (用于macOS公证)
  afterSign: async (context) => {
    if (context.electronPlatformName === "darwin") {
      console.log("macOS app signed, ready for notarization");
      // 这里可以添加公证逻辑
    }
  },
};

module.exports = config;
