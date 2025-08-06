import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

/**
 * WebP自适应图片组件
 * 根据浏览器支持情况自动选择最佳图片格式
 */
const WebPAdaptiveImage = ({ 
  src, 
  webpSrc, 
  fallbackSrc, 
  alt, 
  className,
  width,
  height,
  priority = false,
  loading = 'lazy',
  onLoad,
  onError,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(src)
  const [isWebPSupported, setIsWebPSupported] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const imgRef = useRef(null)

  // 检测WebP支持
  useEffect(() => {
    checkWebPSupport().then(supported => {
      setIsWebPSupported(supported)
      
      // 根据支持情况选择图片源
      if (supported && webpSrc) {
        setImageSrc(webpSrc)
      } else if (fallbackSrc) {
        setImageSrc(fallbackSrc)
      } else {
        setImageSrc(src)
      }
    })
  }, [src, webpSrc, fallbackSrc])

  /**
   * 检测浏览器是否支持WebP
   */
  const checkWebPSupport = () => {
    return new Promise((resolve) => {
      // 如果已经检测过，使用缓存结果
      const cached = sessionStorage.getItem('webp-support')
      if (cached !== null) {
        resolve(cached === 'true')
        return
      }

      // 创建一个1x1像素的WebP图片进行测试
      const webpTestImage = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
      
      const img = new window.Image()
      
      img.onload = () => {
        const supported = img.width === 1 && img.height === 1
        sessionStorage.setItem('webp-support', supported.toString())
        resolve(supported)
      }
      
      img.onerror = () => {
        sessionStorage.setItem('webp-support', 'false')
        resolve(false)
      }
      
      img.src = webpTestImage
    })
  }

  /**
   * 处理图片加载成功
   */
  const handleImageLoad = (event) => {
    setIsLoading(false)
    setImageError(false)
    
    if (onLoad) {
      onLoad(event)
    }

    // 记录加载成功的统计
    recordImageLoadStats('success', imageSrc, isWebPSupported)
  }

  /**
   * 处理图片加载失败
   */
  const handleImageError = (event) => {
    setImageError(true)
    setIsLoading(false)

    // 如果WebP图片加载失败，尝试降级到原图
    if (imageSrc === webpSrc && (fallbackSrc || src)) {
      console.warn(`[WebP自适应] WebP图片加载失败，降级到原图: ${imageSrc}`)
      setImageSrc(fallbackSrc || src)
      return
    }

    if (onError) {
      onError(event)
    }

    // 记录加载失败的统计
    recordImageLoadStats('error', imageSrc, isWebPSupported)
  }

  /**
   * 记录图片加载统计
   */
  const recordImageLoadStats = (status, url, webpSupported) => {
    try {
      // 发送统计数据到后端（可选）
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'image_load', {
          event_category: 'WebP Adaptive',
          event_label: status,
          custom_parameter_1: webpSupported ? 'webp_supported' : 'webp_not_supported',
          custom_parameter_2: url.includes('.webp') ? 'webp_format' : 'original_format'
        })
      }
    } catch (error) {
      // 静默失败，不影响图片显示
    }
  }

  /**
   * 获取图片的优化参数
   */
  const getOptimizedImageProps = () => {
    const baseProps = {
      src: imageSrc,
      alt: alt || '',
      className: className || '',
      loading: priority ? 'eager' : loading,
      onLoad: handleImageLoad,
      onError: handleImageError,
      ref: imgRef,
      ...props
    }

    // 如果提供了尺寸，使用Next.js Image组件
    if (width && height) {
      return {
        ...baseProps,
        width,
        height,
        priority
      }
    }

    return baseProps
  }

  // 如果还在检测WebP支持，显示加载状态
  if (isWebPSupported === null) {
    return (
      <div 
        className={`${className || ''} bg-gray-200 animate-pulse`}
        style={{ width: width || '100%', height: height || 'auto' }}
      >
        <div className="flex items-center justify-center h-full text-gray-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    )
  }

  const imageProps = getOptimizedImageProps()

  // 使用Next.js Image组件（如果提供了尺寸）
  if (width && height) {
    return (
      <div className="relative">
        <Image {...imageProps} />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {imageError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">图片加载失败</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 使用普通img标签
  return (
    <div className="relative">
      <img {...imageProps} />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * WebP支持检测Hook
 */
export const useWebPSupport = () => {
  const [isSupported, setIsSupported] = useState(null)

  useEffect(() => {
    const checkSupport = async () => {
      // 检查缓存
      const cached = sessionStorage.getItem('webp-support')
      if (cached !== null) {
        setIsSupported(cached === 'true')
        return
      }

      // 检测支持
      const webpTestImage = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
      
      try {
        const img = new window.Image()
        
        const supported = await new Promise((resolve) => {
          img.onload = () => resolve(img.width === 1 && img.height === 1)
          img.onerror = () => resolve(false)
          img.src = webpTestImage
        })
        
        sessionStorage.setItem('webp-support', supported.toString())
        setIsSupported(supported)
        
      } catch (error) {
        sessionStorage.setItem('webp-support', 'false')
        setIsSupported(false)
      }
    }

    checkSupport()
  }, [])

  return isSupported
}

/**
 * 获取浏览器信息
 */
export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null

  const ua = navigator.userAgent
  const browser = {
    isChrome: /Chrome/.test(ua) && !/Edge/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isEdge: /Edge/.test(ua),
    isOpera: /Opera/.test(ua),
    userAgent: ua
  }

  return browser
}

export default WebPAdaptiveImage