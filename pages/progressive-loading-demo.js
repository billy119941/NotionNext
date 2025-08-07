import React, { useState, useCallback } from 'react'
import Head from 'next/head'
import ProgressiveLoading from '../components/ProgressiveLoading'

/**
 * 渐进式图片加载演示页面
 * 展示不同配置下的加载效果
 */
const ProgressiveLoadingDemo = () => {
  const [loadingStats, setLoadingStats] = useState([])
  const [selectedDemo, setSelectedDemo] = useState('basic')

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
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=90',
      alt: '海滩图片',
      description: '海滩日落照片'
    },
    {
      src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
      alt: '城市图片',
      description: '城市夜景照片'
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

  // 处理加载进度事件
  const handleImageProgress = useCallback((progressData, index) => {
    console.log(`图片 ${index + 1} 加载进度:`, progressData)
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

  // 演示配置
  const demoConfigs = {
    basic: {
      title: '基础渐进式加载',
      description: '标准的三阶段加载：占位符 → 低质量 → 高质量',
      config: {
        placeholder: 'blur',
        quality: 75,
        transitionDuration: 700
      }
    },
    skeleton: {
      title: '骨架屏加载',
      description: '使用骨架屏作为占位符',
      config: {
        placeholder: 'skeleton',
        quality: 80,
        transitionDuration: 500
      }
    },
    fast: {
      title: '快速加载模式',
      description: '更短的过渡时间，适合快速网络',
      config: {
        placeholder: 'color',
        quality: 85,
        transitionDuration: 300,
        enableRetry: false
      }
    },
    highQuality: {
      title: '高质量模式',
      description: '更高的图片质量和更长的过渡时间',
      config: {
        placeholder: 'blur',
        quality: 95,
        transitionDuration: 1000,
        retryCount: 5
      }
    }
  }

  const currentConfig = demoConfigs[selectedDemo]

  return (
    <>
      <Head>
        <title>渐进式图片加载演示 - NotionNext</title>
        <meta name="description" content="展示渐进式图片加载组件的各种功能和配置选项" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              渐进式图片加载演示
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              体验不同配置下的图片加载效果，包括占位符类型、加载动画、重试机制等功能
            </p>
          </div>

          {/* 演示模式选择 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">选择演示模式</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(demoConfigs).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedDemo(key)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedDemo === key
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

          {/* 当前配置信息 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">当前配置</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">占位符类型</span>
                <p className="font-medium">{currentConfig.config.placeholder}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">图片质量</span>
                <p className="font-medium">{currentConfig.config.quality}%</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">过渡时长</span>
                <p className="font-medium">{currentConfig.config.transitionDuration}ms</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">重试次数</span>
                <p className="font-medium">{currentConfig.config.retryCount || 3}</p>
              </div>
            </div>
          </div>

          {/* 图片展示区域 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">图片加载效果</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {demoImages.map((image, index) => (
                <div key={`${selectedDemo}-${index}`} className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <ProgressiveLoading
                      src={image.src}
                      alt={image.alt}
                      width={600}
                      height={400}
                      onLoad={(data) => handleImageLoad(data, index)}
                      onProgress={(data) => handleImageProgress(data, index)}
                      onError={(error) => handleImageError(error, index)}
                      {...currentConfig.config}
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">加载统计</h2>
            {loadingStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">图片</th>
                      <th className="text-left py-2">状态</th>
                      <th className="text-left py-2">加载时间</th>
                      <th className="text-left py-2">重试次数</th>
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
                          {stat.totalLoadTime ? `${stat.totalLoadTime}ms` : '-'}
                        </td>
                        <td className="py-2">{stat.retryCount || 0}</td>
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

          {/* 功能说明 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">功能特性</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🎯 智能缓存</h3>
                <p className="text-sm text-gray-600">
                  内存和本地存储双重缓存，避免重复加载相同图片
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📊 加载进度</h3>
                <p className="text-sm text-gray-600">
                  实时显示加载进度，提供更好的用户体验
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🔄 重试机制</h3>
                <p className="text-sm text-gray-600">
                  自动重试失败的图片加载，支持指数退避策略
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🎨 多种占位符</h3>
                <p className="text-sm text-gray-600">
                  支持模糊、骨架屏、颜色、自定义等多种占位符类型
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">⚡ 渐进加载</h3>
                <p className="text-sm text-gray-600">
                  从低质量到高质量的平滑过渡，优化感知性能
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">📱 响应式</h3>
                <p className="text-sm text-gray-600">
                  支持响应式图片和不同设备的自适应加载
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProgressiveLoadingDemo