/**
 * 简单的图片扫描测试脚本
 */

// 模拟NotionImageConverter的核心功能进行测试
class TestImageConverter {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
  }

  /**
   * 检查URL是否为有效的图片链接
   */
  _isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false
    
    // 排除emoji和SVG
    if (url.includes('emoji') || url.includes('.svg')) return false
    
    // 检查是否为HTTP(S)链接
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
  }

  /**
   * 检测图片格式
   */
  _detectImageFormat(url) {
    try {
      const urlLower = url.toLowerCase()
      
      if (urlLower.includes('.webp')) return 'webp'
      if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpeg'
      if (urlLower.includes('.png')) return 'png'
      if (urlLower.includes('.gif')) return 'gif'
      if (urlLower.includes('.bmp')) return 'bmp'
      if (urlLower.includes('.tiff') || urlLower.includes('.tif')) return 'tiff'
      
      return 'jpeg' // 默认
      
    } catch (error) {
      console.warn(`无法检测图片格式: ${url}`, error)
      return 'unknown'
    }
  }

  /**
   * 从block中提取图片信息
   */
  async _extractImageFromBlock(blockValue, blockId) {
    let imageUrl = null
    let imageType = 'unknown'
    
    // 根据block类型提取图片URL
    switch (blockValue.type) {
      case 'image':
        imageUrl = blockValue.properties?.source?.[0]?.[0]
        imageType = 'content_image'
        break
        
      case 'page':
        // 页面封面图片
        imageUrl = blockValue.format?.page_cover
        imageType = 'page_cover'
        break
        
      case 'callout':
        // callout块的图标
        if (blockValue.format?.page_icon && blockValue.format.page_icon.startsWith('http')) {
          imageUrl = blockValue.format.page_icon
          imageType = 'callout_icon'
        }
        break
    }
    
    if (!imageUrl || !this._isValidImageUrl(imageUrl)) {
      return null
    }
    
    // 检测图片格式
    const format = this._detectImageFormat(imageUrl)
    
    return {
      blockId,
      url: imageUrl,
      format,
      type: imageType,
      isConverted: format === 'webp',
      needsConversion: this.supportedFormats.includes(format.toLowerCase())
    }
  }

  /**
   * 扫描文章中的图片链接
   */
  async scanArticleImages(articleId, blockMap) {
    try {
      console.log(`[图片扫描] 开始扫描文章 ${articleId} 中的图片`)
      
      const images = []
      const blocks = blockMap?.block || {}
      
      // 遍历所有block，查找图片
      for (const blockId in blocks) {
        const block = blocks[blockId]
        const blockValue = block?.value
        
        if (!blockValue) continue
        
        // 处理不同类型的图片block
        const imageInfo = await this._extractImageFromBlock(blockValue, blockId)
        if (imageInfo) {
          images.push(imageInfo)
        }
      }
      
      console.log(`[图片扫描] 文章 ${articleId} 共发现 ${images.length} 张图片`)
      return images
      
    } catch (error) {
      console.error(`[图片扫描] 扫描文章 ${articleId} 时出错:`, error)
      return []
    }
  }

  /**
   * 检测浏览器是否支持WebP
   */
  isWebPSupported(userAgent) {
    if (!userAgent) return false
    
    const ua = userAgent.toLowerCase()
    
    // Chrome 23+, Opera 12.1+, Firefox 65+, Edge 18+
    const supportedBrowsers = [
      /chrome\/([2-9]\d|[1-9]\d{2,})/,  // Chrome 23+
      /firefox\/([6-9]\d|\d{3,})/,      // Firefox 65+
      /edge\/([1-9]\d|\d{3,})/,         // Edge 18+
      /opera\/([1-9]\d|\d{3,})/         // Opera 12.1+
    ]
    
    return supportedBrowsers.some(regex => regex.test(ua))
  }
}

// 测试数据
const mockBlockMap = {
  block: {
    'page-id-1': {
      value: {
        id: 'page-id-1',
        type: 'page',
        format: {
          page_cover: 'https://www.notion.so/images/page-cover/woodcuts_1.jpg'
        }
      }
    },
    'image-id-1': {
      value: {
        id: 'image-id-1',
        type: 'image',
        properties: {
          source: [['https://images.unsplash.com/photo-1234567890/sample.jpg?w=800']]
        }
      }
    },
    'image-id-2': {
      value: {
        id: 'image-id-2',
        type: 'image',
        properties: {
          source: [['https://www.notion.so/image/test.png']]
        }
      }
    },
    'callout-id-1': {
      value: {
        id: 'callout-id-1',
        type: 'callout',
        format: {
          page_icon: 'https://www.notion.so/icons/lightbulb_yellow.svg'
        }
      }
    },
    'text-id-1': {
      value: {
        id: 'text-id-1',
        type: 'text',
        properties: {
          title: [['这是一段文本']]
        }
      }
    }
  }
}

// 运行测试
async function runTests() {
  console.log('=== NotionImageConverter 功能测试 ===\n')
  
  const converter = new TestImageConverter()
  
  // 测试1: 图片扫描
  console.log('1. 测试图片扫描功能:')
  const images = await converter.scanArticleImages('test-article-123', mockBlockMap)
  
  images.forEach((img, index) => {
    console.log(`  图片 ${index + 1}:`)
    console.log(`    - Block ID: ${img.blockId}`)
    console.log(`    - URL: ${img.url}`)
    console.log(`    - 格式: ${img.format}`)
    console.log(`    - 类型: ${img.type}`)
    console.log(`    - 需要转换: ${img.needsConversion}`)
    console.log(`    - 已转换: ${img.isConverted}`)
  })
  
  console.log(`\n  ✅ 扫描完成，发现 ${images.length} 张图片\n`)
  
  // 测试2: 格式检测
  console.log('2. 测试格式检测功能:')
  const testUrls = [
    'https://images.unsplash.com/photo-123/sample.jpg?w=800',
    'https://www.notion.so/images/page-cover/test.png',
    'https://example.com/image.webp',
    'https://cdn.example.com/photo.gif'
  ]
  
  testUrls.forEach(url => {
    const format = converter._detectImageFormat(url)
    console.log(`    ${url} -> ${format}`)
  })
  
  console.log('  ✅ 格式检测测试完成\n')
  
  // 测试3: WebP支持检测
  console.log('3. 测试WebP支持检测:')
  const testUserAgents = [
    { name: 'Chrome 91', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
    { name: 'Firefox 89', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
    { name: 'Safari 14', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15' },
    { name: 'Edge 91', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59' }
  ]
  
  testUserAgents.forEach(({ name, ua }) => {
    const supported = converter.isWebPSupported(ua)
    console.log(`    ${name}: ${supported ? '支持' : '不支持'} WebP`)
  })
  
  console.log('  ✅ WebP支持检测测试完成\n')
  
  // 测试4: URL有效性检查
  console.log('4. 测试URL有效性检查:')
  const testValidationUrls = [
    'https://images.unsplash.com/photo-123/sample.jpg',
    'https://www.notion.so/icons/emoji.svg', // 应该被过滤
    '/relative/path/image.jpg',
    'not-a-url',
    null,
    ''
  ]
  
  testValidationUrls.forEach(url => {
    const isValid = converter._isValidImageUrl(url)
    console.log(`    "${url}" -> ${isValid ? '有效' : '无效'}`)
  })
  
  console.log('  ✅ URL有效性检查测试完成\n')
  
  console.log('🎉 所有测试完成!')
  
  // 返回测试结果摘要
  return {
    totalImages: images.length,
    needsConversion: images.filter(img => img.needsConversion).length,
    alreadyWebP: images.filter(img => img.isConverted).length
  }
}

// 执行测试
runTests().then(result => {
  console.log('\n=== 测试结果摘要 ===')
  console.log(`总图片数: ${result.totalImages}`)
  console.log(`需要转换: ${result.needsConversion}`)
  console.log(`已是WebP: ${result.alreadyWebP}`)
}).catch(console.error)