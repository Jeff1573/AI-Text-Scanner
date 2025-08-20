import winston from 'winston';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';    

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

// 定义日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'cyan',
};

// 添加颜色支持
winston.addColors(colors);

// 获取日志文件路径
const getLogPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'logs');
};

// 创建日志格式
const createLogFormat = (isConsole = false) => {
  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
      const moduleInfo = module ? `[${module}]` : '';
      const metaInfo = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level.toUpperCase()} ${moduleInfo} ${message}${metaInfo}`;
    })
  );

  if (isConsole) {
    return winston.format.combine(
      winston.format.colorize({ all: true }),
      baseFormat
    );
  }

  return baseFormat;
};

// 创建日志传输器
const createTransports = () => {
  const transports: winston.transport[] = [];

  // 控制台输出（开发环境）
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: createLogFormat(true),
      })
    );
  }

  // 文件输出
  const logPath = getLogPath();
  // const fs = require('fs');
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }

  // 错误日志文件
  transports.push(
    new winston.transports.File({
      filename: path.join(logPath, 'error.log'),
      level: 'error',
      format: createLogFormat(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // 所有日志文件
  transports.push(
    new winston.transports.File({
      filename: path.join(logPath, 'combined.log'),
      format: createLogFormat(),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );

  return transports;
};

// 创建主日志实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports: createTransports(),
  exitOnError: false,
});

// 创建模块日志器
export const createModuleLogger = (moduleName: string) => {
  return {
    error: (message: string, meta?: any) => logger.error(message, { module: moduleName, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { module: moduleName, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { module: moduleName, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { module: moduleName, ...meta }),
    verbose: (message: string, meta?: any) => logger.verbose(message, { module: moduleName, ...meta }),
  };
};

// 导出主日志实例
export default logger;
