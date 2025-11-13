#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 路径调试信息 ===');

// 检查当前目录
console.log('当前目录:', process.cwd());

// 检查.vite目录
const viteDir = path.join(process.cwd(), '.vite');
if (fs.existsSync(viteDir)) {
  console.log('✓ .vite目录存在');
  
  const buildDir = path.join(viteDir, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('✓ .vite/build目录存在');
    const files = fs.readdirSync(buildDir);
    console.log('  - 文件:', files);
  }
  
  const rendererDir = path.join(viteDir, 'renderer');
  if (fs.existsSync(rendererDir)) {
    console.log('✓ .vite/renderer目录存在');
    const files = fs.readdirSync(rendererDir);
    console.log('  - 文件:', files);
    
    const htmlFile = path.join(rendererDir, 'index.html');
    if (fs.existsSync(htmlFile)) {
      console.log('✓ index.html存在');
      const content = fs.readFileSync(htmlFile, 'utf8');
      console.log('  - 内容预览:', content.substring(0, 200) + '...');
    }
  }
} else {
  console.log('✗ .vite目录不存在');
}

// 检查dist目录
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  console.log('✓ dist目录存在');
  
  const winUnpackedDir = path.join(distDir, 'win-unpacked');
  if (fs.existsSync(winUnpackedDir)) {
    console.log('✓ win-unpacked目录存在');
    
    const resourcesDir = path.join(winUnpackedDir, 'resources');
    if (fs.existsSync(resourcesDir)) {
      console.log('✓ resources目录存在');
      
      const appDir = path.join(resourcesDir, 'app');
      if (fs.existsSync(appDir)) {
        console.log('✓ app目录存在');
        
        const viteDir = path.join(appDir, '.vite');
        if (fs.existsSync(viteDir)) {
          console.log('✓ app/.vite目录存在');
          
          const rendererDir = path.join(viteDir, 'renderer');
          if (fs.existsSync(rendererDir)) {
            console.log('✓ app/.vite/renderer目录存在');
            const files = fs.readdirSync(rendererDir);
            console.log('  - 文件:', files);
            
            const htmlFile = path.join(rendererDir, 'index.html');
            if (fs.existsSync(htmlFile)) {
              console.log('✓ app/.vite/renderer/index.html存在');
              const content = fs.readFileSync(htmlFile, 'utf8');
              console.log('  - 内容预览:', content.substring(0, 200) + '...');
            }
          }
          
          const buildDir = path.join(viteDir, 'build');
          if (fs.existsSync(buildDir)) {
            console.log('✓ app/.vite/build目录存在');
            const files = fs.readdirSync(buildDir);
            console.log('  - 文件:', files);
          }
        }
      }
    }
  }
} else {
  console.log('✗ dist目录不存在');
}

console.log('=== 调试完成 ===');
