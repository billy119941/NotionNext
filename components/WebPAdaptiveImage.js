import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { siteConfig } from '@/lib/config'

/**
 * WebP格式自适应图片组件
 * 集成懒加载和渐进式加载功能，支持WebP格式自动切换
 */
const WebPAdaptiveImage = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  placeholderSrc,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  onProgress,
  style = {},
  quality = 75,
  sizes = '100vw',
  enableRetry = true,
  retryCount = 3,
  retryDelay = 1000,
  cacheStrategy = 'both', // 'memory' | 'localStorage' | 'both'
  transitionDuration = 700,
  enableWebP = true, // 是否启用WebP自适应
  forceWebP = false, // 强制使用WebP（忽略浏览器支持检测）
  webpQuality = 80, // WebP质量
  fallbackStrategy = 'original', // 'original' | 'jpeg' | 'png'
  ...props
}) => {
  const imgRef = useRef(null)
  const retryCountRef = useRef(0)
  const loadStartTimeRef = useRef(0)
  const webpSupportRef = useRef(null) // 缓存WebP支持检测结果
  
  // 状态管理
  const [loadingState, setLoadingState] = useState('idle')
  const [currentSrc, setCurrentSrc] = useState('')
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [imageMetadata, setImageMetadata] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFormat, setSelectedFormat] = useState('original') // 'webp' | 'original'

  // 缓存管理
  const [imageCache] = useState(() => {
    const cache = new Map()
    
    // 从 localStorage 恢复缓存
    if (typeof window !== 'undefined' && (cacheStrategy === 'localStorage' || cacheStrategy === 'both')) {
      try {
        const stored = localStorage.getItem('webp-adaptive-image-cache')
        if (stored) {
          const parsedCache = JSON.parse(stored)
          Object.entries(parsedCache).forEach(([key, value]) => {
            // 检查缓存是否过期（24小时）
            if (Date.now() - value.timestamp < 24 * 60 * 60 * 1000) {
              cache.set(key, value)
            }
          })
        }
      } catch (error) {
        console.warn('[WebPAdaptiveImage] 缓存恢复失败:', error)
      }
    }
    
    return cache
  })

  // 配置
  const config = useMemo(() => ({
    defaultPlaceholder: siteConfig('IMG_LAZY_LOAD_PLACEHOLDER') || '/images/placeholder.svg',
    enableProgressiveLoading: siteConfig('ENABLE_PROGRESSIVE_LOADING', true),
    maxCacheSize: siteConfig('IMG_CACHE_MAX_SIZE', 100),
    compressionQuality: Math.max(10, Math.min(100, quality)),
    webpQuality: Math.max(10, Math.min(100, webpQuality)),
  }), [quality, webpQuality])

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

      if (forceWebP) {
        webpSupportRef.current = true
        resolve(true)
        return
      }

      // 使用Canvas检测WebP支持
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      
      try {
        const webpDataUrl = canvas.toDataURL('image/webp')
        const supported = webpDataUrl.indexOf('data:image/webp') === 0
        
        webpSupportRef.current = supported
        resolve(webpSupportRef.current)
      } catch (error) {
        // 降级处理
        webpSupportRef.current = false
        resolve(false)
      }
    })
  }, [forceWebP])

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
      originalParams.set('q', String(config.compressionQuality))
      if (width) originalParams.set('w', String(width))
      originalUrl.search = originalParams.toString()
      
      // WebP版本
      let webpUrl = originalUrl.toString()
      if (enableWebP && webpSupported) {
        const webpUrlObj = new URL(originalSrc, window.location.origin)
        const webpParams = new URLSearchParams(webpUrlObj.search)
        webpParams.set('format', 'webp')
        webpParams.set('q', String(config.webpQuality))
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
      thumbnailParams.set('blur', '10')
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
      console.warn('[WebPAdaptiveImage] URL处理失败:', error)
      return {
        original: originalSrc,
        webp: originalSrc,
        lowQuality: originalSrc,
        thumbnail: originalSrc,
        webpSupported: false
      }
    }
  }, [enableWebP, width, config.compressionQuality, config.webpQuality, detectWebPSupport])

  /**
   * 智能图片预加载器
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
      loadStartTimeRef.current = startTime
      
      // 设置图片属性
      if (sizes) img.sizes = sizes
      if (options.crossOrigin) img.crossOrigin = options.crossOrigin
      
      // 进度模拟器
      let progress = 0
      let progressInterval = null
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const estimatedTotal = options.estimatedLoadTime || 2000
        
        const timeBasedProgress = Math.min((elapsed / estimatedTotal) * 85, 85)
        const randomFactor = (Math.random() - 0.5) * 5
        progress = Math.max(0, Math.min(90, timeBasedProgress + randomFactor))
        
        setLoadingProgress(Math.round(progress))
        
        if (onProgress) {
          onProgress({
            progress: Math.round(progress),
            stage: options.stage || 'loading',
            format: selectedFormat,
            elapsed,
            estimated: estimatedTotal
          })
        }
      }

      if (options.showProgress !== false) {
        progressInterval = setInterval(updateProgress, 100)
      }

      img.onload = () => {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        
        setLoadingProgress(100)
        
        // 收集图片元数据
        const imageData = {
          src: imageSrc,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          loadTime: Date.now() - startTime,
          timestamp: Date.now(),
          fileSize: options.estimatedSize || 0,
          format: options.format || selectedFormat,
          webpSupported: options.webpSupported || false
        }
        
        // 缓存管理
        if (imageCache.size >= config.maxCacheSize) {
          const oldestKey = Array.from(imageCache.keys())[0]
          imageCache.delete(oldestKey)
        }
        
        imageCache.set(cacheKey, imageData)
        
        // 持久化缓存
        if (cacheStrategy === 'localStorage' || cacheStrategy === 'both') {
          try {
            const cacheObject = Object.fromEntries(imageCache.entries())
            localStorage.setItem('webp-adaptive-image-cache', JSON.stringify(cacheObject))
          } catch (error) {
            console.warn('[WebPAdaptiveImage] 缓存持久化失败:', error)
          }
        }
        
        setImageMetadata(imageData)
        
        const transitionDelay = options.transitionDelay || 200
        setTimeout(() => {
          resolve(imageData)
        }, transitionDelay)
      }

      img.onerror = (errorEvent) => {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        
        setLoadingProgress(0)
        
        const errorInfo = {
          message: `Failed to load image: ${imageSrc}`,
          src: imageSrc,
          format: selectedFormat,
          timestamp: Date.now(),
          retryCount: retryCountRef.current,
          originalError: errorEvent
        }
        
        console.warn('[WebPAdaptiveImage] 图片加载失败:', errorInfo)
        reject(errorInfo)
      }

      img.src = imageSrc
      
      // 超时处理
      const timeout = options.timeout || 15000
      setTimeout(() => {
        if (!img.complete) {
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          reject({
            message: `Image load timeout: ${imageSrc}`,
            src: imageSrc,
            format: selectedFormat,
            timeout: true
          })
        }
      }, timeout)
    })
  }, [imageCache, config.maxCacheSize, cacheStrategy, onProgress, selectedFormat, sizes])

  /**
   * 重试机制（支持格式降级）
   */
  const retryLoad = useCallback(async (loadFunction, maxRetries = retryCount) => {
    let lastError = null
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        retryCountRef.current = i
        const result = await loadFunction()
        return result
      } catch (error) {
        lastError = error
        
        // 如果是WebP加载失败，尝试降级到原格式
        if (i === 0 && selectedFormat === 'webp' && enableWebP) {
          console.log('[WebPAdaptiveImage] WebP加载失败，降级到原格式')
          setSelectedFormat('original')
          
          // 重新生成URL并重试
          const imageUrls = await generateImageUrls(src)
          if (imageUrls.original !== imageUrls.webp) {
            try {
              const fallbackResult = await loadFunction(imageUrls.original)
              return fallbackResult
            } catch (fallbackError) {
              console.warn('[WebPAdaptiveImage] 原格式也加载失败:', fallbackError)
            }
          }
        }
        
        if (i < maxRetries) {
          const delay = retryDelay * Math.pow(2, i)
          console.log(`[WebPAdaptiveImage] 重试 ${i + 1}/${maxRetries}, ${delay}ms后重试`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }, [retryCount, retryDelay, selectedFormat, enableWebP, generateImageUrls, src])

  /**
   * 渐进式加载主逻辑
   */
  const startProgressiveLoading = useCallback(async () => {
    if (!src || !isIntersecting) return

    try {
      setError(null)
      const imageUrls = await generateImageUrls(src)
      
      // 阶段1: 显示占位符
      setLoadingState('placeholder')
      if (placeholder === 'custom' && placeholderSrc) {
        setCurrentSrc(placeholderSrc)
      } else if (placeholder === 'blur') {
        setCurrentSrc(config.defaultPlaceholder)
      }

      if (config.enableProgressiveLoading) {
        // 阶段2: 加载缩略图
        try {
          setLoadingState('lowQuality')
          const thumbnailData = await preloadImage(imageUrls.thumbnail, `thumb_${src}_${selectedFormat}`, {
            estimatedLoadTime: 500,
            transitionDelay: 100,
            stage: 'thumbnail',
            format: selectedFormat,
            webpSupported: imageUrls.webpSupported,
            showProgress: false
          })
          setCurrentSrc(thumbnailData.src)
          
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // 加载低质量版本
          const lowQualityData = await preloadImage(imageUrls.lowQuality, `low_${src}_${selectedFormat}`, {
            estimatedLoadTime: 1000,
            transitionDelay: 150,
            stage: 'lowQuality',
            format: selectedFormat,
            webpSupported: imageUrls.webpSupported
          })
          setCurrentSrc(lowQualityData.src)
          
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.warn('[WebPAdaptiveImage] 低质量图片加载失败，直接加载原图:', error)
        }
      }

      // 阶段3: 加载高质量图片
      setLoadingState('loading')
      
      const loadHighQuality = async (targetUrl = null) => {
        const finalUrl = targetUrl || (selectedFormat === 'webp' ? imageUrls.webp : imageUrls.original)
        return await preloadImage(finalUrl, `${src}_${selectedFormat}`, {
          estimatedLoadTime: 3000,
          transitionDelay: 300,
          stage: 'highQuality',
          format: selectedFormat,
          webpSupported: imageUrls.webpSupported,
          crossOrigin: 'anonymous'
        })
      }

      const highQualityData = enableRetry 
        ? await retryLoad(loadHighQuality)
        : await loadHighQuality()
      
      setLoadingState('loaded')
      setCurrentSrc(highQualityData.src)

      // 触发加载完成回调
      if (onLoad) {
        onLoad({
          src: highQualityData.src,
          loadingState: 'loaded',
          imageData: highQualityData,
          totalLoadTime: Date.now() - loadStartTimeRef.current,
          retryCount: retryCountRef.current,
          selectedFormat,
          webpSupported: imageUrls.webpSupported
        })
      }

    } catch (error) {
      console.error('[WebPAdaptiveImage] 渐进式加载失败:', error)
      setLoadingState('error')
      setError(error)
      setCurrentSrc(config.defaultPlaceholder)
      
      if (onError) {
        onError(error)
      }
    }
  }, [
    src, 
    isIntersecting, 
    generateImageUrls, 
    config, 
    placeholder, 
    placeholderSrc, 
    preloadImage, 
    enableRetry, 
    retryLoad, 
    onLoad, 
    onError,
    selectedFormat
  ])

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
   * 启动渐进式加载
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
    switch (placeholder) {
      case 'skeleton':
        return (
          <div className="animate-pulse bg-gray-200 rounded">
            <div className="flex items-center justify-center h-full">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )
      
      case 'color':
        return (
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <div className="w-12 h-12 bg-white bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-400 rounded animate-pulse"></div>
            </div>
          </div>
        )
      
      case 'custom':
        if (placeholderSrc) {
          return (
            <img
              src={placeholderSrc}
              alt=""
              className="w-full h-full object-cover filter blur-sm"
            />
          )
        }
        break
      
      default: // 'blur'
        return (
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse">
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 bg-gray-300 rounded-full animate-bounce"></div>
            </div>
          </div>
        )
    }
  }

  /**
   * 获取加载动画
   */
  const getLoadingAnimation = () => {
    if (loadingState === 'loading') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-lg p-3 shadow-lg border">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-5 h-5 border-2 border-blue-200 rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">{Math.round(loadingProgress)}%</span>
                  {selectedFormat === 'webp' && (
                    <span className="text-xs bg-green-100 text-green-600 px-1 rounded">WebP</span>
                  )}
                </div>
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  /**
   * 获取图片样式类
   */
  const getImageClasses = () => {
    const baseClasses = `transition-all ease-out ${className}`
    const duration = `duration-[${transitionDuration}ms]`
    
    switch (loadingState) {
      case 'placeholder':
        return `${baseClasses} ${duration} opacity-70 scale-105 filter blur-sm`
      case 'lowQuality':
        return `${baseClasses} ${duration} opacity-80 scale-102 filter blur-[2px]`
      case 'loading':
        return `${baseClasses} ${duration} opacity-90 scale-101 filter blur-[1px]`
      case 'loaded':
        return `${baseClasses} ${duration} opacity-100 scale-100 filter-none`
      case 'error':
        return `${baseClasses} ${duration} opacity-50 grayscale scale-95`
      default:
        return `${baseClasses} ${duration}`
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
      className="relative group"
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
          <div className="text-center text-gray-500 p-4">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium mb-1">图片加载失败</p>
            {enableRetry && retryCountRef.current > 0 && (
              <p className="text-xs text-gray-400">已重试 {retryCountRef.current} 次</p>
            )}
            {error?.timeout && (
              <p className="text-xs text-gray-400">加载超时</p>
            )}
            {selectedFormat === 'webp' && (
              <p className="text-xs text-gray-400">WebP格式加载失败</p>
            )}
          </div>
        </div>
      )}

      {/* 开发模式信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <div>状态: {loadingState}</div>
          <div>格式: {selectedFormat}</div>
          {imageMetadata && (
            <>
              <div>尺寸: {imageMetadata.width}×{imageMetadata.height}</div>
              <div>加载时间: {imageMetadata.loadTime}ms</div>
              <div>WebP支持: {imageMetadata.webpSupported ? '是' : '否'}</div>
              {retryCountRef.current > 0 && <div>重试: {retryCountRef.current}次</div>}
            </>
          )}
        </div>
      )}

      {/* 格式指示器 */}
      {selectedFormat === 'webp' && loadingState === 'loaded' && (
        <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          WebP
        </div>
      )}
    </div>
  )
}

export default WebPAdaptiveImage