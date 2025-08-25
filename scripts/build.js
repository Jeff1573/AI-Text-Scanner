#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 构建脚本 - 协调Vite构建和electron-builder打包
 */

const log = (message) => {
  console.log(`[BUILD] ${new Date().toLocaleTimeString()} - ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`);
};

async function clean() {
  log('清理构建目录...');
  try {
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    if (fs.existsSync('.vite')) {
      fs.rmSync('.vite', { recursive: true, force: true });
    }
    log('清理完成');
  } catch (err) {
    error(`清理失败: ${err.message}`);
    process.exit(1);
  }
}

async function buildRenderer() {
  log('构建渲染进程...');
  try {
    execSync('npx vite build --config vite.renderer.config.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log('渲染进程构建完成');
  } catch (err) {
    error('渲染进程构建失败');
    process.exit(1);
  }
}

async function buildMain() {
  log('构建主进程...');
  try {
    execSync('npx vite build --config vite.main.config.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log('主进程构建完成');
  } catch (err) {
    error('主进程构建失败');
    process.exit(1);
  }
}

async function buildPreload() {
  log('构建预加载脚本...');
  try {
    execSync('npx vite build --config vite.preload.config.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log('预加载脚本构建完成');
  } catch (err) {
    error('预加载脚本构建失败');
    process.exit(1);
  }
}

async function packageApp(platform = '') {
  log(`开始打包应用${platform ? ` (${platform})` : ''}...`);
  try {
    const platformFlag = platform ? `--${platform}` : '';
    execSync(`npx electron-builder ${platformFlag} --config electron-builder.config.js`, { 
      stdio: 'inherit' 
    });
    log('应用打包完成');
  } catch (err) {
    error('应用打包失败');
    process.exit(1);
  }
}

async function publishApp() {
  log('发布应用...');
  try {
    execSync('npx electron-builder --publish always --config electron-builder.config.js', { 
      stdio: 'inherit' 
    });
    log('应用发布完成');
  } catch (err) {
    error('应用发布失败');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const platform = args[1];

  log('开始构建流程...');
  log(`Node.js version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`Architecture: ${process.arch}`);

  try {
    switch (command) {
      case 'clean':
        await clean();
        break;
        
      case 'build':
        await clean();
        await buildRenderer();
        await buildMain();
        await buildPreload();
        log('所有构建完成');
        break;
        
      case 'package':
        await clean();
        await buildRenderer();
        await buildMain();
        await buildPreload();
        await packageApp(platform);
        break;
        
      case 'publish':
        await clean();
        await buildRenderer();
        await buildMain();
        await buildPreload();
        await publishApp();
        break;
        
      case 'dev':
        // 开发模式，只构建不打包
        log('开发模式构建...');
        await buildRenderer();
        await buildMain();
        await buildPreload();
        log('开发构建完成，可以使用 npm start 启动应用');
        break;
        
      default:
        console.log(`
使用方法: node scripts/build.js <command> [platform]

命令:
  clean              清理构建目录
  build              构建所有代码（不打包）
  package [platform] 构建并打包应用
  publish            构建、打包并发布应用
  dev                开发模式构建

平台 (可选):
  win                Windows
  mac                macOS  
  linux              Linux

示例:
  node scripts/build.js build
  node scripts/build.js package win
  node scripts/build.js publish
        `);
        break;
    }
  } catch (err) {
    error(`构建过程中发生错误: ${err.message}`);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  error(`未捕获的异常: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

main();