// 开机自启测试脚本
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 模拟打包后的环境
const testAutoLaunchStrategies = () => {
  console.log('=== 开机自启策略测试 ===');
  console.log(`当前执行路径: ${process.execPath}`);
  console.log(`平台: ${process.platform}`);
  
  if (process.platform === 'win32') {
    const appFolder = path.dirname(process.execPath);
    const exeName = path.basename(process.execPath);
    
    console.log(`应用目录: ${appFolder}`);
    console.log(`可执行文件名: ${exeName}`);
    
    // 测试所有策略
    const strategies = [
      {
        name: 'Squirrel Update.exe',
        path: path.resolve(appFolder, '..', 'Update.exe'),
        args: ['--processStart', exeName]
      },
      {
        name: 'Squirrel Standard',
        path: path.resolve(appFolder, '..', exeName),
        args: undefined
      },
      {
        name: 'Direct Executable',
        path: process.execPath,
        args: undefined
      }
    ];
    
    console.log('\n=== 策略可用性检查 ===');
    strategies.forEach(strategy => {
      const exists = fs.existsSync(strategy.path);
      console.log(`${strategy.name}: ${exists ? '✅ 可用' : '❌ 不可用'} - ${strategy.path}`);
      
      if (exists) {
        try {
          const options = { path: strategy.path };
          if (strategy.args) {
            options.args = strategy.args;
          }
          const settings = app.getLoginItemSettings(options);
          console.log(`  当前状态: ${settings.openAtLogin ? '已启用' : '未启用'}`);
        } catch (error) {
          console.log(`  检查失败: ${error.message}`);
        }
      }
    });
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  app.whenReady().then(() => {
    testAutoLaunchStrategies();
    app.quit();
  });
}

module.exports = { testAutoLaunchStrategies };