import React, { useState, useEffect, useRef, useCallback } from 'react'
import { siteConfig } from '@/lib/config'
import notionImageConverter from '@/lib/utils/NotionImageConverter'

/**
 * 渐进式懒加载图片组件
 * 支持低质量占位符 -> 高质量图片的渐进加载
 */
const LazyImageComponent = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur', // 'blur' | 'skeleton' | 'custom'
  placeholderSrc,
  lowQualitySrc, // 低质量占位符图片
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  style = {},
  enableWebP = true, // 启用WebP自适应
  webpQuality = 80, // WebP质量
  fallbackStrategy = 'original', // 降级策略
  ...props
}) => {
  const imgRef = useRef(null)
  const webpSupportRef = useRef(null) // 缓存WebP支持检测结果
  const [loadingState, setLoadingState] = useState('placeholder') // placeholder -> lowQuality -> highQuality
  const [currentSrc, setCurrentSrc] = useState('')
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [imageCache] = useState(() => new Map()) // 图片缓存
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState('original') // 'webp' | 'original'

  // 默认配置
  const defaultPlaceholder = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER') || '/images/placeholder.svg'
  const enableProgressiveLoading = siteConfig('ENABLE_PROGRESSIVE_LOADING', true)

  /**
   * 检测浏览器WebP支持
   */
  const detectWebPSupport = useCallback(() => {
    if (webpSupportRef.current !== null) {
      return Promise.resolve(webpSupportRef.current)
    }

    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        webpSupportRef.current = false
        resolve(false)
        return
      }

      // 使用NotionImageConverter的检测逻辑
      const userAgent = navigator.userAgent
      const supported = notionImageConverter.isWebPSupported(userAgent)
      
      webpSupportRef.current = supported
      resolve(supported)
    })
  }, [])

  /**
   * 生成不同格式的图片URL
   */
  const generateImageUrls = useCallback(async (originalSrc) => {
    if (!originalSrc) return { original: '', webp: '', lowQuality: '', thumbnail: '' }
    
    try {
      // 检测WebP支持
      const webpSupported = await detectWebPSupport()
      
      const url = new URL(originalSrc, window.location.origin)
      const params = new URLSearchParams(url.search)
      
      // 原始高质量版本
      const originalUrl = new URL(originalSrc, window.location.origin)
      const originalParams = new URLSearchParams(originalUrl.search)
      originalParams.set('q', '75')
      if (width) originalParams.set('w', String(width))
      originalUrl.search = originalParams.toString()
      
      // WebP版本
      let webpUrl = originalUrl.toString()
      if (enableWebP && webpSupported) {
        const webpUrlObj = new URL(originalSrc, window.location.origin)
        const webpParams = new URLSearchParams(webpUrlObj.search)
        webpParams.set('format', 'webp')
        webpParams.set('q', String(webpQuality))
        if (width) webpParams.set('w', String(width))
        webpUrlObj.search = webpParams.toString()
        webpUrl = webpUrlObj.toString()
      }
      
      // 低质量版本（用于渐进加载）
      const lowQualityUrl = new URL(originalSrc, window.location.origin)
      const lowQualityParams = new URLSearchParams(lowQualityUrl.search)
      lowQualityParams.set('w', '100')
      lowQualityParams.set('q', '30')
      if (enableWebP && webpSupported) {
        lowQualityParams.set('format', 'webp')
      }
      lowQualityUrl.search = lowQualityParams.toString()
      
      // 缩略图版本（用于占位符）
      const thumbnailUrl = new URL(originalSrc, window.location.origin)
      const thumbnailParams = new URLSearchParams(thumbnailUrl.search)
      thumbnailParams.set('w', '50')
      thumbnailParams.set('q', '20')
      thumbnailParams.set('blur', '2')
      if (enableWebP && webpSupported) {
        thumbnailParams.set('format', 'webp')
      }
      thumbnailUrl.search = thumbnailParams.toString()
      
      // 设置选中的格式
      setSelectedFormat(enableWebP && webpSupported ? 'webp' : 'original')
      
      return {
        original: originalUrl.toString(),
        webp: webpUrl,
        lowQuality: lowQualityUrl.toString(),
        thumbnail: thumbnailUrl.toString(),
        webpSupported
      }
    } catch (error) {
      console.warn('[LazyImageComponent] URL处理失败:', error)
      return {
        original: originalSrc,
        webp: originalSrc,
        lowQuality: originalSrc,
        thumbnail: originalSrc,
        webpSupported: false
      }
    }
  }, [enableWebP, width, webpQuality, detectWebPSupport])

  // 注意：generateLowQualityUrl函数已被generateImageUrls替代，这里移除以避免未使用的代码

  /**
   * 预加载图片并缓存 - 增强版本
   */
  const preloadImage = useCallback((imageSrc, cacheKey, options = {}) => {
    return new Promise((resolve, reject) => {
      // 检查缓存
      if (imageCache.has(cacheKey)) {
        const cachedData = imageCache.get(cacheKey)
        setLoadingProgress(100)
        resolve(cachedData)
        return
      }

      const img = new Image()
      const startTime = Date.now()
      
      // 更真实的加载进度模拟
      let progress = 0
      let progressInterval = null
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const estimatedTotal = options.estimatedLoadTime || 1500 // 默认1.5秒
        
        // 基于时间的进度计算，但不超过90%
        const timeBasedProgress = Math.min((elapsed / estimatedTotal) * 90, 90)
        
        // 添加一些随机性使进度更自然
        const randomFactor = Math.random() * 10
        progress = Math.min(timeBasedProgress + randomFactor, 90)
        
        setLoadingProgress(Math.round(progress))
      }

      // 开始进度更新
      if (options.showProgress !== false) {
        progressInterval = setInterval(updateProgress, 150)
      }

      img.onload = () => {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        
        // 快速完成到100%
        setLoadingProgress(100)
        
        // 缓存图片数据和元信息
        const imageData = {
          src: imageSrc,
          width: img.naturalWidth,
          height: img.naturalHeight,
          loadTime: Date.now() - startTime,
          timestamp: Date.now(),
          aspectRatio: img.naturalWidth / img.naturalHeight,
          fileSize: options.estimatedSize || 0
        }
        
        imageCache.set(cacheKey, imageData)
        
        // 平滑过渡延迟
        const transitionDelay = options.transitionDelay || 200
        setTimeout(() => {
          resolve(imageData)
        }, transitionDelay)
      }

      img.onerror = (error) => {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setLoadingProgress(0)
        
        // 记录错误信息
        console.warn(`[LazyImageComponent] 图片预加载失败: ${imageSrc}`, error)
        reject(new Error(`Failed to load image: ${imageSrc}`))
      }

      // 设置图片源开始加载
      img.src = imageSrc
      
      // 超时处理
      const timeout = options.timeout || 10000 // 10秒超时
      setTimeout(() => {
        if (img.complete === false) {
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          reject(new Error(`Image load timeout: ${imageSrc}`))
        }
      }, timeout)
    })
  }, [imageCache])

  /**
   * 渐进式加载逻辑 - 集成WebP格式自适应
   */
  const startProgressiveLoading = useCallback(async () => {
    if (!src || !isIntersecting) return

    try {
      // 生成不同格式的图片URL
      const imageUrls = await generateImageUrls(src)
      
      // 阶段1: 显示占位符
      setLoadingState('placeholder')
      setCurrentSrc(placeholderSrc || defaultPlaceholder)

      if (enableProgressiveLoading) {
        // 阶段2: 加载缩略图
        try {
          setLoadingState('lowQuality')
          const thumbnailData = await preloadImage(imageUrls.thumbnail, `thumb_${src}_${selectedFormat}`, {
            estimatedLoadTime: 500,
            transitionDelay: 100
          })
          setCurrentSrc(thumbnailData.src)
          
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // 加载低质量版本
          const lowQualityData = await preloadImage(imageUrls.lowQuality, `low_${src}_${selectedFormat}`, {
            estimatedLoadTime: 800,
            transitionDelay: 150
          })
          setCurrentSrc(lowQualityData.src)
          
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.warn('[LazyImageComponent] 低质量图片加载失败，直接加载原图:', error)
        }
      }

      // 阶段3: 加载高质量图片（优先WebP格式）
      setLoadingState('loading')
      let finalImageUrl = selectedFormat === 'webp' ? imageUrls.webp : imageUrls.original
      
      try {
        const highQualityImageData = await preloadImage(finalImageUrl, `${src}_${selectedFormat}`, {
          estimatedLoadTime: 2000,
          transitionDelay: 250
        })
        setLoadingState('loaded')
        setCurrentSrc(highQualityImageData.src)

        if (onLoad) {
          onLoad({ 
            src: highQualityImageData.src, 
            loadingState: 'loaded',
            imageData: highQualityImageData,
            selectedFormat,
            webpSupported: imageUrls.webpSupported
          })
        }
      } catch (error) {
        // 如果WebP加载失败，尝试降级到原格式
        if (selectedFormat === 'webp' && enableWebP) {
          console.warn('[LazyImageComponent] WebP加载失败，降级到原格式:', error)
          setSelectedFormat('original')
          
          try {
            const fallbackImageData = await preloadImage(imageUrls.original, `${src}_original`, {
              estimatedLoadTime: 2000,
              transitionDelay: 250
            })
            setLoadingState('loaded')
            setCurrentSrc(fallbackImageData.src)

            if (onLoad) {
              onLoad({ 
                src: fallbackImageData.src, 
                loadingState: 'loaded',
                imageData: fallbackImageData,
                selectedFormat: 'original',
                webpSupported: imageUrls.webpSupported,
                fallbackUsed: true
              })
            }
          } catch (fallbackError) {
            throw fallbackError
          }
        } else {
          throw error
        }
      }

    } catch (error) {
      console.warn('[LazyImageComponent] 图片加载失败:', error)
      setLoadingState('error')
      setCurrentSrc(placeholderSrc || defaultPlaceholder)
      
      if (onError) {
        onError(error)
      }
    }
  }, [src, isIntersecting, placeholderSrc, defaultPlaceholder, enableProgressiveLoading, generateImageUrls, preloadImage, onLoad, onError, selectedFormat, enableWebP])

  /**
   * Intersection Observer 设置
   */
  useEffect(() => {
    if (!imgRef.current || priority) {
      if (priority) {
        setIsIntersecting(true)
      }
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(imgRef.current)

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [threshold, rootMargin, priority])

  /**
   * 开始渐进式加载
   */
  useEffect(() => {
    if (isIntersecting || priority) {
      startProgressiveLoading()
    }
  }, [isIntersecting, priority, startProgressiveLoading])

  /**
   * 获取占位符内容
   */
  const getPlaceholderContent = () => {
    if (placeholder === 'skeleton') {
      return (
        <div className="animate-pulse bg-gray-200 rounded">
          <div className="flex items-center justify-center h-full">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )
    }

    if (placeholder === 'custom' && placeholderSrc) {
      return (
        <img
          src={placeholderSrc}
          alt=""
          className="w-full h-full object-cover filter blur-sm"
        />
      )
    }

    // 默认模糊占位符
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-bounce"></div>
        </div>
      </div>
    )
  }

  /**
   * 获取加载动画
   */
  const getLoadingAnimation = () => {
    if (loadingState === 'loading') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-2 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700">{Math.round(loadingProgress)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  /**
   * 获取图片样式类 - 增强过渡效果
   */
  const getImageClasses = () => {
    const baseClasses = `transition-all duration-700 ease-out ${className}`
    
    switch (loadingState) {
      case 'placeholder':
        return `${baseClasses} opacity-60 scale-105`
      case 'lowQuality':
        return `${baseClasses} opacity-85 filter blur-sm scale-102`
      case 'loading':
        return `${baseClasses} opacity-90 scale-101`
      case 'loaded':
        return `${baseClasses} opacity-100 scale-100 filter-none`
      case 'error':
        return `${baseClasses} opacity-50 grayscale scale-95`
      default:
        return baseClasses
    }
  }

  /**
   * 处理图片点击
   */
  const handleImageClick = (event) => {
    if (props.onClick) {
      props.onClick(event)
    }
  }

  // 容器样式
  const containerStyle = {
    width: width || '100%',
    height: height || 'auto',
    position: 'relative',
    overflow: 'hidden',
    ...style
  }

  return (
    <div 
      className="relative"
      style={containerStyle}
      ref={imgRef}
    >
      {/* 主图片 */}
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          className={getImageClasses()}
          width={width}
          height={height}
          onClick={handleImageClick}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          {...props}
        />
      ) : (
        getPlaceholderContent()
      )}

      {/* 加载动画 */}
      {getLoadingAnimation()}

      {/* 错误状态 */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}

      {/* 加载状态指示器（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {loadingState}
        </div>
      )}
    </div>
  )
}

/**
 * 图片预加载工具函数
 */
export const preloadImages = (urls) => {
  return Promise.all(
    urls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => reject(new Error(`Failed to preload: ${url}`))
        img.src = url
      })
    })
  )
}

/**
 * 获取图片缓存统计
 */
export const getImageCacheStats = () => {
  if (typeof window === 'undefined') return null
  
  return {
    cacheSize: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A',
    timestamp: new Date().toISOString()
  }
}

export default LazyImageComponent