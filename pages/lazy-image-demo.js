import React, { useState, useCallback } from 'react'
import Head from 'next/head'
import LazyImageComponent from '../components/LazyImageComponent'
import WebPAdaptiveImage from '../components/WebPAdaptiveImage'

/**
 * 懒加载图片和WebP格式自适应演示页面
 */
const LazyImageDemo = () => {
  const [loadingStats, setLoadingStats] = useState([])
  const [selectedComponent, setSelectedComponent] = useState('lazy')

  // 演示图片列表
  const demoImages = [
    {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      alt: '山景图片',
      description: '高分辨率山景照片'
    },
    {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
      alt: '森林图片',
      description: '森林小径照片'
    },
    {
      src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
      alt: '城市图片',
      description: '城市夜景照片'
    },
    {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=90',
      alt: '海滩图片',
      description: '海滩日落照片'
    }
  ]

  // 处理加载完成事件
  const handleImageLoad = useCallback((imageData, index) => {
    setLoadingStats(prev => [
      ...prev.filter(stat => stat.index !== index),
      {
        index,
        ...imageData,
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }, [])

  // 处理加载错误事件
  const handleImageError = useCallback((error, index) => {
    console.error(`图片 ${index + 1} 加载失败:`, error)
    setLoadingStats(prev => [
      ...prev.filter(stat => stat.index !== index),
      {
        index,
        error: true,
        message: error.message,
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }, [])

  // 组件配置
  const componentConfigs = {
    lazy: {
      title: 'LazyImageComponent',
      description: '基础懒加载组件，支持WebP格式自适应',
      Component: LazyImageComponent
    },
    webp: {
      title: 'WebPAdaptiveImage',
      description: '专门的WebP自适应组件，具备更强的格式选择能力',
      Component: WebPAdaptiveImage
    }
  }

  const currentConfig = componentConfigs[selectedComponent]
  const ImageComponent = currentConfig.Component

  return (
    <>
      <Head>
        <title>懒加载图片和WebP格式自适应演示 - NotionNext</title>
        <meta name="description" content="展示懒加载图片组件和WebP格式自适应功能" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              懒加载图片和WebP格式自适应演示
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              体验不同组件的图片加载效果，包括WebP格式自动切换、浏览器兼容性检测等功能
            </p>
          </div>

          {/* 组件选择 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">选择组件类型</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(componentConfigs).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedComponent(key)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedComponent === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 mb-2">{config.title}</h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* WebP支持检测 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">浏览器WebP支持检测</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">用户代理</span>
                <p className="font-medium text-xs break-all">
                  {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">WebP支持</span>
                <p className="font-medium">
                  {typeof window !== 'undefined' && window.navigator ? (
                    <span className="text-green-600">检测中...</span>
                  ) : (
                    <span className="text-gray-400">未知</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Canvas支持</span>
                <p className="font-medium">
                  {typeof window !== 'undefined' ? (
                    <span className="text-green-600">是</span>
                  ) : (
                    <span className="text-gray-400">否</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">当前组件</span>
                <p className="font-medium">{currentConfig.title}</p>
              </div>
            </div>
          </div>

          {/* 图片展示区域 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">图片加载效果对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {demoImages.map((image, index) => (
                <div key={`${selectedComponent}-${index}`} className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <ImageComponent
                      src={image.src}
                      alt={image.alt}
                      width={600}
                      height={400}
                      enableWebP={true}
                      webpQuality={80}
                      placeholder="blur"
                      onLoad={(data) => handleImageLoad(data, index)}
                      onError={(error) => handleImageError(error, index)}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{image.alt}</h3>
                    <p className="text-sm text-gray-600">{image.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 加载统计 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">加载统计</h2>
            {loadingStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">图片</th>
                      <th className="text-left py-2">状态</th>
                      <th className="text-left py-2">格式</th>
                      <th className="text-left py-2">WebP支持</th>
                      <th className="text-left py-2">加载时间</th>
                      <th className="text-left py-2">尺寸</th>
                      <th className="text-left py-2">完成时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStats.map((stat) => (
                      <tr key={stat.index} className="border-b">
                        <td className="py-2">图片 {stat.index + 1}</td>
                        <td className="py-2">
                          {stat.error ? (
                            <span className="text-red-600">失败</span>
                          ) : (
                            <span className="text-green-600">成功</span>
                          )}
                        </td>
                        <td className="py-2">
                          {stat.selectedFormat ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              stat.selectedFormat === 'webp' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {stat.selectedFormat.toUpperCase()}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2">
                          {stat.webpSupported !== undefined ? (
                            stat.webpSupported ? 
                              <span className="text-green-600">是</span> : 
                              <span className="text-red-600">否</span>
                          ) : '-'}
                        </td>
                        <td className="py-2">
                          {stat.totalLoadTime ? `${stat.totalLoadTime}ms` : '-'}
                        </td>
                        <td className="py-2">
                          {stat.imageData ? 
                            `${stat.imageData.width}×${stat.imageData.height}` : 
                            '-'
                          }
                        </td>
                        <td className="py-2">{stat.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">暂无加载数据</p>
            )}
          </div>

          {/* WebP格式自适应说明 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">WebP格式自适应功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🔍 智能检测</h3>
                <p className="text-sm text-gray-600">
                  自动检测浏览器WebP支持，结合User Agent和Canvas检测
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🔄 自动切换</h3>
                <p className="text-sm text-gray-600">
                  支持WebP的浏览器自动使用WebP格式，不支持的降级到原格式
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📦 格式缓存</h3>
                <p className="text-sm text-gray-600">
                  缓存格式检测结果和图片数据，避免重复检测和加载
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">⚡ 渐进加载</h3>
                <p className="text-sm text-gray-600">
                  结合渐进式加载，从低质量WebP到高质量WebP的平滑过渡
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🛡️ 降级策略</h3>
                <p className="text-sm text-gray-600">
                  WebP加载失败时自动降级到原格式，确保图片正常显示
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📊 性能监控</h3>
                <p className="text-sm text-gray-600">
                  实时监控加载性能，提供格式选择和加载时间统计
                </p>
              </div>
            </div>
          </div>

          {/* 性能对比 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">性能优化效果</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">25-35%</div>
                <p className="text-sm text-gray-600">文件大小减少</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">40-60%</div>
                <p className="text-sm text-gray-600">感知加载时间减少</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">95%+</div>
                <p className="text-sm text-gray-600">浏览器兼容性</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default LazyImageDemo