#!/usr/bin/env node

/**
 * Bundle 大小监控脚本
 * 监控构建后的包大小变化
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BUNDLE_SIZE_LIMIT = {
  'pages/_app.js': 200 * 1024, // 200KB
  'pages/index.js': 100 * 1024, // 100KB
  'chunks/framework.js': 50 * 1024, // 50KB
  'chunks/main.js': 40 * 1024, // 40KB
  'chunks/webpack.js': 15 * 1024 // 15KB
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const analyzeBundleSize = () => {
  console.log('📊 分析 Bundle 大小...\n')
  
  const nextDir = path.join(process.cwd(), '.next')
  if (!fs.existsSync(nextDir)) {
    console.error('❌ .next 目录不存在，请先运行 npm run build')
    process.exit(1)
  }
  
  const staticDir = path.join(nextDir, 'static')
  const results = []
  let totalSize = 0
  let hasWarnings = false
  
  // 分析静态文件
  const analyzeDirectory = (dir, prefix = '') => {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        analyzeDirectory(filePath, `${prefix}${file}/`)
      } else if (file.endsWith('.js')) {
        const relativePath = `${prefix}${file}`
        const size = stat.size
        totalSize += size
        
        // 检查是否超过限制
        const matchingLimit = Object.keys(BUNDLE_SIZE_LIMIT).find(pattern => 
          relativePath.includes(pattern.replace('pages/', '').replace('chunks/', ''))
        )
        
        const isOverLimit = matchingLimit && size > BUNDLE_SIZE_LIMIT[matchingLimit]
        if (isOverLimit) {
          hasWarnings = true
        }
        
        results.push({
          file: relativePath,
          size,
          formattedSize: formatBytes(size),
          isOverLimit,
          limit: matchingLimit ? formatBytes(BUNDLE_SIZE_LIMIT[matchingLimit]) : null
        })
      }
    })
  }
  
  analyzeDirectory(staticDir)
  
  // 排序并显示结果
  results.sort((a, b) => b.size - a.size)
  
  console.log('📦 Bundle 文件大小分析:')
  console.log('─'.repeat(80))
  
  results.slice(0, 10).forEach(result => {
    const status = result.isOverLimit ? '⚠️ ' : '✅'
    const limitInfo = result.limit ? ` (限制: ${result.limit})` : ''
    console.log(`${status} ${result.file}: ${result.formattedSize}${limitInfo}`)
  })
  
  console.log('─'.repeat(80))
  console.log(`📊 总大小: ${formatBytes(totalSize)}`)
  
  if (hasWarnings) {
    console.log('\n⚠️  警告: 发现超过大小限制的文件!')
    console.log('💡 建议:')
    console.log('   1. 使用动态导入进行代码分割')
    console.log('   2. 移除未使用的依赖')
    console.log('   3. 启用 Tree Shaking')
    console.log('   4. 考虑使用更轻量的替代库')
  } else {
    console.log('\n✅ 所有文件大小都在合理范围内!')
  }
  
  // 保存分析结果
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    files: results,
    hasWarnings,
    recommendations: hasWarnings ? [
      '使用动态导入进行代码分割',
      '移除未使用的依赖',
      '启用 Tree Shaking',
      '考虑使用更轻量的替代库'
    ] : []
  }
  
  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(reportsDir, 'bundle-size-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log('\n📄 详细报告已保存到: reports/bundle-size-report.json')
  
  return !hasWarnings
}

// 如果直接运行此脚本
if (require.main === module) {
  const success = analyzeBundleSize()
  process.exit(success ? 0 : 1)
}

module.exports = { analyzeBundleSize }