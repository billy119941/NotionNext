import React, { useState, useEffect } from 'react'
import WebPAdaptiveImage, { useWebPSupport, getBrowserInfo } from '@/components/WebPAdaptiveImage'

/**
 * WebP功能测试页面
 * 用于测试和演示WebP自适应功能
 */
const WebPTestPage = () => {
  const [testResults, setTestResults] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const webpSupported = useWebPSupport()
  const browserInfo = getBrowserInfo()

  // 测试图片数据
  const testImages = [
    {
      id: 1,
      name: '测试图片1 - Unsplash',
      originalSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      webpSrc: 'https://image.shareking.vip/webp/test1_converted.webp',
      fallbackSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      width: 400,
      height: 300
    },
    {
      id: 2,
      name: '测试图片2 - Notion封面',
      originalSrc: 'https://www.notion.so/images/page-cover/woodcuts_1.jpg',
      webpSrc: 'https://image.shareking.vip/webp/test2_converted.webp',
      fallbackSrc: 'https://www.notion.so/images/page-cover/woodcuts_1.jpg',
      width: 400,
      height: 200
    },
    {
      id: 3,
      name: '测试图片3 - 响应式',
      originalSrc: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80',
      webpSrc: 'https://image.shareking.vip/webp/test3_converted.webp',
      fallbackSrc: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80'
      // 不设置width/height，测试响应式
    }
  ]

  useEffect(() => {
    setIsLoading(false)
  }, [])

  /**
   * 测试WebP转换API
   */
  const testWebPConversion = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/webp-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'convert-image',
          imageUrl: testImages[0].originalSrc,
          articleId: 'test-article'
        })
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'WebP转换测试',
        result: result.success ? '成功' : '失败',
        details: result.data || result.message
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'WebP转换测试',
        result: '错误',
        details: error.message
      }])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 测试图片扫描API
   */
  const testImageScanning = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/webp-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'scan-article',
          articleId: 'test-article-123'
        })
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: '图片扫描测试',
        result: result.success ? '成功' : '失败',
        details: result.data || result.message
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: '图片扫描测试',
        result: '错误',
        details: error.message
      }])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 获取系统状态
   */
  const getSystemStatus = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/webp-conversion?action=status')
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: '系统状态查询',
        result: result.success ? '成功' : '失败',
        details: result.data
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: '系统状态查询',
        result: '错误',
        details: error.message
      }])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 清空测试结果
   */
  const clearResults = () => {
    setTestResults([])
  }

  if (isLoading && testResults.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WebP自适应功能测试
          </h1>
          <p className="text-gray-600">
            测试和演示Notion图片自动转换WebP系统
          </p>
        </div>

        {/* 浏览器信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">浏览器信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">WebP支持状态</p>
              <p className="font-medium">
                {webpSupported === null ? '检测中...' : 
                 webpSupported ? '✅ 支持WebP' : '❌ 不支持WebP'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">浏览器类型</p>
              <p className="font-medium">
                {browserInfo ? (
                  browserInfo.isChrome ? 'Chrome' :
                  browserInfo.isFirefox ? 'Firefox' :
                  browserInfo.isSafari ? 'Safari' :
                  browserInfo.isEdge ? 'Edge' :
                  browserInfo.isOpera ? 'Opera' : '其他'
                ) : '未知'}
              </p>
            </div>
          </div>
        </div>

        {/* 测试图片展示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">WebP自适应图片测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testImages.map((image) => (
              <div key={image.id} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">{image.name}</h3>
                <WebPAdaptiveImage
                  src={image.originalSrc}
                  webpSrc={image.webpSrc}
                  fallbackSrc={image.fallbackSrc}
                  alt={image.name}
                  width={image.width}
                  height={image.height}
                  className="w-full rounded"
                  onLoad={() => console.log(`图片加载成功: ${image.name}`)}
                  onError={() => console.log(`图片加载失败: ${image.name}`)}
                />
                <div className="mt-2 text-xs text-gray-500">
                  <p>原图: {image.originalSrc.substring(0, 50)}...</p>
                  <p>WebP: {image.webpSrc.substring(0, 50)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 功能测试按钮 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">功能测试</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testWebPConversion}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '测试中...' : '测试WebP转换'}
            </button>
            <button
              onClick={testImageScanning}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? '测试中...' : '测试图片扫描'}
            </button>
            <button
              onClick={getSystemStatus}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? '查询中...' : '查询系统状态'}
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              清空结果
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{result.action}</span>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.result === '成功' ? 'bg-green-100 text-green-800' :
                      result.result === '失败' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.result}
                    </span>
                  </div>
                  <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                    {typeof result.details === 'object' 
                      ? JSON.stringify(result.details, null, 2)
                      : result.details}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WebPTestPage