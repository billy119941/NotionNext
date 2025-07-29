/**
 * 集成示例
 * 
 * 演示如何将 RobotsValidator 集成到不同的项目和工作流中
 * 包括 Next.js、Express.js、CI/CD 等集成示例
 * 
 * @author NotionNext
 * @version 1.0.0
 */

import { RobotsValidator } from '../lib/seo/robotsValidator.js'
import fs from 'fs'
import path from 'path'

/**
 * Next.js 集成示例
 */
export class NextJSIntegration {
  constructor(options = {}) {
    this.options = {
      robotsPath: 'public/robots.txt',
      failOnError: true,
      generateReport: true,
      ...options
    }
  }
  
  /**
   * 构建前验证
   */
  async validateBeforeBuild() {
    console.log('🔍 Next.js 构建前验证 robots.txt...')
    
    const validator = new RobotsValidator({
      filePath: this.options.robotsPath,
      outputFormat: 'console',
      verbose: true
    })
    
    try {
      const result = await validator.validate()
      
      if (!result.isValid && this.options.failOnError) {
        console.error('❌ robots.txt 验证失败，构建中止')
        process.exit(1)
      }
      
      if (this.options.generateReport) {
        const report = validator.generateReport()
        fs.writeFileSync('robots-validation-report.json', JSON.stringify(report, null, 2))
        console.log('📄 验证报告已保存到 robots-validation-report.json')
      }
      
      console.log('✅ robots.txt 验证通过，继续构建')
      return result
      
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message)
      if (this.options.failOnError) {
        process.exit(1)
      }
      return null
    }
  }
  
  /**
   * 生成 package.json 脚本
   */
  generatePackageScripts() {
    return {
      "validate-robots": "node scripts/validate-robots.js",
      "prebuild": "npm run validate-robots",
      "build:production": "npm run validate-robots && next build",
      "deploy:check": "npm run validate-robots && npm run build"
    }
  }
}

/**
 * 批量验证示例
 */
export class BatchValidation {
  constructor(options = {}) {
    this.options = {
      parallel: true,
      maxConcurrency: 5,
      continueOnError: true,
      generateSummary: true,
      ...options
    }
  }
  
  /**
   * 验证多个文件
   */
  async validateMultipleFiles(files) {
    console.log(`🔍 批量验证 ${files.length} 个文件`)
    
    const results = []
    
    if (this.options.parallel) {
      // 并行验证
      const promises = files.map(async (filePath) => {
        return this.validateSingleFile(filePath)
      })
      
      const batchResults = await Promise.allSettled(promises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            file: files[index],
            valid: false,
            error: result.reason.message
          })
        }
      })
      
    } else {
      // 串行验证
      for (const filePath of files) {
        try {
          const result = await this.validateSingleFile(filePath)
          results.push(result)
        } catch (error) {
          results.push({
            file: filePath,
            valid: false,
            error: error.message
          })
          
          if (!this.options.continueOnError) {
            break
          }
        }
      }
    }
    
    if (this.options.generateSummary) {
      this.generateSummary(results)
    }
    
    return results
  }
  
  /**
   * 验证单个文件
   */
  async validateSingleFile(filePath) {
    console.log(`📁 验证: ${filePath}`)
    
    const validator = new RobotsValidator({
      filePath,
      verbose: false
    })
    
    try {
      const result = await validator.validate()
      
      return {
        file: filePath,
        valid: result.isValid,
        score: result.score,
        errors: result.summary.errors,
        warnings: result.summary.warnings,
        categories: result.categories
      }
      
    } catch (error) {
      throw new Error(`验证 ${filePath} 失败: ${error.message}`)
    }
  }
  
  /**
   * 生成汇总报告
   */
  generateSummary(results) {
    console.log('\n' + '='.repeat(60))
    console.log('📊 批量验证汇总报告')
    console.log('='.repeat(60))
    
    const totalFiles = results.length
    const validFiles = results.filter(r => r.valid).length
    const invalidFiles = totalFiles - validFiles
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0)
    const totalWarnings = results.reduce((sum, r) => sum + (r.warnings || 0), 0)
    const averageScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / totalFiles
    
    console.log(`📈 总体统计:`)
    console.log(`  - 总文件数: ${totalFiles}`)
    console.log(`  - 通过验证: ${validFiles} (${Math.round(validFiles/totalFiles*100)}%)`)
    console.log(`  - 验证失败: ${invalidFiles} (${Math.round(invalidFiles/totalFiles*100)}%)`)
    console.log(`  - 平均得分: ${Math.round(averageScore)}/100`)
    console.log(`  - 总错误数: ${totalErrors}`)
    console.log(`  - 总警告数: ${totalWarnings}`)
    
    console.log(`\n📋 详细结果:`)
    results.forEach(result => {
      const status = result.valid ? '✅' : '❌'
      const score = result.score || 0
      const errors = result.errors || 0
      const warnings = result.warnings || 0
      
      if (result.error) {
        console.log(`  ${status} ${result.file}: 错误 - ${result.error}`)
      } else {
        console.log(`  ${status} ${result.file}: ${score}/100 (${errors} 错误, ${warnings} 警告)`)
      }
    })
    
    console.log('='.repeat(60))
  }
}

// 导出示例使用函数
export async function runIntegrationExamples() {
  console.log('🎯 运行集成示例\n')
  
  try {
    // Next.js 集成示例
    console.log('1️⃣  Next.js 集成示例')
    const nextjs = new NextJSIntegration()
    await nextjs.validateBeforeBuild()
    
    // 批量验证示例
    console.log('\n2️⃣  批量验证示例')
    const batch = new BatchValidation()
    await batch.validateMultipleFiles([
      'public/robots.txt'
    ])
    
    console.log('\n🎉 所有集成示例运行完成！')
    
  } catch (error) {
    console.error('\n❌ 集成示例运行失败:', error.message)
  }
}

// 如果直接运行此文件，则执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationExamples()
}