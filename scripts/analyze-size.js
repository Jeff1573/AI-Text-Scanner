#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 包大小分析脚本
 * 分析node_modules、构建输出等文件大小
 */

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // 忽略无法访问的目录
  }
  
  return totalSize;
}

function analyzeNodeModules() {
  console.log('📦 分析 node_modules 大小...\n');
  
  const nodeModulesPath = 'node_modules';
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules 目录不存在');
    return;
  }
  
  const modules = [];
  const dirs = fs.readdirSync(nodeModulesPath);
  
  for (const dir of dirs) {
    if (dir.startsWith('.')) continue;
    
    const modulePath = path.join(nodeModulesPath, dir);
    const stats = fs.statSync(modulePath);
    
    if (stats.isDirectory()) {
      const size = getDirectorySize(modulePath);
      modules.push({ name: dir, size, path: modulePath });
    }
  }
  
  // 按大小排序
  modules.sort((a, b) => b.size - a.size);
  
  console.log('🔥 最大的依赖包（前20个）：');
  console.log('='.repeat(60));
  
  modules.slice(0, 20).forEach((module, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${module.name.padEnd(30)} ${formatBytes(module.size)}`);
  });
  
  const totalSize = modules.reduce((sum, module) => sum + module.size, 0);
  console.log('='.repeat(60));
  console.log(`📊 node_modules 总大小: ${formatBytes(totalSize)}`);
  
  return { modules, totalSize };
}

function analyzeBuildOutput() {
  console.log('\n🏗️  分析构建输出大小...\n');
  
  const buildDirs = ['.vite', 'dist'];
  
  for (const dir of buildDirs) {
    if (fs.existsSync(dir)) {
      const size = getDirectorySize(dir);
      console.log(`📁 ${dir.padEnd(10)} ${formatBytes(size)}`);
    }
  }
}

function analyzePackageJson() {
  console.log('\n📋 分析 package.json 依赖...\n');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    console.log(`📦 生产依赖: ${dependencies.length} 个`);
    console.log(`🛠️  开发依赖: ${devDependencies.length} 个`);
    
    console.log('\n生产依赖列表:');
    dependencies.forEach(dep => console.log(`  - ${dep}`));
    
    // 检查是否有不必要的生产依赖
    const suspiciousProduction = dependencies.filter(dep => 
      dep.includes('eslint') || 
      dep.includes('typescript') || 
      dep.includes('@types') ||
      dep.includes('vite') ||
      dep.includes('babel')
    );
    
    if (suspiciousProduction.length > 0) {
      console.log('\n⚠️  可能应该移到 devDependencies 的包:');
      suspiciousProduction.forEach(dep => console.log(`  - ${dep}`));
    }
    
  } catch (err) {
    console.log('❌ 无法读取 package.json');
  }
}

function suggestOptimizations() {
  console.log('\n💡 优化建议:\n');
  
  const suggestions = [
    '1. 移除不必要的依赖包',
    '2. 将开发工具移到 devDependencies',
    '3. 使用 electron-builder 的文件过滤功能',
    '4. 启用 ASAR 压缩',
    '5. 使用 tree-shaking 移除未使用的代码',
    '6. 考虑使用 CDN 加载大型库',
    '7. 分析 bundle 大小并进行代码分割',
    '8. 移除多余的语言包和本地化文件'
  ];
  
  suggestions.forEach(suggestion => {
    console.log(`💡 ${suggestion}`);
  });
}

function checkElectronSize() {
  console.log('\n⚡ Electron 运行时分析...\n');
  
  try {
    const electronPath = path.join('node_modules', 'electron', 'dist');
    if (fs.existsSync(electronPath)) {
      const electronSize = getDirectorySize(electronPath);
      console.log(`⚡ Electron 运行时大小: ${formatBytes(electronSize)}`);
      
      // 检查是否包含多个架构
      const files = fs.readdirSync(electronPath);
      console.log('📁 Electron 内容:', files.join(', '));
    }
  } catch (err) {
    console.log('❌ 无法分析 Electron 大小');
  }
}

async function main() {
  console.log('🔍 AI Text Scanner 包大小分析工具\n');
  console.log('='.repeat(80));
  
  try {
    analyzePackageJson();
    analyzeNodeModules();
    analyzeBuildOutput();
    checkElectronSize();
    suggestOptimizations();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 优化目标: 将最终安装包大小控制在 200MB 以下');
    console.log('💡 运行 npm run optimize 应用优化建议');
    
  } catch (err) {
    console.error('❌ 分析过程中发生错误:', err.message);
  }
}

main();