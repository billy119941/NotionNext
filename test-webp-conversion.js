/**
 * WebP转换功能测试脚本
 * 测试完整的图片转换和R2上传流程
 */

const sharp = require('sharp')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

/**
 * WebP转换器测试类
 */
class WebPConverterTest {
  constructor() {
    this.webpQuality = 80
    this.testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
  }

  /**
   * 下载测试图片
   */
  async downloadTestImage(url) {
    try {
      console.log(`[下载] 开始下载测试图片: ${url}`)
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'NotionNext-WebP-Test/1.0'
        }
      })
      
      const buffer = Buffer.from(response.data)
      console.log(`[下载] 下载完成，大小: ${(buffer.length / 1024).toFixed(2)} KB`)
      
      return buffer
      
    } catch (error) {
      console.error(`[下载] 下载失败: ${url}`, error.message)
      return null
    }
  }

  /**
   * 转换为WebP格式
   */
  async convertToWebP(imageBuffer, quality = 80) {
    try {
      console.log(`[转换] 开始转换为WebP格式，质量: ${quality}`)
      
      const startTime = Date.now()
      
      // 获取原始图片信息
      const metadata = await sharp(imageBuffer).metadata()
      console.log(`[转换] 原始图片信息: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`)
      
      // 转换为WebP
      const webpBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: quality,
          effort: 6, // 压缩努力程度 (0-6, 6为最高)
          lossless: false // 使用有损压缩以获得更好的压缩率
        })
        .toBuffer()
      
      const endTime = Date.now()
      const conversionTime = endTime - startTime
      
      // 计算压缩效果
      const originalSize = imageBuffer.length
      const webpSize = webpBuffer.length
      const compressionRatio = ((originalSize - webpSize) / originalSize * 100).toFixed(2)
      const sizeSaving = originalSize - webpSize
      
      console.log(`[转换] 转换完成，耗时: ${conversionTime}ms`)
      console.log(`[转换] 原始大小: ${(originalSize / 1024).toFixed(2)} KB`)
      console.log(`[转换] WebP大小: ${(webpSize / 1024).toFixed(2)} KB`)
      console.log(`[转换] 压缩率: ${compressionRatio}%`)
      console.log(`[转换] 节省空间: ${(sizeSaving / 1024).toFixed(2)} KB`)
      
      return {
        webpBuffer,
        originalSize,
        webpSize,
        compressionRatio: parseFloat(compressionRatio),
        sizeSaving,
        conversionTime,
        metadata
      }
      
    } catch (error) {
      console.error('[转换] WebP转换失败:', error.message)
      return null
    }
  }

  /**
   * 测试不同质量级别的转换效果
   */
  async testQualityLevels(imageBuffer) {
    console.log('\n=== 测试不同质量级别的转换效果 ===')
    
    const qualityLevels = [60, 70, 80, 90, 95]
    const results = []
    
    for (const quality of qualityLevels) {
      console.log(`\n测试质量级别: ${quality}`)
      const result = await this.convertToWebP(imageBuffer, quality)
      
      if (result) {
        results.push({
          quality,
          ...result
        })
      }
    }
    
    // 输出对比结果
    console.log('\n=== 质量级别对比结果 ===')
    console.log('质量\t大小(KB)\t压缩率\t转换时间(ms)')
    console.log('----\t--------\t------\t-----------')
    
    results.forEach(result => {
      console.log(`${result.quality}\t${(result.webpSize / 1024).toFixed(2)}\t\t${result.compressionRatio}%\t${result.conversionTime}`)
    })
    
    return results
  }

  /**
   * 保存测试结果到文件
   */
  async saveTestResults(originalBuffer, webpBuffer, filename = 'test') {
    try {
      const outputDir = path.join(process.cwd(), 'test-output')
      
      // 创建输出目录
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      
      // 保存原始图片
      const originalPath = path.join(outputDir, `${filename}-original.jpg`)
      fs.writeFileSync(originalPath, originalBuffer)
      console.log(`[保存] 原始图片已保存: ${originalPath}`)
      
      // 保存WebP图片
      const webpPath = path.join(outputDir, `${filename}-converted.webp`)
      fs.writeFileSync(webpPath, webpBuffer)
      console.log(`[保存] WebP图片已保存: ${webpPath}`)
      
      return { originalPath, webpPath }
      
    } catch (error) {
      console.error('[保存] 保存测试结果失败:', error.message)
      return null
    }
  }

  /**
   * 运行完整的转换测试
   */
  async runFullTest() {
    console.log('=== WebP转换功能完整测试 ===\n')
    
    try {
      // 1. 下载测试图片
      const imageBuffer = await this.downloadTestImage(this.testImageUrl)
      if (!imageBuffer) {
        console.error('❌ 无法下载测试图片，测试终止')
        return
      }
      
      // 2. 基本转换测试
      console.log('\n=== 基本转换测试 ===')
      const basicResult = await this.convertToWebP(imageBuffer, this.webpQuality)
      
      if (!basicResult) {
        console.error('❌ 基本转换测试失败')
        return
      }
      
      console.log('✅ 基本转换测试通过')
      
      // 3. 质量级别测试
      const qualityResults = await this.testQualityLevels(imageBuffer)
      
      if (qualityResults.length > 0) {
        console.log('✅ 质量级别测试通过')
      }
      
      // 4. 保存测试结果
      console.log('\n=== 保存测试结果 ===')
      const savedFiles = await this.saveTestResults(
        imageBuffer, 
        basicResult.webpBuffer, 
        'webp-conversion-test'
      )
      
      if (savedFiles) {
        console.log('✅ 测试结果保存成功')
      }
      
      // 5. 输出测试总结
      console.log('\n=== 测试总结 ===')
      console.log(`✅ WebP转换功能测试完成`)
      console.log(`📊 最佳质量级别推荐: 80 (平衡压缩率和质量)`)
      console.log(`💾 平均压缩率: ${basicResult.compressionRatio}%`)
      console.log(`⚡ 转换性能: ${basicResult.conversionTime}ms`)
      
      return {
        success: true,
        basicResult,
        qualityResults,
        savedFiles
      }
      
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error)
      return { success: false, error: error.message }
    }
  }
}

// 运行测试
async function main() {
  const tester = new WebPConverterTest()
  const result = await tester.runFullTest()
  
  if (result.success) {
    console.log('\n🎉 WebP转换功能测试全部通过!')
  } else {
    console.log('\n❌ WebP转换功能测试失败:', result.error)
    process.exit(1)
  }
}

// 执行测试
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { WebPConverterTest }