import BLOG from '@/blog.config'
import { siteConfig } from '../config'

// 动态导入NotionImageConverter，避免在客户端加载Sharp
let notionImageConverter = null
if (typeof window === 'undefined') {
  // 只在服务端导入
  try {
    notionImageConverter = require('../utils/NotionImageConverter').default
  } catch (error) {
    console.warn('[图片映射] NotionImageConverter导入失败:', error.message)
  }
}

/**
 * 检查是否启用WebP自动转换
 * @returns {boolean} 是否启用WebP转换
 */
const isWebPConversionEnabled = () => {
  return process.env.WEBP_ENABLE_AUTO_CONVERSION === 'true' || 
         process.env.NEXT_PUBLIC_WEBP_ENABLE_AUTO_CONVERSION === 'true'
}

/**
 * 检查用户代理是否支持WebP
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否支持WebP
 */
const checkWebPSupport = (userAgent) => {
  if (typeof window !== 'undefined') {
    // 客户端检测 - 使用简化的检测逻辑
    if (!userAgent) userAgent = navigator.userAgent
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
  
  // 服务端检测（从请求头获取）
  if (userAgent && notionImageConverter) {
    return notionImageConverter.isWebPSupported(userAgent)
  }
  
  // 默认假设支持（现代浏览器大多支持）
  return true
}

/**
 * 获取WebP转换后的图片URL
 * @param {string} originalUrl - 原始图片URL
 * @param {string} articleId - 文章ID
 * @returns {Promise<string>} WebP图片URL或原始URL
 */
const getWebPUrl = async (originalUrl, articleId) => {
  try {
    // 只在服务端且notionImageConverter可用时尝试获取映射
    if (typeof window === 'undefined' && notionImageConverter) {
      // 检查是否已有转换缓存
      const mapping = await notionImageConverter.getImageMapping(articleId)
      
      if (mapping && mapping[originalUrl]) {
        console.log(`[WebP映射] 使用缓存的WebP URL: ${originalUrl} -> ${mapping[originalUrl]}`)
        return mapping[originalUrl]
      }
    }
    
    // 如果没有缓存或在客户端，返回原始URL（转换会在后台进行）
    return originalUrl
    
  } catch (error) {
    console.warn(`[WebP映射] 获取WebP URL失败: ${originalUrl}`, error)
    return originalUrl
  }
}

/**
 * 图片映射（增强版，支持WebP自动转换）
 *
 * @param {*} img 图片地址，可能是相对路径，可能是外链
 * @param {*} block 数据块，可能是单个内容块，可能是Page
 * @param {*} type block 单个内容块 ； collection 集合列表
 * @param {*} from 来自
 * @param {*} userAgent 用户代理字符串（用于WebP支持检测）
 * @param {*} articleId 文章ID（用于WebP映射）
 * @returns
 */
const mapImgUrl = async (img, block, type = 'block', needCompress = true, userAgent = null, articleId = null) => {
  if (!img) {
    return null
  }

  let ret = null
  // 相对目录，则视为notion的自带图片
  if (typeof img === 'string' && img.startsWith('/')) {
    ret = BLOG.NOTION_HOST + img
  } else {
    ret = img
  }

  // 调试信息 - 在开发环境下输出
  if (process.env.NODE_ENV === 'development') {
    console.log('[图片映射] 原始URL:', img)
    console.log('[图片映射] 处理后URL:', ret)
    console.log('[图片映射] Block类型:', block?.type)
    console.log('[图片映射] Block ID:', block?.id)
  }

  const hasConverted =
     (ret && ret.indexOf('https://www.notion.so/image') === 0) ||
     (ret && ret.includes('notion.site/images/page-cover/'))

  // 需要转化的URL ; 识别aws图床地址，或者bookmark类型的外链图片
  // Notion新图床资源 格式为 attachment:${id}:${name} 或 file.notion.so
  const needConvert =
    !hasConverted &&
    (block.type === 'bookmark' ||
      ret.includes('secure.notion-static.com') ||
      ret.includes('prod-files-secure') ||
      ret.includes('file.notion.so') ||
      ret.includes('s3.us-west-2.amazonaws.com') ||
      (ret && ret.indexOf('attachment') === 0))

  // Notion图床转换
  if (needConvert) {
    const originalRet = ret
    
    // 处理新的attachment格式
    if (ret && ret.indexOf('attachment') === 0) {
      // attachment:${id}:${name} 格式
      ret = BLOG.NOTION_HOST + '/image/' + encodeURIComponent(ret) + '?table=' + type + '&id=' + block.id
    } else {
      // 传统格式处理 - 包括file.notion.so和其他格式
      ret = BLOG.NOTION_HOST + '/image/' + encodeURIComponent(ret) + '?table=' + type + '&id=' + block.id
    }
    
    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('[图片转换] 转换前:', originalRet)
      console.log('[图片转换] 转换后:', ret)
    }
  }

  if (!isEmoji(ret) && ret && ret.indexOf('notion.so/images/page-cover') < 0) {
    if (BLOG.RANDOM_IMAGE_URL) {
      // 只有配置了随机图片接口，才会替换图片
      const texts = BLOG.RANDOM_IMAGE_REPLACE_TEXT
      let isReplace = false
      if (texts) {
        const textArr = texts.split(',')
        // 判断是否包含替换的文本
        textArr.forEach(text => {
          if (ret && ret.indexOf(text) > -1) {
            isReplace = true
          }
        })
      } else {
        isReplace = true
      }
      if (isReplace) {
        ret = BLOG.RANDOM_IMAGE_URL
      }
    }

    // 图片url优化，确保每一篇文章的图片url唯一
    if (
      ret &&
      ret.length > 4 &&
      !ret.includes('https://www.notion.so/images/')
    ) {
      // 图片接口拼接唯一识别参数，防止请求的图片被缓，而导致随机结果相同
      const separator = ret.includes('?') ? '&' : '?'
      ret = `${ret.trim()}${separator}t=${block.id}`
    }
  }

  // WebP转换处理
  if (isWebPConversionEnabled() && userAgent && checkWebPSupport(userAgent) && articleId) {
    try {
      // 尝试获取WebP版本的URL
      const webpUrl = await getWebPUrl(ret, articleId)
      if (webpUrl && webpUrl !== ret) {
        console.log(`[WebP映射] 使用WebP版本: ${ret} -> ${webpUrl}`)
        ret = webpUrl
      }
    } catch (error) {
      console.warn(`[WebP映射] WebP转换失败，使用原图: ${ret}`, error)
      // 继续使用原图，不影响正常显示
    }
  }

  // 统一压缩图片
  if (needCompress) {
    const width = block?.format?.block_width
    ret = compressImage(ret, width)
  }

  return ret
}

