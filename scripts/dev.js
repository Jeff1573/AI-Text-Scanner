#!/usr/bin/env node

/**
 * Electron + Vite 开发环境启动脚本
 * 同时启动 Vite 开发服务器和 Electron 应用
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");

// Windows系统需要特殊处理命令
const isWindows = process.platform === "win32";

// 设置Windows控制台编码为UTF-8，避免中文乱码
if (isWindows) {
  try {
    // 设置控制台代码页为UTF-8 (65001)
    execSync("chcp 65001 >nul", { shell: true, stdio: "ignore" });
    // 启用虚拟终端处理以支持ANSI颜色码
    process.env.FORCE_COLOR = "1";
  } catch (err) {
    // 如果设置失败，继续执行（可能在某些环境下不支持）
    console.warn("无法设置控制台编码为UTF-8，可能会显示乱码");
  }
} else {
  // 非Windows系统也启用颜色支持
  process.env.FORCE_COLOR = "1";
}

// 定义日志函数
const log = (message) => {
  console.log(`[DEV] ${new Date().toLocaleTimeString()} - ${message}`);
};

const error = (message) => {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`);
  process.exit(1);
};

// 清理构建目录
function clean() {
  log("清理构建目录...");
  try {
    if (fs.existsSync(".vite/build")) {
      fs.rmSync(".vite/build", { recursive: true, force: true });
    }
    log("清理完成");
  } catch (err) {
    error(`清理失败: ${err.message}`);
  }
}

// 构建主进程和预加载脚本
function buildMainAndPreload() {
  log("构建主进程和预加载脚本...");
  try {
    // 设置环境变量
    process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";

    // 统一使用 npx 直接执行命令，不修改 package.json
    // 构建主进程
    execSync("npx vite build --config vite.main.config.ts", {
      stdio: "inherit",
      env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
      encoding: "utf8",
      shell: isWindows ? true : false,
    });

    // 构建预加载脚本
    execSync("npx vite build --config vite.preload.config.ts", {
      stdio: "inherit",
      env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
      encoding: "utf8",
      shell: isWindows ? true : false,
    });

    log("主进程和预加载脚本构建完成");
  } catch (err) {
    error(`构建失败: ${err.message}`);
  }
}

// 启动 Vite 开发服务器
function startViteDevServer() {
  log("启动 Vite 开发服务器...");

  try {
    // 统一使用 npx 直接执行命令，不修改 package.json
    const viteProcess = spawn(
      "npx",
      ["vite", "--config", "vite.renderer.config.ts"],
      {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
        shell: isWindows ? true : false,
      }
    );

    viteProcess.on("error", (err) => {
      error(`Vite 开发服务器启动失败: ${err.message}`);
    });

    return viteProcess;
  } catch (err) {
    error(`启动Vite开发服务器出错: ${err.message}`);
    return null;
  }
}

// 延迟启动 Electron (等待 Vite 服务器启动)
function startElectron() {
  log("等待 Vite 开发服务器启动...");

  // 给 Vite 服务器一些启动时间
  setTimeout(() => {
    log("启动 Electron 应用...");

    try {
      // 统一使用 npx 直接执行命令，不修改 package.json
      const electronProcess = spawn("npx", ["electron", "."], {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
        shell: isWindows ? true : false,
      });

      electronProcess.on("error", (err) => {
        error(`Electron 启动失败: ${err.message}`);
      });

      // 当 Electron 退出时，也退出 Vite
      electronProcess.on("exit", (code) => {
        log(`Electron 进程退出，退出码: ${code}`);
        process.exit(0);
      });
    } catch (err) {
      error(`启动Electron应用出错: ${err.message}`);
    }
  }, 5000); // 增加等待时间到 5 秒以确保 Vite 服务器已启动
}

// 清理函数（不再需要清理 package.json，但保留函数以防将来需要）
function cleanupTempScripts() {
  // 不再需要清理 package.json，因为不再修改它
  // 保留此函数以避免破坏现有的清理调用
}

// 主函数
async function main() {
  try {
    // 设置环境变量 - 使用动态端口，让 Vite 自动选择可用端口
    process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";
    
    log("环境变量设置完成");

    // 清理旧的构建文件
    clean();

    // 构建主进程和预加载脚本
    buildMainAndPreload();

    // 启动 Vite 开发服务器
    startViteDevServer();

    // 延迟启动 Electron
    startElectron();

  } catch (err) {
    error(`开发环境启动失败: ${err.message}`);
  }
}

// 处理进程退出
process.on("SIGINT", () => {
  log("收到中断信号，退出开发环境...");
  cleanupTempScripts();
  process.exit(0);
});

// 正常退出和异常退出时都清理
process.on("exit", () => {
  cleanupTempScripts();
});

// 处理未捕获异常
process.on("uncaughtException", (err) => {
  error(`未捕获异常: ${err.message}`);
  cleanupTempScripts();
  process.exit(1);
});

// 启动
main();