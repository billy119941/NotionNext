/**
 * 缓存中间件测试
 * 验证静态资源缓存策略的正确性
 */

const { cacheMiddleware, getCacheStats, clearCache, warmupCache } = require('../cache')
const { getCacheHeaders } = require('../../utils/cacheHeaders')
const fs = require('fs')
const path = require('path')

// Mock fs模块
jest.mock('fs')
jest.mock('path')

describe('缓存中间件测试', () => {
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    // 重置模拟对象
    mockReq = {
      method: 'GET',
      url: '/test-image.jpg',
      headers: {}
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
      end: jest.fn()
    }

    mockNext = jest.fn()

    // 清空缓存
    clearCache()

    // 重置fs模拟
    fs.existsSync.mockClear()
    fs.statSync.mockClear()
    fs.readFileSync.mockClear()
  })

  describe('基础功能', () => {
    test('应该跳过非GET请求', async () => {
      mockReq.method = 'POST'

      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    test('应该跳过API路由', async () => {
      mockReq.url = '/api/test'

      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    test('应该跳过动态路由', async () => {
      mockReq.url = '/posts/[id]'

      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('文件系统缓存', () => {
    test('应该从文件系统读取并缓存资源', async () => {
      const mockContent = Buffer.from('test image content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(fs.existsSync).toHaveBeenCalled()
      expect(fs.readFileSync).toHaveBeenCalled()
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', mockContent.length)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.send).toHaveBeenCalledWith(mockContent)
    })

    test('应该处理文件不存在的情况', async () => {
      fs.existsSync.mockReturnValue(false)
      path.join.mockReturnValue('/mock/path/nonexistent.jpg')

      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('内存缓存', () => {
    test('应该从内存缓存返回资源', async () => {
      const mockContent = Buffer.from('cached content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      // 第一次请求 - 从文件系统加载
      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      await cacheMiddleware(mockReq, mockRes, mockNext)

      // 重置模拟对象
      mockRes.status.mockClear()
      mockRes.send.mockClear()
      mockRes.setHeader.mockClear()

      // 第二次请求 - 应该从内存缓存返回
      await cacheMiddleware(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.send).toHaveBeenCalledWith(mockContent)
      expect(fs.readFileSync).toHaveBeenCalledTimes(1) // 只调用一次
    })

    test('应该正确处理条件请求', async () => {
      const mockContent = Buffer.from('test content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      // 设置If-None-Match头
      mockReq.headers['if-none-match'] = '"test-etag"'

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      await cacheMiddleware(mockReq, mockRes, mockNext)

      // 第二次请求带相同ETag
      mockRes.status.mockClear()
      mockRes.end.mockClear()

      // 模拟ETag匹配的情况
      const etag = mockRes.setHeader.mock.calls.find(call => call[0] === 'ETag')?.[1]
      if (etag) {
        mockReq.headers['if-none-match'] = etag
        await cacheMiddleware(mockReq, mockRes, mockNext)
        expect(mockRes.status).toHaveBeenCalledWith(304)
        expect(mockRes.end).toHaveBeenCalled()
      }
    })
  })

  describe('缓存统计', () => {
    test('应该正确统计缓存命中和未命中', async () => {
      const initialStats = getCacheStats()
      expect(initialStats.hits).toBe(0)
      expect(initialStats.misses).toBe(0)

      const mockContent = Buffer.from('test content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      // 第一次请求 - 缓存未命中
      await cacheMiddleware(mockReq, mockRes, mockNext)

      // 第二次请求 - 缓存命中
      await cacheMiddleware(mockReq, mockRes, mockNext)

      const finalStats = getCacheStats()
      expect(finalStats.hits).toBe(1)
      expect(finalStats.misses).toBe(1)
      expect(finalStats.hitRate).toBe('50.00%')
    })

    test('应该正确计算缓存大小', async () => {
      const mockContent = Buffer.from('test content for size calculation')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      await cacheMiddleware(mockReq, mockRes, mockNext)

      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.memoryUsage).toContain('MB')
    })
  })

  describe('缓存管理', () => {
    test('应该能够清空缓存', async () => {
      const mockContent = Buffer.from('test content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/test-image.jpg')
      path.extname.mockReturnValue('.jpg')

      // 添加一些缓存
      await cacheMiddleware(mockReq, mockRes, mockNext)

      let stats = getCacheStats()
      expect(stats.size).toBe(1)

      // 清空缓存
      clearCache()

      stats = getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })

    test('应该能够预热缓存', async () => {
      const mockContent = Buffer.from('prewarmed content')
      const mockStats = {
        mtime: new Date('2024-01-01'),
        size: mockContent.length
      }

      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue(mockStats)
      fs.readFileSync.mockReturnValue(mockContent)
      path.join.mockReturnValue('/mock/path/favicon.ico')
      path.extname.mockReturnValue('.ico')

      await warmupCache(['/favicon.ico'])

      const stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    test('应该处理文件读取错误', async () => {
      // 临时抑制console.error以避免测试输出中的错误信息
      const originalError = console.error
      console.error = jest.fn()

      try {
        fs.existsSync.mockReturnValue(true)
        fs.readFileSync.mockImplementation(() => {
          throw new Error('File read error')
        })
        path.join.mockReturnValue('/mock/path/error-file.jpg')

        // 不应该抛出错误，应该调用next()
        await expect(cacheMiddleware(mockReq, mockRes, mockNext)).resolves.not.toThrow()
        expect(mockNext).toHaveBeenCalled()
      } finally {
        // 恢复console.error
        console.error = originalError
      }
    })

    test('应该处理stat错误', async () => {
      // 临时抑制console.error以避免测试输出中的错误信息
      const originalError = console.error
      console.error = jest.fn()

      try {
        fs.existsSync.mockReturnValue(true)
        fs.statSync.mockImplementation(() => {
          throw new Error('Stat error')
        })
        path.join.mockReturnValue('/mock/path/error-file.jpg')

        await expect(cacheMiddleware(mockReq, mockRes, mockNext)).resolves.not.toThrow()
        expect(mockNext).toHaveBeenCalled()
      } finally {
        // 恢复console.error
        console.error = originalError
      }
    })
  })

  describe('内容类型检测', () => {
    test('应该正确设置不同文件类型的Content-Type', async () => {
      const testCases = [
        { url: '/test.jpg', expected: 'image/jpeg' },
        { url: '/test.png', expected: 'image/png' },
        { url: '/test.webp', expected: 'image/webp' },
        { url: '/test.css', expected: 'text/css; charset=utf-8' },
        { url: '/test.js', expected: 'application/javascript; charset=utf-8' },
        { url: '/test.woff2', expected: 'font/woff2' }
      ]

      for (const testCase of testCases) {
        const mockContent = Buffer.from('test content')
        const mockStats = {
          mtime: new Date('2024-01-01'),
          size: mockContent.length
        }

        mockReq.url = testCase.url
        mockRes.setHeader.mockClear()

        fs.existsSync.mockReturnValue(true)
        fs.statSync.mockReturnValue(mockStats)
        fs.readFileSync.mockReturnValue(mockContent)
        path.join.mockReturnValue(`/mock/path${testCase.url}`)
        // 直接设置mock返回值，避免调用真实的path.extname
        const expectedExt = testCase.url.substring(testCase.url.lastIndexOf('.'))
        path.extname.mockReturnValue(expectedExt)

        await cacheMiddleware(mockReq, mockRes, mockNext)

        // 检查是否设置了正确的Content-Type
        const contentTypeCalls = mockRes.setHeader.mock.calls.filter(call => call[0] === 'Content-Type')
        expect(contentTypeCalls.length).toBeGreaterThan(0)
        expect(contentTypeCalls[0][1]).toBe(testCase.expected)
      }
    })
  })
})