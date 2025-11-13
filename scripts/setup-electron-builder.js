#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始 Electron Builder 迁移...\n');

// 检查是否在正确的目录
if (!fs.existsSync('package.json')) {
  console.error('❌ 请在项目根目录运行此脚本！');
  process.exit(1);
}

const log = (message) => {
  console.log(`[SETUP] ${new Date().toLocaleTimeString()} - ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`);
};

async function removeForgePackages() {
  log('移除 Electron Forge 相关依赖...');
  
  const forgePackages = [
    '@electron-forge/cli',
    '@electron-forge/maker-deb',
    '@electron-forge/maker-rpm',
    '@electron-forge/maker-squirrel',
    '@electron-forge/maker-zip',
    '@electron-forge/plugin-auto-unpack-natives',
    '@electron-forge/plugin-fuses',
    '@electron-forge/plugin-vite',
    '@electron-forge/publisher-github'
  ];

  try {
    execSync(`npm uninstall ${forgePackages.join(' ')}`, { stdio: 'inherit' });
    log('Electron Forge 依赖移除完成');
  } catch (err) {
    error('移除 Electron Forge 依赖失败，请手动执行：');
    console.log(`npm uninstall ${forgePackages.join(' ')}`);
  }
}

async function installBuilderPackages() {
  log('安装 Electron Builder...');
  
  try {
    execSync('npm install --save-dev electron-builder', { stdio: 'inherit' });
    log('Electron Builder 安装完成');
  } catch (err) {
    error('Electron Builder 安装失败');
    throw err;
  }
}

async function createDirectories() {
  log('创建必要的目录...');
  
  const dirs = ['build', 'scripts', 'dist'];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`创建目录: ${dir}`);
    }
  });
}

async function checkIconFiles() {
  log('检查图标文件...');
  
  const iconBase = 'main/static/icons8-camera-256';
  const iconFiles = [
    `${iconBase}.ico`,  // Windows
    `${iconBase}.icns`, // macOS
    `${iconBase}.png`   // Linux
  ];
  
  const missingIcons = iconFiles.filter(file => !fs.existsSync(file));
  
  if (missingIcons.length > 0) {
    console.log('\n⚠️  缺少以下图标文件:');
    missingIcons.forEach(file => console.log(`   - ${file}`));
    console.log('\n请确保添加对应平台的图标文件，或修改 electron-builder.config.js 中的图标路径。');
  } else {
    log('所有图标文件都存在 ✅');
  }
}

async function backupForgeConfig() {
  log('备份 Electron Forge 配置...');
  
  if (fs.existsSync('forge.config.ts')) {
    const backupName = `forge.config.ts.backup.${Date.now()}`;
    fs.copyFileSync('forge.config.ts', backupName);
    log(`Forge 配置已备份为: ${backupName}`);
    
    // 询问是否删除原配置
    console.log('\n❓ 是否删除原始的 forge.config.ts 文件？(推荐保留备份)');
    console.log('   文件已备份，可以安全删除原文件');
    // 这里可以添加交互式选择，暂时保留文件
  }
}

async function createLicenseFile() {
  if (!fs.existsSync('LICENSE')) {
    log('创建 LICENSE 文件...');
    const license = `MIT License

Copyright (c) ${new Date().getFullYear()} AI Text Scanner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
    
    fs.writeFileSync('LICENSE', license);
    log('LICENSE 文件已创建');
  }
}

async function main() {
  try {
    // 显示迁移信息
    console.log(`
📋 迁移内容:
   ✅ 移除 Electron Forge 依赖
   ✅ 安装 Electron Builder  
   ✅ 创建必要目录结构
   ✅ 检查图标文件
   ✅ 备份原始配置
   ✅ 创建许可证文件
`);

    await createDirectories();
    await checkIconFiles();
    await backupForgeConfig();
    await createLicenseFile();
    await removeForgePackages();
    await installBuilderPackages();
    
    console.log(`
🎉 迁移完成！

📚 接下来的步骤:
   1. 查看 README-electron-builder.md 了解新的构建方式
   2. 查看 MIGRATION-GUIDE.md 了解详细的迁移对比
   3. 检查并调整 electron-builder.config.js 配置
   4. 确保所需的图标文件存在
   5. 测试构建: npm run build
   6. 测试打包: npm run package

🛠️ 常用命令:
   npm run dev      # 开发模式
   npm run build    # 构建代码
   npm run package  # 打包应用
   npm run dist     # 构建并分发
   npm run publish  # 发布到GitHub

📖 配置文件:
   - electron-builder.config.js  # 主配置文件
   - scripts/build.js            # 构建脚本
   - build/                      # 构建资源目录

❗ 注意事项:
   - 构建输出目录从 out/ 改为 dist/
   - 确保 GitHub Token 已设置 (发布时需要)
   - 首次构建可能需要下载额外的依赖
`);

  } catch (err) {
    error(`迁移过程中发生错误: ${err.message}`);
    console.log('\n🔧 手动迁移步骤:');
    console.log('1. npm uninstall @electron-forge/cli @electron-forge/maker-* @electron-forge/plugin-* @electron-forge/publisher-*');
    console.log('2. npm install --save-dev electron-builder');
    console.log('3. 使用提供的配置文件');
    process.exit(1);
  }
}

main();