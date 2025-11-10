#!/usr/bin/env node

/**
 * Electron + Vite 开发环境启动脚本
 * 同时启动 Vite 开发服务器和 Electron 应用
 */
const { spawn, execSync } = require("child_process");
const path = require("path");
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

    if (isWindows) {
      // 在Windows上使用npm脚本方式构建
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // 添加临时脚本
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts._buildMain =
        "vite build --config vite.main.config.ts";
      packageJson.scripts._buildPreload =
        "vite build --config vite.preload.config.ts";
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // 构建主进程
      execSync("npm run _buildMain", {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
        shell: true,
        encoding: "utf8",
      });

      // 构建预加载脚本
      execSync("npm run _buildPreload", {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
        shell: true,
        encoding: "utf8",
      });
    } else {
      // 在非Windows系统上直接使用npx
      // 构建主进程
      execSync("npx vite build --config vite.main.config.ts", {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
      });

      // 构建预加载脚本
      execSync("npx vite build --config vite.preload.config.ts", {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
      });
    }

    log("主进程和预加载脚本构建完成");
  } catch (err) {
    error(`构建失败: ${err.message}`);
  }
}

// 启动 Vite 开发服务器
function startViteDevServer() {
  log("启动 Vite 开发服务器...");

  try {
    let viteProcess;

    if (isWindows) {
      // 在Windows上使用npm脚本方式启动
      // 先在package.json中添加临时脚本
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // 添加临时脚本
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts._viteDevServer =
        "vite --config vite.renderer.config.ts";
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // 使用npm run命令运行，这在Windows上更可靠
      viteProcess = spawn("npm", ["run", "_viteDevServer"], {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
        shell: true, // 在Windows上需要使用shell
      });
    } else {
      // 在非Windows系统上直接使用npx
      viteProcess = spawn(
        "npx",
        ["vite", "--config", "vite.renderer.config.ts"],
        {
          stdio: "inherit",
          env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
        }
      );
    }

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
      let electronProcess;

      if (isWindows) {
        // 在Windows上使用 npm 脚本方式启动
        const packageJsonPath = path.join(process.cwd(), "package.json");
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        );

        // 添加临时脚本
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts._electronDev = "electron .";
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        electronProcess = spawn("npm", ["run", "_electronDev"], {
          stdio: "inherit",
          env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173", FORCE_COLOR: "1" },
          shell: true,
          encoding: "utf8",
        });
      } else {
        electronProcess = spawn("electron", ["."], {
          stdio: "inherit",
          env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
        });
      }

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

// 删除临时脚本
function cleanupTempScripts() {
  try {
    if (isWindows) {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        );

        // 删除所有临时脚本
        if (packageJson.scripts) {
          delete packageJson.scripts._viteDevServer;
          delete packageJson.scripts._electronDev;
          delete packageJson.scripts._buildMain;
          delete packageJson.scripts._buildPreload;

          fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2)
          );
          log("临时脚本清理完成");
        }
      }
    }
  } catch (err) {
    log(`清理临时脚本时出错: ${err.message}`);
  }
}

// 主函数
async function main() {
  try {
    // 设置环境变量 - 使用动态端口，让 Vite 自动选择可用端口
    process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";
    
    log("环境变量设置完成", { 
      VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL 
    });

    // 清理旧的构建文件
    clean();

    // 构建主进程和预加载脚本
    buildMainAndPreload();

    // 启动 Vite 开发服务器
    startViteDevServer();

    // 延迟启动 Electron
    startElectron();

  } catch (err) {
    cleanupTempScripts();
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