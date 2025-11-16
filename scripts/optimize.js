#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 自动优化脚本
 * 清理不必要的文件，减小包大小
 */

const log = (message) => {
  console.log(`[OPTIMIZE] ${new Date().toLocaleTimeString()} - ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`);
};

function cleanNodeModules() {
  log('清理 node_modules 中的不必要文件...');
  
  const cleanPatterns = [
    'node_modules/**/*.md',
    'node_modules/**/*.txt',
    'node_modules/**/README*',
    'node_modules/**/CHANGELOG*',
    'node_modules/**/HISTORY*',
    'node_modules/**/LICENSE*',
    'node_modules/**/LICENCE*',
    'node_modules/**/test/**',
    'node_modules/**/tests/**',
    'node_modules/**/__tests__/**',
    'node_modules/**/spec/**',
    'node_modules/**/example/**',
    'node_modules/**/examples/**',
    'node_modules/**/demo/**',
    'node_modules/**/docs/**',
    'node_modules/**/.github/**',
    'node_modules/**/coverage/**',
    'node_modules/**/*.map',
    'node_modules/**/.eslintrc*',
    'node_modules/**/.prettierrc*',
    'node_modules/**/tsconfig.json',
    'node_modules/**/webpack.config.js',
    'node_modules/**/rollup.config.js',
    'node_modules/**/jest.config.js',
    'node_modules/**/karma.conf.js'
  ];
  
  let totalCleaned = 0;
  
  cleanPatterns.forEach(pattern => {
    try {
      // 使用 PowerShell 删除匹配的文件
      const command = `Get-ChildItem -Path "${pattern}" -Recurse -Force | Remove-Item -Force -Recurse`;
      execSync(command, { stdio: 'pipe', shell: 'powershell' });
      totalCleaned++;
    } catch (err) {
      // 忽略不存在的文件
    }
  });
  
  log(`清理完成，处理了 ${totalCleaned} 个模式`);
}

function removeUnnecessaryLanguages() {
  log('移除不必要的语言包...');
  
  const langDirs = [
    'node_modules/**/locale/**',
    'node_modules/**/locales/**',
    'node_modules/**/lang/**',
    'node_modules/**/languages/**',
    'node_modules/**/i18n/**'
  ];
  
  // 保留英语和中文，删除其他语言
  const keepLangs = ['en', 'zh', 'zh-cn', 'zh_cn', 'zh-hans'];
  
  langDirs.forEach(pattern => {
    try {
      const command = `Get-ChildItem -Path "${pattern}" -Recurse | Where-Object { $_.Name -notin @('${keepLangs.join("','")}') } | Remove-Item -Force -Recurse`;
      execSync(command, { stdio: 'pipe', shell: 'powershell' });
    } catch (err) {
      // 忽略不存在的目录
    }
  });
  
  log('语言包清理完成');
}

function optimizeElectronCache() {
  log('清理 Electron 缓存...');
  
  const electronCacheDir = path.join(process.env.USERPROFILE || process.env.HOME, '.cache', 'electron');
  
  if (fs.existsSync(electronCacheDir)) {
    try {
      execSync(`Remove-Item -Path "${electronCacheDir}" -Recurse -Force`, { 
        stdio: 'pipe', 
        shell: 'powershell' 
      });
      log('Electron 缓存清理完成');
    } catch (err) {
      error('清理 Electron 缓存失败');
    }
  }
}

function analyzeAndSuggest() {
  log('分析包大小并提供建议...');
  
  try {
    // 运行分析脚本
    execSync('node scripts/analyze-size.js', { stdio: 'inherit' });
  } catch (err) {
    error('包大小分析失败');
  }
}

function updateElectronBuilderConfig() {
  log('检查 electron-builder 配置优化...');
  
  const configPath = 'electron-builder.config.js';
  
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    
    const optimizations = [
      'compression: \'maximum\'',
      'asar: { smartUnpack: true }',
      'removePackageScripts: true',
      'removePackageKeywords: true',
      'includePdb: false',
      'buildDependenciesFromSource: false',
      'nodeGypRebuild: false'
    ];
    
    const missing = optimizations.filter(opt => !config.includes(opt));
    
    if (missing.length > 0) {
      log('发现缺少的优化配置:');
      missing.forEach(opt => log(`  - ${opt}`));
    } else {
      log('electron-builder 配置已优化 ✅');
    }
  }
}

function checkPackageJsonOptimizations() {
  log('检查 package.json 优化机会...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 检查是否有开发依赖在生产依赖中
    const devInProd = [];
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    dependencies.forEach(dep => {
      if (dep.includes('eslint') || 
          dep.includes('typescript') || 
          dep.includes('@types') ||
          dep.includes('vite') ||
          dep.includes('babel') ||
          dep.includes('@vitejs')) {
        devInProd.push(dep);
      }
    });
    
    if (devInProd.length > 0) {
      log('⚠️  发现应该移到 devDependencies 的包:');
      devInProd.forEach(dep => log(`  - ${dep}`));
      log('建议运行: npm uninstall ' + devInProd.join(' '));
      log('然后运行: npm install --save-dev ' + devInProd.join(' '));
    } else {
      log('package.json 依赖配置正确 ✅');
    }
    
  } catch (err) {
    error('无法分析 package.json');
  }
}

async function main() {
  console.log('🚀 开始优化 AI Text Scanner 包大小...\n');
  
  const steps = [
    { name: '清理 node_modules', fn: cleanNodeModules },
    { name: '移除不必要的语言包', fn: removeUnnecessaryLanguages },
    { name: '优化 Electron 缓存', fn: optimizeElectronCache },
    { name: '检查配置优化', fn: updateElectronBuilderConfig },
    { name: '检查 package.json', fn: checkPackageJsonOptimizations },
    { name: '分析包大小', fn: analyzeAndSuggest }
  ];
  
  for (const step of steps) {
    console.log(`\n📋 ${step.name}:`);
    try {
      await step.fn();
    } catch (err) {
      error(`${step.name} 失败: ${err.message}`);
    }
  }
  
  console.log('\n🎉 优化完成！\n');
  console.log('💡 建议步骤:');
  console.log('1. 运行 npm run clean 清理构建目录');
  console.log('2. 运行 npm run build 重新构建');
  console.log('3. 运行 npm run package 测试打包效果');
  console.log('4. 检查生成的安装包大小是否有改善');
}

main();