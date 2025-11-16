#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Electron Builder 测试和验证脚本
 */

const log = (message) => {
  console.log(`[TEST] ${new Date().toLocaleTimeString()} - ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`);
};

const success = (message) => {
  console.log(`[SUCCESS] ${new Date().toLocaleTimeString()} - ✅ ${message}`);
};

async function checkPrerequisites() {
  log('检查系统环境...');
  
  // 检查 Node.js 版本
  const nodeVersion = process.version;
  log(`Node.js 版本: ${nodeVersion}`);
  
  if (parseInt(nodeVersion.substring(1)) < 16) {
    error('需要 Node.js 16 或更高版本');
    return false;
  }
  
  // 检查 npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm 版本: ${npmVersion}`);
  } catch (err) {
    error('npm 未安装或不可用');
    return false;
  }
  
  // 检查 Electron Builder
  try {
    const builderVersion = execSync('npx electron-builder --version', { encoding: 'utf8' }).trim();
    log(`Electron Builder 版本: ${builderVersion}`);
  } catch (err) {
    error('Electron Builder 未安装，请运行: npm install electron-builder');
    return false;
  }
  
  success('系统环境检查通过');
  return true;
}

async function validateConfig() {
  log('验证配置文件...');
  
  // 检查主配置文件
  if (!fs.existsSync('electron-builder.config.js')) {
    error('electron-builder.config.js 不存在');
    return false;
  }
  
  try {
    const config = require(path.resolve('electron-builder.config.js'));
    
    // 验证必要的配置项
    const requiredFields = ['appId', 'productName'];
    for (const field of requiredFields) {
      if (!config[field]) {
        error(`配置缺少必要字段: ${field}`);
        return false;
      }
    }
    
    log(`应用ID: ${config.appId}`);
    log(`产品名称: ${config.productName}`);
    
    success('配置文件验证通过');
  } catch (err) {
    error(`配置文件加载失败: ${err.message}`);
    return false;
  }
  
  return true;
}

async function checkFiles() {
  log('检查必要文件...');
  
  const requiredFiles = [
    'package.json',
    'scripts/build.js',
    'electron-builder.config.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    error(`缺少必要文件: ${missingFiles.join(', ')}`);
    return false;
  }
  
  // 检查构建脚本是否可执行
  try {
    fs.accessSync('scripts/build.js', fs.constants.F_OK);
    success('所有必要文件都存在');
  } catch (err) {
    error('构建脚本不可访问');
    return false;
  }
  
  return true;
}

async function testBuild() {
  log('测试构建流程...');
  
  try {
    // 清理之前的构建
    log('清理构建目录...');
    execSync('node scripts/build.js clean', { stdio: 'inherit' });
    
    // 执行构建
    log('开始构建...');
    execSync('node scripts/build.js build', { stdio: 'inherit' });
    
    // 检查构建输出
    if (fs.existsSync('.vite/build')) {
      success('构建完成，输出目录存在');
    } else {
      error('构建完成但输出目录不存在');
      return false;
    }
    
    return true;
  } catch (err) {
    error(`构建失败: ${err.message}`);
    return false;
  }
}

async function testPackage() {
  log('测试打包流程...');
  
  const platform = os.platform();
  let platformArg = '';
  
  switch (platform) {
    case 'win32':
      platformArg = 'win';
      break;
    case 'darwin':
      platformArg = 'mac';
      break;
    case 'linux':
      platformArg = 'linux';
      break;
    default:
      log(`未知平台: ${platform}，使用默认设置`);
  }
  
  try {
    const command = platformArg 
      ? `node scripts/build.js package ${platformArg}`
      : 'node scripts/build.js package';
      
    log(`执行打包命令: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
    });
    
    // 检查输出
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist');
      if (distFiles.length > 0) {
        success('打包完成');
        log('生成的文件:');
        distFiles.forEach(file => log(`  - ${file}`));
      } else {
        error('打包完成但dist目录为空');
        return false;
      }
    } else {
      error('打包完成但dist目录不存在');
      return false;
    }
    
    return true;
  } catch (err) {
    error(`打包失败: ${err.message}`);
    
    // 提供调试建议
    console.log('\n🔧 调试建议:');
    console.log('1. 检查图标文件是否存在');
    console.log('2. 确保没有其他Electron进程在运行');
    console.log('3. 尝试以管理员权限运行 (Windows)');
    console.log('4. 检查磁盘空间是否充足');
    console.log('5. 查看详细错误日志: DEBUG=electron-builder npm run package');
    
    return false;
  }
}

async function showUsage() {
  console.log(`
🧪 Electron Builder 测试脚本

用法: node scripts/test-builder.js [命令]

命令:
  check      检查环境和配置
  build      测试构建流程
  package    测试打包流程
  all        运行所有测试 (默认)
  help       显示此帮助信息

示例:
  node scripts/test-builder.js check
  node scripts/test-builder.js build
  node scripts/test-builder.js package

环境变量:
  CSC_IDENTITY_AUTO_DISCOVERY=false  # 禁用代码签名
  DEBUG=electron-builder            # 启用详细日志
`);
}

async function runAllTests() {
  console.log('🧪 开始 Electron Builder 完整测试\n');
  
  const tests = [
    { name: '环境检查', fn: checkPrerequisites },
    { name: '配置验证', fn: validateConfig },
    { name: '文件检查', fn: checkFiles },
    { name: '构建测试', fn: testBuild },
    { name: '打包测试', fn: testPackage }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 ${test.name}:`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      
      if (result) {
        success(`${test.name} 通过`);
      } else {
        error(`${test.name} 失败`);
      }
    } catch (err) {
      error(`${test.name} 异常: ${err.message}`);
      results.push({ name: test.name, passed: false, error: err.message });
    }
  }
  
  // 显示结果摘要
  console.log('\n📊 测试结果摘要:');
  console.log('='.repeat(50));
  
  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    console.log(`${result.name.padEnd(20)} ${status}`);
    if (result.passed) passedCount++;
  });
  
  console.log('='.repeat(50));
  console.log(`总计: ${passedCount}/${results.length} 项测试通过`);
  
  if (passedCount === results.length) {
    console.log('\n🎉 所有测试通过！Electron Builder 配置正确。');
    console.log('\n📚 接下来可以:');
    console.log('1. npm run dev     # 开发模式');
    console.log('2. npm run dist    # 生成分发包');
    console.log('3. npm run publish # 发布到GitHub');
  } else {
    console.log('\n⚠️  有测试失败，请检查上述错误信息。');
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2] || 'all';
  
  switch (command) {
    case 'check':
      await checkPrerequisites();
      await validateConfig();
      await checkFiles();
      break;
    case 'build':
      await testBuild();
      break;
    case 'package':
      await testPackage();
      break;
    case 'all':
      await runAllTests();
      break;
    case 'help':
    default:
      await showUsage();
      break;
  }
}

// 异常处理
process.on('uncaughtException', (err) => {
  error(`未捕获的异常: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

main();