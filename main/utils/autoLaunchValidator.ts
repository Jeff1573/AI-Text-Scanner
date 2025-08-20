import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger('AutoLaunchValidator');

export interface AutoLaunchValidationResult {
  isValid: boolean;
  strategy: string;
  path: string;
  registryExists: boolean;
  error?: string;
  details: {
    execPath: string;
    appFolder: string;
    exeName: string;
    availableStrategies: string[];
    electronSettings: Electron.LoginItemSettings;
  };
}

/**
 * 验证开机自启设置是否正确配置
 */
export async function validateAutoLaunchStatus(): Promise<AutoLaunchValidationResult> {
  try {
    logger.info("开始验证开机自启状态");
    
    const execPath = process.execPath;
    const appFolder = path.dirname(execPath);
    const exeName = path.basename(execPath);
    
    logger.info("系统路径信息", { execPath, appFolder, exeName });

    // 定义所有可能的策略，优先使用 Squirrel Update.exe 方式
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
        path: execPath,
        args: undefined
      }
    ];

    // 检查可用策略
    const availableStrategies: string[] = [];
    let activeStrategy = null;
    let electronSettings = null;

    for (const strategy of strategies) {
      const exists = fs.existsSync(strategy.path);
      logger.debug("检查策略", { name: strategy.name, exists, path: strategy.path });
      
      if (exists) {
        availableStrategies.push(strategy.name);
        
        // 检查此策略的 Electron 设置
        const options: { path: string; args?: string[] } = { path: strategy.path };
        if (strategy.args) {
          options.args = strategy.args;
        }
        
        const settings = app.getLoginItemSettings(options);
        logger.debug("策略Electron设置", { name: strategy.name, settings });
        
        if (settings.openAtLogin && !activeStrategy) {
          activeStrategy = strategy;
          electronSettings = settings;
        }
      }
    }

    // Windows 注册表验证（仅在 Windows 上）
    let registryExists = false;
    if (process.platform === 'win32') {
      registryExists = await checkWindowsRegistry(exeName);
    }

    const result: AutoLaunchValidationResult = {
      isValid: !!activeStrategy && (process.platform !== 'win32' || registryExists),
      strategy: activeStrategy?.name || 'None',
      path: activeStrategy?.path || '',
      registryExists,
      details: {
        execPath,
        appFolder,
        exeName,
        availableStrategies,
        electronSettings
      }
    };

    logger.info("验证结果", result);
    return result;

  } catch (error) {
    logger.error("验证失败", { error });
    return {
      isValid: false,
      strategy: 'Error',
      path: '',
      registryExists: false,
      error: error instanceof Error ? error.message : String(error),
      details: {
        execPath: process.execPath,
        appFolder: path.dirname(process.execPath),
        exeName: path.basename(process.execPath),
        availableStrategies: [],
        electronSettings: null
      }
    };
  }
}

/**
 * 检查 Windows 注册表中的开机自启项
 */
async function checkWindowsRegistry(appName: string): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // 查询注册表中的开机自启项
    const command = `reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" 2>nul`;
    
    logger.debug("执行注册表查询", { command });
    
    try {
      const { stdout } = await execAsync(command);
      const exists = stdout.includes(appName);
      logger.debug("注册表项检查结果", { exists });
      return exists;
    } catch (regError) {
      // 注册表项不存在时 reg query 会返回错误码，这是正常的
      logger.debug("注册表项不存在 (这是正常的)");
      return false;
    }
  } catch (error) {
    logger.error("注册表检查失败", { error });
    return false;
  }
}

/**
 * 获取开机自启的详细诊断信息
 */
export async function getAutoLaunchDiagnostics(): Promise<string> {
  const validation = await validateAutoLaunchStatus();
  
  let report = `=== 开机自启诊断报告 ===\n\n`;
  report += `验证状态: ${validation.isValid ? '✅ 正常' : '❌ 异常'}\n`;
  report += `当前策略: ${validation.strategy}\n`;
  report += `启动路径: ${validation.path}\n`;
  report += `注册表项: ${validation.registryExists ? '✅ 存在' : '❌ 不存在'}\n\n`;
  
  report += `=== 系统信息 ===\n`;
  report += `执行路径: ${validation.details.execPath}\n`;
  report += `应用目录: ${validation.details.appFolder}\n`;
  report += `可执行文件: ${validation.details.exeName}\n`;
  report += `可用策略: ${validation.details.availableStrategies.join(', ')}\n\n`;
  
  if (validation.details.electronSettings) {
    report += `=== Electron 设置 ===\n`;
    report += JSON.stringify(validation.details.electronSettings, null, 2) + '\n\n';
  }
  
  if (validation.error) {
    report += `=== 错误信息 ===\n`;
    report += validation.error + '\n\n';
  }
  
  report += `=== 建议 ===\n`;
  if (!validation.isValid) {
    if (!validation.registryExists && process.platform === 'win32') {
      report += `- 注册表项缺失，建议重新设置开机自启\n`;
    }
    if (validation.strategy === 'None') {
      report += `- 未找到有效的启动策略，请检查应用安装路径\n`;
    }
    if (validation.error) {
      report += `- 修复错误: ${validation.error}\n`;
    }
  } else {
    report += `- 开机自启配置正常\n`;
  }
  
  return report;
}