/**
 * 是否是emoji图标
 * @param {*} str
 * @returns
 */
function isEmoji(str) {
  const emojiRegex =
    /[\u{1F300}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B06}\u{2B07}\u{2B05}\u{27A1}\u{2194}-\u{2199}\u{2194}\u{21A9}\u{21AA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FB}\u{25FC}\u{25B6}\u{25C0}\u{1F200}-\u{1F251}]/u
  return emojiRegex.test(str)
}

/**
 * 压缩图片
 * 1. Notion图床可以通过指定url-query参数来压缩裁剪图片 例如 ?xx=xx&width=400
 * 2. UnPlash 图片可以通过api q=50 控制压缩质量 width=400 控制图片尺寸
 * @param {*} image
 */
const compressImage = (image, width, quality = 50, fmt = 'webp') => {
  if (!image || typeof image !== 'string' || image.indexOf('http') !== 0) {
    return image
  }

  if (image.includes(".svg")) return image

  if (!width || width === 0) {
    width = siteConfig('IMAGE_COMPRESS_WIDTH')
  }

  // 将URL解析为一个对象
  const urlObj = new URL(image)
  // 获取URL参数
  const params = new URLSearchParams(urlObj.search)

  // Notion图床
  if (
    image.indexOf(BLOG.NOTION_HOST) === 0 &&
    image.indexOf('amazonaws.com') > 0
  ) {
    params.set('width', width)
    params.set('cache', 'v2')
    // 生成新的URL
    urlObj.search = params.toString()
    return urlObj.toString()
  } else if (image.indexOf('https://images.unsplash.com/') === 0) {
    // 压缩unsplash图片
    // 将q参数的值替换
    params.set('q', quality)
    // 尺寸
    params.set('width', width)
    // 格式
    params.set('fmt', fmt)
    params.set('fm', fmt)
    // 生成新的URL
    urlObj.search = params.toString()
    return urlObj.toString()
  } else if (image.indexOf('https://your_picture_bed') === 0) {
    // 此处还可以添加您的自定义图传的封面图压缩参数。
    // .e.g
    return 'do_somethin_here'
  }

  return image
}

export { compressImage, mapImgUrl }
