#!/usr/bin/env node

/**
 * 文档说明：
 * 从 SVG 源导出多平台图标：
 * 1) 读取 main/static/icons/*.svg
 * 2) 选定其中一个/多个，导出 1024 PNG
 * 3) 生成 macOS iconset 并打包为 .icns
 * 4) 生成 Windows .ico
 * 5) 输出 Linux 多尺寸 PNG
 *
 * 依赖：
 * - macOS: 系统自带 iconutil（用于 .icns）
 * - Node: sharp
 *
 * 用法：
 *   node scripts/generate-icons.js a  # 使用 app-icon-a.svg
 *   node scripts/generate-icons.js b  # 使用 app-icon-b.svg
 *   node scripts/generate-icons.js c  # 使用 app-icon-c.svg
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let sharp;

try {
  sharp = require('sharp');
} catch (e) {
  console.error('[icons] 缺少依赖 sharp，请先执行: npm i sharp -D');
  process.exit(1);
}

const VARIANT = (process.argv[2] || 'b').toLowerCase();
const svgMap = {
  a: 'app-icon-a.svg',
  b: 'app-icon-b.svg',
  c: 'app-icon-c.svg',
};

const svgName = svgMap[VARIANT] || svgMap.a;
const projectRoot = path.resolve(__dirname, '..');
const iconsDir = path.resolve(projectRoot, 'main/static/icons');
const outDir = path.resolve(projectRoot, 'build/icons');
const svgPath = path.join(iconsDir, svgName);

if (!fs.existsSync(svgPath)) {
  console.error(`[icons] 未找到 SVG: ${svgPath}`);
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/**
 * 从选定 SVG 导出 1024x1024 PNG 基准图。
 * @returns {Promise<string>} 生成的 PNG 绝对路径
 */
async function exportPngBase() {
  const png1024 = path.join(outDir, 'icon_1024.png');
  await sharp(svgPath).png({ quality: 95 }).resize(1024, 1024).toFile(png1024);
  console.log('[icons] 导出 1024 PNG 完成:', png1024);
  return png1024;
}

/**
 * 生成 macOS iconset 并打包为 .icns。
 * @param {string} png1024 - 1024 PNG 路径
 * @returns {Promise<string>} 生成的 .icns 路径（若失败则返回预期路径）
 */
async function exportMacIcns(png1024) {
  const iconsetDir = path.join(outDir, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  for (const size of sizes) {
    const base = path.join(iconsetDir, `icon_${size}x${size}.png`);
    await sharp(png1024).resize(size, size).toFile(base);
    if (size !== 1024) {
      await sharp(png1024).resize(size * 2, size * 2).toFile(path.join(iconsetDir, `icon_${size}x${size}@2x.png`));
    }
  }

  const icnsPath = path.join(outDir, 'app-icon.icns');
  try {
    execSync(`iconutil -c icns ${iconsetDir} -o ${icnsPath}`, { stdio: 'inherit' });
    console.log('[icons] 生成 .icns 完成:', icnsPath);
  } catch (e) {
    console.warn('[icons] 生成 .icns 失败（iconutil 不可用？），已保留 iconset 目录');
  }
  return icnsPath;
}

/**
 * 生成 Windows .ico（包含多尺寸）。
 * @param {string} png1024 - 1024 PNG 路径
 * @returns {Promise<string>} 生成的 .ico 路径
 */
async function exportWindowsIco(png1024) {
  const icoPath = path.join(outDir, 'app-icon.ico');
  // 多尺寸合并生成 .ico
  const buf16 = await sharp(png1024).resize(16, 16).png().toBuffer();
  const buf24 = await sharp(png1024).resize(24, 24).png().toBuffer();
  const buf32 = await sharp(png1024).resize(32, 32).png().toBuffer();
  const buf48 = await sharp(png1024).resize(48, 48).png().toBuffer();
  const buf64 = await sharp(png1024).resize(64, 64).png().toBuffer();
  const buf128 = await sharp(png1024).resize(128, 128).png().toBuffer();
  // png-to-ico@3 是 ESM 默认导出，这里做兼容处理
  let icoModule;
  try {
    // 优先 CommonJS 形式
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('png-to-ico');
    icoModule = mod && mod.default ? mod.default : mod;
  } catch {
    // 回退到动态 import（ESM-only 包）
    const mod = await import('png-to-ico');
    icoModule = mod && mod.default ? mod.default : mod;
  }

  if (typeof icoModule !== 'function') {
    throw new Error('png-to-ico 模块加载异常：未获得可调用的函数');
  }

  const out = await icoModule([buf16, buf24, buf32, buf48, buf64, buf128]);
  fs.writeFileSync(icoPath, out);
  console.log('[icons] 生成 .ico 完成:', icoPath);
  return icoPath;
}

/**
 * 导出 Linux 用多尺寸 PNG。
 * @param {string} png1024 - 1024 PNG 路径
 * @returns {Promise<void>}
 */
async function exportLinuxPngs(png1024) {
  const sizes = [512, 256, 128, 64, 48, 32, 24, 16];
  for (const size of sizes) {
    const out = path.join(outDir, `icon_${size}.png`);
    await sharp(png1024).resize(size, size).toFile(out);
  }
  console.log('[icons] 生成 Linux PNG 多尺寸完成');
}

(async function run() {
  console.log(`[icons] 使用方案: ${svgName}`);
  const png1024 = await exportPngBase();
  await exportMacIcns(png1024);
  try {
    await exportWindowsIco(png1024);
  } catch (e) {
    console.warn('[icons] 生成 ICO 失败（缺少 png-to-ico？）：', e.message);
    console.warn('         可执行: npm i png-to-ico -D');
  }
  await exportLinuxPngs(png1024);
  console.log('[icons] 全部完成，输出目录:', outDir);
})();


