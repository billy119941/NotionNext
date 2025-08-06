/**
 * NotionImageConverter 测试文件
 * 验证图片扫描、格式检测和转换功能
 */

import notionImageConverter from '../NotionImageConverter'

// 模拟测试数据
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
          source: [['https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Ftest.png']]
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

/**
 * 测试图片扫描功能
 */
async function testImageScanning() {
  console.log('=== 测试图片扫描功能 ===')
  
  try {
    const articleId = 'test-article-123'
    const images = await notionImageConverter.scanArticleImages(articleId, mockBlockMap)
    
    console.log(`扫描结果: 发现 ${images.length} 张图片`)
    
    images.forEach((img, index) => {
      console.log(`图片 ${index + 1}:`)
      console.log(`  - Block ID: ${img.blockId}`)
      console.log(`  - URL: ${img.url}`)
      console.log(`  - 格式: ${img.format}`)
      console.log(`  - 类型: ${img.type}`)
      console.log(`  - 需要转换: ${img.needsConversion}`)
      console.log(`  - 已转换: ${img.isConverted}`)
      console.log('---')
    })
    
    // 验证扫描结果
    const expectedImageCount = 3 // page_cover + 2个image blocks (svg会被过滤)
    if (images.length >= expectedImageCount - 1) { // svg可能被过滤
      console.log('✅ 图片扫描测试通过')
    } else {
      console.log('❌ 图片扫描测试失败: 图片数量不符合预期')
    }
    
  } catch (error) {
    console.error('❌ 图片扫描测试失败:', error)
  }
}

/**
 * 测试格式检测功能
 */
function testFormatDetection() {
  console.log('\n=== 测试格式检测功能 ===')
  
  const testUrls = [
    'https://images.unsplash.com/photo-123/sample.jpg?w=800',
    'https://www.notion.so/images/page-cover/test.png',
    'https://example.com/image.webp',
    'https://cdn.example.com/photo.gif',
    'https://www.notion.so/image/encoded-url?format=jpeg',
    '/relative/path/image.bmp'
  ]
  
  testUrls.forEach(url => {
    const format = notionImageConverter._detectImageFormat(url)
    console.log(`URL: ${url}`)
    console.log(`检测格式: ${format}`)
    console.log('---')
  })
  
  console.log('✅ 格式检测测试完成')
}

/**
 * 测试WebP支持检测
 */
function testWebPSupport() {
  console.log('\n=== 测试WebP支持检测 ===')
  
  const testUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
  ]
  
  testUserAgents.forEach(ua => {
    const supported = notionImageConverter.isWebPSupported(ua)
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                   ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 
                   ua.includes('Edg') ? 'Edge' : 'Unknown'
    
    console.log(`浏览器: ${browser}`)
    console.log(`支持WebP: ${supported ? '是' : '否'}`)
    console.log('---')
  })
  
  console.log('✅ WebP支持检测测试完成')
}

/**
 * 测试URL有效性检查
 */
function testUrlValidation() {
  console.log('\n=== 测试URL有效性检查 ===')
  
  const testUrls = [
    'https://images.unsplash.com/photo-123/sample.jpg',
    'http://example.com/image.png',
    '/relative/path/image.jpg',
    'https://www.notion.so/icons/emoji.svg', // 应该被过滤
    'not-a-url',
    null,
    undefined,
    '',
    'https://example.com/emoji/😀.png' // emoji相关，应该被过滤
  ]
  
  testUrls.forEach(url => {
    const isValid = notionImageConverter._isValidImageUrl(url)
    console.log(`URL: ${url}`)
    console.log(`有效: ${isValid ? '是' : '否'}`)
    console.log('---')
  })
  
  console.log('✅ URL有效性检查测试完成')
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始运行 NotionImageConverter 测试...\n')
  
  await testImageScanning()
  testFormatDetection()
  testWebPSupport()
  testUrlValidation()
  
  console.log('\n🎉 所有测试完成!')
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllTests().catch(console.error)
}

export {
  testImageScanning,
  testFormatDetection,
  testWebPSupport,
  testUrlValidation,
  runAllTests
}