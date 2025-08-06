/**
 * Critical CSS 提取和内联工具
 * 用于提取首屏关键CSS并内联到HTML中
 */

import fs from 'fs'
import path from 'path'

/**
 * 关键CSS规则定义
 * 这些是首屏渲染必需的CSS规则
 */
const CRITICAL_CSS_RULES = [
  // 基础布局
  'html', 'body', '*',
  // 容器和布局
  '.wrapper', '.container', '.main',
  // 导航相关
  '.sticky-nav', '.nav', '.header',
  // 首屏内容
  '.hero', '.banner', '.intro',
  // 字体和文本
  'h1', 'h2', 'h3', 'p', 'a',
  // 基础样式
  '.text-', '.bg-', '.flex', '.block', '.inline',
  // 响应式
  '@media',
  // 深色模式基础
  '.dark', '.light',
  // 加载状态
  '.loading', '.skeleton'
]

/**
 * 提取关键CSS
 * @param {string} cssContent - 完整的CSS内容
 * @returns {string} - 关键CSS内容
 */
export function extractCriticalCSS(cssContent) {
  if (!cssContent) return ''
  
  const lines = cssContent.split('\n')
  const criticalLines = []
  let inCriticalRule = false
  let braceCount = 0
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 检查是否是关键CSS规则
    const isCritical = CRITICAL_CSS_RULES.some(rule => {
      if (rule.startsWith('@')) {
        return trimmedLine.startsWith(rule)
      }
      return trimmedLine.includes(rule)
    })
    
    if (isCritical) {
      inCriticalRule = true
    }
    
    if (inCriticalRule) {
      criticalLines.push(line)
      
      // 计算大括号数量来确定规则结束
      braceCount += (line.match(/{/g) || []).length
      braceCount -= (line.match(/}/g) || []).length
      
      if (braceCount === 0 && trimmedLine.endsWith('}')) {
        inCriticalRule = false
      }
    }
  }
  
  return criticalLines.join('\n')
}

/**
 * 生成内联CSS标签
 * @param {string} criticalCSS - 关键CSS内容
 * @returns {string} - HTML style标签
 */
export function generateInlineCSS(criticalCSS) {
  if (!criticalCSS) return ''
  
  // 压缩CSS
  const minifiedCSS = criticalCSS
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
    .replace(/\s+/g, ' ') // 压缩空白
    .replace(/;\s*}/g, '}') // 移除最后的分号
    .trim()
  
  return `<style id="critical-css">${minifiedCSS}</style>`
}

/**
 * 创建非关键CSS的延迟加载脚本
 * @param {string[]} cssFiles - CSS文件路径数组
 * @returns {string} - 延迟加载脚本
 */
export function generateDeferredCSSScript(cssFiles) {
  if (!cssFiles || cssFiles.length === 0) return ''
  
  const script = `
<script>
(function() {
  // 延迟加载非关键CSS
  const cssFiles = ${JSON.stringify(cssFiles)};
  
  function loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = function() {
      this.media = 'all';
    };
    document.head.appendChild(link);
  }
  
  // 在页面加载完成后加载非关键CSS
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      cssFiles.forEach(loadCSS);
    });
  } else {
    cssFiles.forEach(loadCSS);
  }
})();
</script>`
  
  return script
}

/**
 * 获取构建后的CSS文件列表
 * @returns {string[]} - CSS文件路径数组
 */
export function getBuildCSSFiles() {
  try {
    const buildDir = path.join(process.cwd(), '.next/static/css')
    if (!fs.existsSync(buildDir)) {
      return []
    }
    
    const files = fs.readdirSync(buildDir)
    return files
      .filter(file => file.endsWith('.css'))
      .map(file => `/_next/static/css/${file}`)
  } catch (error) {
    console.warn('Failed to get CSS files:', error.message)
    return []
  }
}

/**
 * Critical CSS 配置
 */
export const CRITICAL_CSS_CONFIG = {
  // 是否启用Critical CSS
  enabled: process.env.NODE_ENV === 'production',
  
  // 内联CSS的最大大小（字节）
  inlineThreshold: 14 * 1024, // 14KB
  
  // 是否移除原始CSS链接
  removeOriginalCSS: false,
  
  // 延迟加载延时（毫秒）
  deferDelay: 0
}

export default {
  extractCriticalCSS,
  generateInlineCSS,
  generateDeferredCSSScript,
  getBuildCSSFiles,
  CRITICAL_CSS_CONFIG
}