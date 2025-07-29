#!/usr/bin/env node

/**
 * Bundle 分析工具
 * 分析和优化 JavaScript 包大小
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('📦 开始分析 Bundle 大小...\n')

// 1. 运行 Bundle Analyzer
console.log('🔍 运行 Bundle Analyzer...')
try {
  execSync('npm run bundle-report', { stdio: 'inherit' })
} catch (error) {
  console.error('Bundle Analyzer 运行失败:', error.message)
}

// 2. 分析 package.json 中的依赖
console.log('\n📋 分析依赖包大小...')

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

// 获取包大小信息
const getPackageSize = (packageName) => {
  try {
    const packagePath = path.join('node_modules', packageName, 'package.json')
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      return pkg.version
    }
  } catch (error) {
    return 'unknown'
  }
  return 'not found'
}

// 大型依赖包列表
const largeDependencies = [
  'react',
  'react-dom',
  'next',
  'notion-client',
  'notion-utils',
  'react-notion-x',
  '@next/bundle-analyzer',
  'webpack-bundle-analyzer'
]

console.log('🔍 大型依赖包分析:')
largeDependencies.forEach(dep => {
  if (dependencies[dep]) {
    const version = getPackageSize(dep)
    console.log(`   ${dep}: ${version}`)
  }
})

// 3. 检查未使用的依赖
console.log('\n🧹 检查可能未使用的依赖...')

const sourceFiles = []
const scanDirectory = (dir) => {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath)
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      sourceFiles.push(filePath)
    }
  })
}

// 扫描源文件
scanDirectory('.')

// 检查依赖使用情况
const usedDependencies = new Set()
const importRegex = /(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g

sourceFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        const packageName = importPath.split('/')[0]
        if (packageName.startsWith('@')) {
          usedDependencies.add(`${packageName}/${importPath.split('/')[1]}`)
        } else {
          usedDependencies.add(packageName)
        }
      }
    }
  } catch (error) {
    // 忽略读取错误
  }
})

const unusedDependencies = Object.keys(dependencies).filter(dep => 
  !usedDependencies.has(dep) && 
  !dep.startsWith('@types/') && 
  !['eslint', 'prettier', 'jest', 'typescript'].includes(dep)
)

if (unusedDependencies.length > 0) {
  console.log('⚠️  可能未使用的依赖:')
  unusedDependencies.forEach(dep => {
    console.log(`   - ${dep}`)
  })
  console.log('\n💡 建议: 检查这些依赖是否真的需要，可以考虑移除')
} else {
  console.log('✅ 没有发现明显未使用的依赖')
}

// 4. 优化建议
console.log('\n💡 Bundle 优化建议:')
console.log('   1. 使用动态导入 (dynamic imports) 进行代码分割')
console.log('   2. 启用 Tree Shaking 移除未使用的代码')
console.log('   3. 考虑使用更轻量的替代库')
console.log('   4. 优化图片和静态资源')
console.log('   5. 使用 Webpack Bundle Analyzer 查看详细分析')

// 5. 生成优化报告
const report = {
  timestamp: new Date().toISOString(),
  totalDependencies: Object.keys(dependencies).length,
  unusedDependencies: unusedDependencies.length,
  largeDependencies: largeDependencies.filter(dep => dependencies[dep]),
  recommendations: [
    '使用动态导入减少初始包大小',
    '启用 Tree Shaking',
    '移除未使用的依赖',
    '优化第三方库的使用'
  ]
}

const reportsDir = path.join(__dirname, '..', 'reports')
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true })
}

fs.writeFileSync(
  path.join(reportsDir, 'bundle-analysis.json'),
  JSON.stringify(report, null, 2)
)

console.log('\n📄 详细报告已保存到: reports/bundle-analysis.json')
console.log('🏁 Bundle 分析完成!')