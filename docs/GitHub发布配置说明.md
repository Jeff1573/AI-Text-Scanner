# GitHub发布配置说明

## 安全配置最佳实践

### ❌ 不推荐的配置方式
```json
{
  "scripts": {
    "publish": "cross-env GITHUB_TOKEN=your_token_here && electron-forge publish"
  }
}
```

**问题：**
- Token直接硬编码在代码中
- 提交到Git仓库后Token永久暴露
- 存在严重安全风险

### ✅ 推荐的配置方式

#### 1. 使用环境变量文件

**步骤：**

1. **复制环境变量模板**
   ```bash
   cp .env.example .env
   ```

2. **编辑.env文件**
   ```bash
   # GitHub Configuration
   GITHUB_TOKEN=your_actual_github_token_here
   
   # 其他环境变量
   NODE_ENV=production
   ```

3. **获取GitHub Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：
     - `repo` (完整仓库访问权限)
     - `write:packages` (如果需要发布包)
   - 复制生成的Token

4. **运行发布命令**
   ```bash
   npm run publish
   ```

#### 2. 系统环境变量（可选）

**Windows:**
```cmd
set GITHUB_TOKEN=your_token_here
npm run publish
```

**Linux/Mac:**
```bash
export GITHUB_TOKEN=your_token_here
npm run publish
```

## 故障排除

### 常见错误及解决方案

1. **"Not Found" 错误**
   - 检查仓库是否存在：https://github.com/cat9L/ai-text-scanner
   - 确认Token权限是否足够
   - 验证Token是否有效

2. **"Bad credentials" 错误**
   - Token可能已过期
   - 重新生成Token
   - 检查Token格式是否正确

3. **"Repository not found" 错误**
   - 确认仓库名称和所有者正确
   - 检查Token是否有访问该仓库的权限

## 安全注意事项

1. **永远不要将Token提交到Git仓库**
2. **定期轮换Token**
3. **使用最小权限原则**
4. **监控Token使用情况**

## 相关文件

- `.env.example` - 环境变量模板
- `.gitignore` - 已配置忽略.env文件
- `forge.config.ts` - Electron Forge配置
- `package.json` - 项目配置
