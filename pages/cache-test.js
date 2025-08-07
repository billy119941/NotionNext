/**
 * 缓存策略测试页面
 * 用于验证不同资源类型的缓存效果
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function CacheTest() {
  const [cacheStats, setCacheStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState([])

  // 获取缓存统计信息
  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/cache-stats')
      const data = await response.json()
      if (data.success) {
        setCacheStats(data.data)
      }
    } catch (error) {
      console.error('获取缓存统计失败:', error)
    }
  }

  // 清空缓存
  const clearCache = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cache-stats', {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setCacheStats(data.data)
        alert('缓存已清空')
      }
    } catch (error) {
      console.error('清空缓存失败:', error)
      alert('清空缓存失败')
    } finally {
      setLoading(false)
    }
  }

  // 预热缓存
  const warmupCache = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cache-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paths: ['/favicon.ico', '/images/avatar.png']
        })
      })
      const data = await response.json()
      if (data.success) {
        setCacheStats(data.data)
        alert('缓存预热完成')
      }
    } catch (error) {
      console.error('缓存预热失败:', error)
      alert('缓存预热失败')
    } finally {
      setLoading(false)
    }
  }

  // 测试资源加载时间
  const testResourceLoading = async () => {
    const testResources = [
      { url: '/favicon.ico', type: '图标' },
      { url: '/images/avatar.png', type: '图片' },
      { url: '/api/cache-stats', type: 'API' }
    ]

    const results = []

    for (const resource of testResources) {
      const startTime = performance.now()
      
      try {
        const response = await fetch(resource.url + '?t=' + Date.now())
        const endTime = performance.now()
        const loadTime = endTime - startTime

        results.push({
          url: resource.url,
          type: resource.type,
          loadTime: loadTime.toFixed(2),
          status: response.status,
          cached: response.headers.get('cache-control') || 'no-cache',
          etag: response.headers.get('etag') || 'none'
        })
      } catch (error) {
        results.push({
          url: resource.url,
          type: resource.type,
          loadTime: 'Error',
          status: 'Error',
          cached: 'Error',
          etag: 'Error'
        })
      }
    }

    setTestResults(results)
  }

  useEffect(() => {
    fetchCacheStats()
    const interval = setInterval(fetchCacheStats, 5000) // 每5秒更新一次
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Head>
        <title>缓存策略测试 - NotionNext</title>
        <meta name="description" content="测试和监控网站缓存策略的效果" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">缓存策略测试</h1>
            
            {/* 缓存统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600">缓存命中</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {cacheStats?.hits || 0}
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-600">缓存未命中</h3>
                <p className="text-2xl font-bold text-red-900">
                  {cacheStats?.misses || 0}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600">命中率</h3>
                <p className="text-2xl font-bold text-green-900">
                  {cacheStats?.hitRate || '0%'}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600">内存使用</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {cacheStats?.memoryUsage || '0MB'}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={fetchCacheStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                刷新统计
              </button>
              
              <button
                onClick={warmupCache}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={loading}
              >
                预热缓存
              </button>
              
              <button
                onClick={clearCache}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                清空缓存
              </button>
              
              <button
                onClick={testResourceLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                disabled={loading}
              >
                测试加载时间
              </button>
            </div>

            {/* 详细统计信息 */}
            {cacheStats && (
              <div className="bg-gray-50 p-4 rounded-lg mb-8">
                <h3 className="text-lg font-semibold mb-4">详细信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>缓存条目数:</strong> {cacheStats.size}</p>
                    <p><strong>最后清理时间:</strong> {new Date(cacheStats.lastCleanup).toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>服务器运行时间:</strong> {Math.floor(cacheStats.uptime / 60)} 分钟</p>
                    <p><strong>更新时间:</strong> {new Date(cacheStats.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 资源加载测试结果 */}
            {testResults.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">资源加载测试结果</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-4 py-2 text-left">资源</th>
                        <th className="px-4 py-2 text-left">类型</th>
                        <th className="px-4 py-2 text-left">加载时间(ms)</th>
                        <th className="px-4 py-2 text-left">状态</th>
                        <th className="px-4 py-2 text-left">缓存策略</th>
                        <th className="px-4 py-2 text-left">ETag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.map((result, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2 font-mono text-sm">{result.url}</td>
                          <td className="px-4 py-2">{result.type}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              parseFloat(result.loadTime) < 100 
                                ? 'bg-green-100 text-green-800' 
                                : parseFloat(result.loadTime) < 500
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.loadTime}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.status === 200 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">{result.cached}</td>
                          <td className="px-4 py-2 font-mono text-xs">{result.etag}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 缓存策略说明 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">缓存策略说明</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">静态资源缓存</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>图片文件:</strong> 1年缓存，不可变</li>
                  <li>• <strong>字体文件:</strong> 1年缓存，不可变</li>
                  <li>• <strong>CSS/JS文件:</strong> 1年缓存，不可变</li>
                  <li>• <strong>视频文件:</strong> 30天缓存</li>
                  <li>• <strong>音频文件:</strong> 30天缓存</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">动态内容缓存</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>API响应:</strong> 5分钟客户端，10分钟CDN</li>
                  <li>• <strong>HTML页面:</strong> 必须重新验证</li>
                  <li>• <strong>RSS/XML:</strong> 1小时缓存</li>
                  <li>• <strong>清单文件:</strong> 1天缓存</li>
                  <li>• <strong>文档文件:</strong> 7天缓存</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}