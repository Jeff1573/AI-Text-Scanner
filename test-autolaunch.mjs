#!/usr/bin/env node

/**
 * 开机自启动测试脚本
 * 用于验证开机自启动功能修复是否有效
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== 开机自启动修复测试脚本 ===\n');

// 测试配置
const testConfig = {
  // 开发环境测试
  devCommand: 'npm start',
  // 测试超时时间（毫秒）
  timeout: 15000
};

/**
 * 运行开发环境测试
 */
async function testDevEnvironment() {
  console.log('🔧 测试开发环境启动...');
  
  try {
    // 启动开发服务器
    const child = spawn('npm', ['start'], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname
    });

    let output = '';
    let errorOutput = '';
    let hasError = false;

    // 收集输出
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // 实时显示重要日志
      if (text.includes('[Main]') || text.includes('[WindowManager]') || text.includes('[ConfigStore]') || text.includes('[AutoLaunch]')) {
        console.log(`📝 ${text.trim()}`);
      }
      
      // 检查是否有错误
      if (text.includes('Error:') || text.includes('TypeError:') || text.includes('ReferenceError:')) {
        hasError = true;
        console.log(`❌ 发现错误: ${text.trim()}`);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      
      // 显示错误输出
      if (!text.includes('DeprecationWarning') && !text.includes('ExperimentalWarning')) {
        console.log(`⚠️  ${text.trim()}`);
      }
    });

    // 设置超时
    const timeoutId = setTimeout(() => {
      console.log('\n⏰ 测试超时，应用启动成功（正常情况下应用会持续运行）');
      child.kill('SIGTERM');
    }, testConfig.timeout);

    // 等待应用退出或超时
    await new Promise((resolve, reject) => {
      child.on('exit', (code, signal) => {
        clearTimeout(timeoutId);
        
        if (signal === 'SIGTERM') {
          // 超时终止是正常的
          console.log('✅ 应用启动成功并正常运行');
          resolve();
        } else if (code === 0) {
          console.log('✅ 应用正常退出');
          resolve();
        } else {
          console.log(`❌ 应用异常退出: code=${code}, signal=${signal}`);
          reject(new Error(`应用退出码: ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error('❌ 应用启动失败:', error.message);
        reject(error);
      });
    });

    // 分析输出
    console.log('\n📊 分析测试结果...');
    analyzeOutput(output, errorOutput, hasError);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
  
  return true;
}

/**
 * 分析应用输出
 */
function analyzeOutput(stdout, stderr, hasError) {
  console.log('\n--- 输出分析 ---');
  
  // 检查关键日志
  const keyLogs = [
    { log: '[Main] 应用启动，开始初始化...', desc: '应用启动' },
    { log: '[Main] 管理器初始化完成', desc: '管理器初始化' },
    { log: '[WindowManager] 开始创建主窗口...', desc: '窗口创建开始' },
    { log: '[WindowManager] 主窗口创建完成', desc: '窗口创建完成' },
    { log: '[ConfigStore] 开始获取配置...', desc: '配置加载开始' },
    { log: '[Main] 应用初始化完成', desc: '应用初始化完成' }
  ];

  let foundLogs = 0;
  keyLogs.forEach(({ log, desc }) => {
    if (stdout.includes(log) || stderr.includes(log)) {
      console.log(`✅ ${desc}: 正常`);
      foundLogs++;
    } else {
      console.log(`❌ ${desc}: 缺失关键日志`);
    }
  });

  // 检查配置相关日志
  const configLogs = [
    { log: '[ConfigStore] 获取配置结果:', desc: '配置获取' },
    { log: '[ConfigStore] 设置配置:', desc: '配置设置' },
    { log: 'autoLaunch', desc: '开机自启配置' }
  ];

  let foundConfigLogs = 0;
  configLogs.forEach(({ log, desc }) => {
    if (stdout.includes(log) || stderr.includes(log)) {
      console.log(`✅ ${desc}: 正常`);
      foundConfigLogs++;
    } else {
      console.log(`⚠️  ${desc}: 未找到相关日志`);
    }
  });

  // 总结
  console.log('\n--- 测试总结 ---');
  console.log(`核心功能: ${foundLogs}/${keyLogs.length} 正常`);
  console.log(`配置功能: ${foundConfigLogs}/${configLogs.length} 正常`);
  console.log(`发现错误: ${hasError ? '是' : '否'}`);
  
  if (foundLogs >= keyLogs.length * 0.8 && !hasError) {
    console.log('🎉 测试通过！修复有效，应用启动正常');
    return true;
  } else if (hasError) {
    console.log('❌ 测试失败：仍然存在错误');
    return false;
  } else {
    console.log('⚠️  测试部分通过：部分功能可能需要进一步检查');
    return false;
  }
}

/**
 * 显示使用说明
 */
function showUsage() {
  console.log('\n📖 使用说明:');
  console.log('1. 确保已安装依赖: npm install');
  console.log('2. 运行此测试脚本: node test-autolaunch.mjs');
  console.log('3. 脚本会启动开发环境并分析输出');
  console.log('4. 观察是否还有开机自启动相关的错误');
  console.log('\n💡 提示: 如果测试通过，可以尝试打包应用进行最终验证');
}

/**
 * 检查环境
 */
function checkEnvironment() {
  console.log('🔍 检查环境...');
  
  // 检查 package.json
  if (!existsSync(join(__dirname, 'package.json'))) {
    console.log('❌ 未找到 package.json，请在项目根目录运行此脚本');
    return false;
  }
  
  // 检查 node_modules
  if (!existsSync(join(__dirname, 'node_modules'))) {
    console.log('❌ 未找到 node_modules，请先运行 npm install');
    return false;
  }
  
  console.log('✅ 环境检查通过');
  return true;
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始测试开机自启动修复效果...\n');
    
    // 检查环境
    if (!checkEnvironment()) {
      showUsage();
      process.exit(1);
    }
    
    // 运行测试
    const success = await testDevEnvironment();
    
    if (success) {
      console.log('\n🎉 修复测试完成！');
      console.log('💡 建议: 如果测试通过，可以运行 npm run make 打包应用进行最终验证');
    } else {
      console.log('\n❌ 修复测试失败，可能需要进一步调试');
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    process.exit(1);
  }
}

// 运行测试
main();