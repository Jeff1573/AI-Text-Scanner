#!/usr/bin/env node

/**
 * 测试更新功能配置的脚本
 * 用于验证electron-updater的配置是否正确
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 测试更新功能配置...\n');

// 检查package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`📱 当前应用版本: ${packageJson.version}`);
  console.log(`📦 应用名称: ${packageJson.name}`);
  console.log(`🏷️  产品名称: ${packageJson.productName}`);
} else {
  console.log('❌ 未找到package.json文件');
  process.exit(1);
}

// 检查electron-builder配置
const builderConfigPath = path.join(__dirname, '..', 'electron-builder.config.js');
if (fs.existsSync(builderConfigPath)) {
  console.log('\n📋 electron-builder配置检查:');
  const configContent = fs.readFileSync(builderConfigPath, 'utf8');
  
  // 检查关键配置项
  const checks = [
    { name: 'appId', pattern: /appId:\s*["']([^"']+)["']/, required: true },
    { name: 'productName', pattern: /productName:\s*["']([^"']+)["']/, required: true },
    { name: 'publish配置', pattern: /provider:\s*["']github["']/, required: true },
    { name: 'GitHub仓库', pattern: /repo:\s*["']AI-Text-Scanner["']/, required: true },
    { name: '更新缓存目录', pattern: /updaterCacheDirName:/, required: false },
  ];
  
  checks.forEach(check => {
    const match = configContent.match(check.pattern);
    if (match) {
      console.log(`✅ ${check.name}: ${match[1] || '已配置'}`);
    } else if (check.required) {
      console.log(`❌ ${check.name}: 未找到`);
    } else {
      console.log(`⚠️  ${check.name}: 未配置（可选）`);
    }
  });
} else {
  console.log('\n❌ 未找到electron-builder.config.js文件');
}

// 检查依赖
console.log('\n📦 依赖检查:');
const packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = packageJsonData.dependencies || {};
const devDependencies = packageJsonData.devDependencies || {};

const requiredDeps = [
  { name: 'electron-updater', type: 'dependencies' },
  { name: 'electron-builder', type: 'devDependencies' },
];

requiredDeps.forEach(dep => {
  const source = dep.type === 'dependencies' ? dependencies : devDependencies;
  if (source[dep.name]) {
    console.log(`✅ ${dep.name}: ${source[dep.name]}`);
  } else {
    console.log(`❌ ${dep.name}: 未安装`);
  }
});

// 检查文件结构
console.log('\n📁 文件结构检查:');
const filesToCheck = [
  'main/managers/updateManager.ts',
  'main/managers/ipcHandlers.ts',
  'renderer/src/components/UpdateChecker.tsx',
  'renderer/src/types/electron.d.ts',
  'main/preload.ts',
];

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}: 未找到`);
  }
});

// 检查网络连接
console.log('\n🌐 网络连接测试:');
const https = require('https');

const testConnection = (url) => {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log(`✅ ${url}: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${url}: 连接超时`);
      req.destroy();
      resolve(false);
    });
  });
};

Promise.all([
  testConnection('https://api.github.com'),
  testConnection('https://github.com'),
  testConnection('https://update.electronjs.org')
]).then(() => {
  console.log('\n✅ 更新功能配置检查完成');
  console.log('\n💡 提示:');
  console.log('- 确保GitHub仓库已配置正确的发布设置');
  console.log('- 确保package.json中的版本号正确');
  console.log('- 确保electron-builder配置中的publish设置正确');
  console.log('- 在开发环境中，更新功能可能无法正常工作');
  console.log('- 要测试实际更新功能，请构建并运行应用');
});
