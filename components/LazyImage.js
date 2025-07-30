import { siteConfig } from '@/lib/config'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

/**
 * 图片懒加载
 * @param {*} param0
 * @returns
 */
export default function LazyImage({
  priority,
  id,
  src,
  alt,
  placeholderSrc,
  className,
  width,
  height,
  title,
  onLoad,
  onClick,
  style
}) {
  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const defaultPlaceholderSrc = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER')
  const imageRef = useRef(null)
  const [currentSrc, setCurrentSrc] = useState(
    placeholderSrc || defaultPlaceholderSrc
  )
  const [generatedAlt, setGeneratedAlt] = useState('')

  // 自动生成ALT属性
  useEffect(() => {
    const generateSmartAlt = async () => {
      // 如果已经有alt属性，就不需要生成
      if (alt && alt.trim()) {
        return
      }

      // 如果启用了自动ALT生成 - 已禁用，文件已删除
      if (false && siteConfig('SEO_AUTO_GENERATE_ALT', true)) {
        try {
          // const { generateImageAlt } = await import('@/lib/seo/imageSEO')
          
          const context = {
            siteName: siteConfig('TITLE'),
            url: typeof window !== 'undefined' ? window.location.href : '',
            title: typeof document !== 'undefined' ? document.title : ''
          }

          // const smartAlt = await generateImageAlt(src, context)
          // if (smartAlt && smartAlt.trim()) {
          //   setGeneratedAlt(smartAlt)
          // }
        } catch (error) {
          console.warn('Failed to generate smart alt for LazyImage:', error)
        }
      }
    }

    if (src) {
      generateSmartAlt()
    }
  }, [src, alt])

  // 最终的alt属性
  const finalAlt = alt || generatedAlt || title || ''

  /**
   * 占位图加载成功
   */
  const handleThumbnailLoaded = () => {
    if (typeof onLoad === 'function') {
      // onLoad() // 触发传递的onLoad回调函数
    }
  }
  // 原图加载完成
  const handleImageLoaded = img => {
    if (typeof onLoad === 'function') {
      onLoad() // 触发传递的onLoad回调函数
    }
    // 移除占位符类名
    if (imageRef.current) {
      imageRef.current.classList.remove('lazy-image-placeholder')
    }
  }
  /**
   * 图片加载失败回调
   */
  const handleImageError = () => {
    if (imageRef.current) {
      // 尝试加载 placeholderSrc，如果失败则加载 defaultPlaceholderSrc
      if (imageRef.current.src !== placeholderSrc && placeholderSrc) {
        imageRef.current.src = placeholderSrc
      } else {
        imageRef.current.src = defaultPlaceholderSrc
      }
      // 移除占位符类名
      if (imageRef.current) {
        imageRef.current.classList.remove('lazy-image-placeholder')
      }
    }
  }

  useEffect(() => {
    const adjustedImageSrc =
      adjustImgSize(src, maxWidth) || defaultPlaceholderSrc

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 拉取图片
            const img = new Image()
            img.src = adjustedImageSrc
            img.onload = () => {
              setCurrentSrc(adjustedImageSrc)
              handleImageLoaded(adjustedImageSrc)
            }
            img.onerror = handleImageError

            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px 0px' } // 轻微提前加载
    )
    if (imageRef.current) {
      observer.observe(imageRef.current)
    }
    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current)
      }
    }
  }, [src, maxWidth])

  // 动态添加width、height和className属性，仅在它们为有效值时添加
  const imgProps = {
    ref: imageRef,
    src: currentSrc,
    'data-src': src, // 存储原始图片地址
    alt: finalAlt || '',
    onLoad: handleThumbnailLoaded,
    onError: handleImageError,
    className: `${className || ''} lazy-image-placeholder`,
    style,
    width: width || 'auto',
    height: height || 'auto',
    onClick
  }

  if (id) imgProps.id = id
  if (title) imgProps.title = title

  if (!src) {
    return null
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imgProps} />
      {/* 预加载关键图片 - 只预加载真正关键的首屏图片，避免预加载警告 */}
      {priority && typeof window !== 'undefined' && shouldPreloadImage(src) && (
        <Head>
          <link 
            rel='preload' 
            as='image' 
            href={adjustImgSize(src, maxWidth)}
            // 添加媒体查询，只在合适的屏幕尺寸下预加载
            media={width && height ? `(max-width: ${Math.max(width * 2, 1200)}px)` : undefined}
          />
        </Head>
      )}
    </>
  )
}

/**
 * 判断是否应该预加载图片
 * 避免预加载过多图片导致浏览器警告
 * @param {string} src - 图片源地址
 * @returns {boolean} 是否应该预加载
 */
const shouldPreloadImage = (src) => {
  if (!src) return false
  
  const srcLower = src.toLowerCase()
  
  // 排除明确不应该预加载的图片类型
  const excludePatterns = [
    '/images/heo/', // 排除heo主题的内容图片
    'thumbnail', // 排除缩略图
    'pageCover', // 排除页面封面
    '/20', // 排除年份路径的图片（通常是内容图片）
    'notion', // 排除notion图片
    'unsplash', // 排除unsplash图片
    'pixabay', // 排除其他图片服务
    'pexels'
  ]
  
  // 如果匹配排除模式，不预加载
  if (excludePatterns.some(pattern => srcLower.includes(pattern))) {
    return false
  }
  
  // 只预加载真正关键的图片类型（更严格的条件）
  const criticalKeywords = [
    'logo', 'avatar', 'icon'  // 只保留最关键的图片类型
  ]
  
  const isCritical = criticalKeywords.some(keyword => 
    srcLower.includes(keyword)
  )
  
  // 如果不是关键图片，不预加载
  if (!isCritical) return false
  
  try {
    // 检查图片尺寸参数，避免预加载大图
    const url = new URL(src, window.location.origin)
    const params = new URLSearchParams(url.search)
    const width = params.get('w') || params.get('width')
    
    // 如果图片宽度超过200px，不预加载（更严格的限制）
    if (width && parseInt(width) > 200) {
      return false
    }
    
    // 检查文件大小相关参数
    const quality = params.get('q') || params.get('quality')
    if (quality && parseInt(quality) > 60) {
      return false // 更严格的质量限制
    }
    
    return true
  } catch (error) {
    // URL解析失败时，只预加载明确的logo和icon
    return srcLower.includes('logo') || srcLower.includes('icon')
  }
}

/**
 * 根据窗口尺寸决定压缩图片宽度
 * @param {*} src
 * @param {*} maxWidth
 * @returns
 */
const adjustImgSize = (src, maxWidth) => {
  if (!src) {
    return null
  }
  const screenWidth =
    (typeof window !== 'undefined' && window?.screen?.width) || maxWidth

  // 屏幕尺寸大于默认图片尺寸，没必要再压缩
  if (screenWidth > maxWidth) {
    return src
  }

  // 正则表达式，用于匹配 URL 中的 width 参数
  const widthRegex = /width=\d+/
  // 正则表达式，用于匹配 URL 中的 w 参数
  const wRegex = /w=\d+/

  // 使用正则表达式替换 width/w 参数
  return src
    .replace(widthRegex, `width=${screenWidth}`)
    .replace(wRegex, `w=${screenWidth}`)
}
