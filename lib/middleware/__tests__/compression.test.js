/**
 * 压缩中间件测试
 * 验证Brotli和Gzip压缩功能
 */

const {
  supportsBrotli,
  supportsGzip,
  isCompressible,
  shouldCompress,
  selectCompressionFormat,
  compressBrotli,
  compressGzip,
  getCompressionConfig,
  getCompressionStats,
  COMPRESSION_CONFIG
} = require('../compression')

// Mock zlib
jest.mock('zlib', () => ({
  constants: {
    BROTLI_PARAM_QUALITY: 'BROTLI_PARAM_QUALITY',
    BROTLI_PARAM_SIZE_HINT: 'BROTLI_PARAM_SIZE_HINT',
    BROTLI_PARAM_MODE: 'BROTLI_PARAM_MODE',
    BROTLI_PARAM_LGWIN: 'BROTLI_PARAM_LGWIN',
    BROTLI_MODE_TEXT: 'BROTLI_MODE_TEXT'
  },
  brotliCompress: jest.fn((buffer, options, callback) => {
    // 模拟压缩效果（减少30%大小）
    const compressed = Buffer.from('compressed-' + buffer.toString().substring(0, Math.floor(buffer.length * 0.7)))
    callback(null, compressed)
  }),
  gzip: jest.fn((buffer, options, callback) => {
    // 模拟压缩效果（减少25%大小）
    const compressed = Buffer.from('gzipped-' + buffer.toString().substring(0, Math.floor(buffer.length * 0.75)))
    callback(null, compressed)
  })
}))

describe('压缩中间件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('浏览器支持检测', () => {
    test('应该正确检测Brotli支持', () => {
      // Chrome 50+
      expect(supportsBrotli('gzip, deflate, br')).toBe(true)
      expect(supportsBrotli('gzip, deflate, br, identity')).toBe(true)
      expect(supportsBrotli('BR, GZIP')).toBe(true)
      
      // 不支持Brotli
      expect(supportsBrotli('gzip, deflate')).toBe(false)
      expect(supportsBrotli('')).toBe(false)
      expect(supportsBrotli(null)).toBe(false)
      expect(supportsBrotli(undefined)).toBe(false)
    })

    test('应该正确检测Gzip支持', () => {
      expect(supportsGzip('gzip, deflate')).toBe(true)
      expect(supportsGzip('gzip, deflate, br')).toBe(true)
      expect(supportsGzip('GZIP, DEFLATE')).toBe(true)
      
      // 不支持Gzip（极少见）
      expect(supportsGzip('identity')).toBe(false)
      expect(supportsGzip('')).toBe(false)
      expect(supportsGzip(null)).toBe(false)
    })
  })

  describe('内容类型检测', () => {
    test('应该正确识别可压缩的内容类型', () => {
      // HTML
      expect(isCompressible('text/html')).toBe(true)
      expect(isCompressible('text/html; charset=utf-8')).toBe(true)
      
      // CSS
      expect(isCompressible('text/css')).toBe(true)
      
      // JavaScript
      expect(isCompressible('text/javascript')).toBe(true)
      expect(isCompressible('application/javascript')).toBe(true)
      
      // JSON
      expect(isCompressible('application/json')).toBe(true)
      
      // XML
      expect(isCompressible('text/xml')).toBe(true)
      expect(isCompressible('application/xml')).toBe(true)
      
      // SVG
      expect(isCompressible('image/svg+xml')).toBe(true)
      
      // 字体
      expect(isCompressible('font/woff')).toBe(true)
      expect(isCompressible('font/woff2')).toBe(true)
    })

    test('应该正确识别不可压缩的内容类型', () => {
      // 图片
      expect(isCompressible('image/jpeg')).toBe(false)
      expect(isCompressible('image/png')).toBe(false)
      expect(isCompressible('image/gif')).toBe(false)
      expect(isCompressible('image/webp')).toBe(false)
      
      // 视频
      expect(isCompressible('video/mp4')).toBe(false)
      expect(isCompressible('video/webm')).toBe(false)
      
      // 音频
      expect(isCompressible('audio/mp3')).toBe(false)
      expect(isCompressible('audio/wav')).toBe(false)
      
      // 压缩文件
      expect(isCompressible('application/zip')).toBe(false)
      expect(isCompressible('application/gzip')).toBe(false)
      
      // 无效输入
      expect(isCompressible('')).toBe(false)
      expect(isCompressible(null)).toBe(false)
      expect(isCompressible(undefined)).toBe(false)
    })
  })

  describe('压缩决策', () => {
    test('应该根据内容大小和类型决定是否压缩', () => {
      // 大于阈值的可压缩内容
      expect(shouldCompress(2048, 'text/html', 'gzip')).toBe(true)
      expect(shouldCompress(2048, 'application/json', 'brotli')).toBe(true)
      
      // 小于阈值的内容
      expect(shouldCompress(512, 'text/html', 'gzip')).toBe(false)
      expect(shouldCompress(100, 'application/json', 'brotli')).toBe(false)
      
      // 不可压缩的内容
      expect(shouldCompress(2048, 'image/jpeg', 'gzip')).toBe(false)
      expect(shouldCompress(2048, 'video/mp4', 'brotli')).toBe(false)
      
      // 禁用压缩
      const originalConfig = { ...COMPRESSION_CONFIG.gzip }
      COMPRESSION_CONFIG.gzip.enabled = false
      expect(shouldCompress(2048, 'text/html', 'gzip')).toBe(false)
      COMPRESSION_CONFIG.gzip.enabled = originalConfig.enabled
    })
  })

  describe('压缩格式选择', () => {
    test('应该优先选择Brotli压缩', () => {
      expect(selectCompressionFormat('gzip, deflate, br')).toBe('brotli')
      expect(selectCompressionFormat('br, gzip, deflate')).toBe('brotli')
      expect(selectCompressionFormat('deflate, br, gzip')).toBe('brotli')
    })

    test('应该在不支持Brotli时选择Gzip', () => {
      expect(selectCompressionFormat('gzip, deflate')).toBe('gzip')
      expect(selectCompressionFormat('deflate, gzip')).toBe('gzip')
    })

    test('应该在都不支持时返回null', () => {
      expect(selectCompressionFormat('identity')).toBe(null)
      expect(selectCompressionFormat('')).toBe(null)
      expect(selectCompressionFormat(null)).toBe(null)
      expect(selectCompressionFormat(undefined)).toBe(null)
    })

    test('应该在压缩被禁用时返回null', () => {
      const originalBrotliConfig = { ...COMPRESSION_CONFIG.brotli }
      const originalGzipConfig = { ...COMPRESSION_CONFIG.gzip }
      
      COMPRESSION_CONFIG.brotli.enabled = false
      COMPRESSION_CONFIG.gzip.enabled = false
      
      expect(selectCompressionFormat('gzip, deflate, br')).toBe(null)
      
      // 恢复配置
      COMPRESSION_CONFIG.brotli.enabled = originalBrotliConfig.enabled
      COMPRESSION_CONFIG.gzip.enabled = originalGzipConfig.enabled
    })
  })

  describe('压缩功能', () => {
    test('应该能够执行Brotli压缩', async () => {
      const testData = Buffer.from('这是一个测试字符串，用于验证Brotli压缩功能。'.repeat(20))
      
      const result = await compressBrotli(testData)
      
      expect(Buffer.isBuffer(result)).toBe(true)
      // 对于模拟的压缩，我们检查返回的是压缩标识符
      expect(result.toString()).toContain('compressed-')
      expect(result.length).toBeGreaterThan(0)
    })

    test('应该能够执行Gzip压缩', async () => {
      const testData = Buffer.from('这是一个测试字符串，用于验证Gzip压缩功能。'.repeat(20))
      
      const result = await compressGzip(testData)
      
      expect(Buffer.isBuffer(result)).toBe(true)
      // 对于模拟的压缩，我们检查返回的是压缩标识符
      expect(result.toString()).toContain('gzipped-')
      expect(result.length).toBeGreaterThan(0)
    })

    test('应该处理压缩错误', async () => {
      // 临时抑制console.error以避免测试输出中的错误信息
      const originalError = console.error
      console.error = jest.fn()

      try {
        // Mock压缩失败
        const zlib = require('zlib')
        zlib.brotliCompress.mockImplementationOnce((buffer, options, callback) => {
          callback(new Error('压缩失败'))
        })

        await expect(compressBrotli(Buffer.from('test'))).rejects.toThrow('压缩失败')
      } finally {
        // 恢复console.error
        console.error = originalError
      }
    })
  })

  describe('配置管理', () => {
    test('应该能够获取压缩配置', () => {
      const config = getCompressionConfig()
      
      expect(config).toHaveProperty('brotli')
      expect(config).toHaveProperty('gzip')
      expect(config).toHaveProperty('compressibleTypes')
      
      expect(config.brotli).toHaveProperty('enabled')
      expect(config.brotli).toHaveProperty('quality')
      expect(config.brotli).toHaveProperty('threshold')
      
      expect(config.gzip).toHaveProperty('enabled')
      expect(config.gzip).toHaveProperty('level')
      expect(config.gzip).toHaveProperty('threshold')
    })

    test('应该能够获取压缩统计信息', () => {
      const stats = getCompressionStats()
      
      expect(stats).toHaveProperty('brotliEnabled')
      expect(stats).toHaveProperty('gzipEnabled')
      expect(stats).toHaveProperty('brotliQuality')
      expect(stats).toHaveProperty('gzipLevel')
      expect(stats).toHaveProperty('threshold')
      expect(stats).toHaveProperty('supportedTypes')
      
      expect(typeof stats.brotliEnabled).toBe('boolean')
      expect(typeof stats.gzipEnabled).toBe('boolean')
      expect(typeof stats.brotliQuality).toBe('number')
      expect(typeof stats.gzipLevel).toBe('number')
      expect(typeof stats.threshold).toBe('number')
      expect(typeof stats.supportedTypes).toBe('number')
    })
  })

  describe('性能测试', () => {
    test('压缩应该在合理时间内完成', async () => {
      const testData = Buffer.from('测试数据'.repeat(1000))
      
      const startTime = Date.now()
      await compressBrotli(testData)
      const brotliTime = Date.now() - startTime
      
      const startTime2 = Date.now()
      await compressGzip(testData)
      const gzipTime = Date.now() - startTime2
      
      // 压缩时间应该在合理范围内（小于100ms）
      expect(brotliTime).toBeLessThan(100)
      expect(gzipTime).toBeLessThan(100)
    })

    test('应该能够处理大文件压缩', async () => {
      // 创建较大的测试数据
      const largeData = Buffer.from('大文件测试数据'.repeat(50000))
      
      const result = await compressBrotli(largeData)
      
      expect(Buffer.isBuffer(result)).toBe(true)
      // 对于模拟的压缩，检查返回的压缩标识符
      expect(result.toString()).toContain('compressed-')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('边界情况', () => {
    test('应该处理空数据', async () => {
      const emptyBuffer = Buffer.alloc(0)
      
      const brotliResult = await compressBrotli(emptyBuffer)
      const gzipResult = await compressGzip(emptyBuffer)
      
      expect(Buffer.isBuffer(brotliResult)).toBe(true)
      expect(Buffer.isBuffer(gzipResult)).toBe(true)
    })

    test('应该处理非常小的数据', async () => {
      const smallBuffer = Buffer.from('a')
      
      const brotliResult = await compressBrotli(smallBuffer)
      const gzipResult = await compressGzip(smallBuffer)
      
      expect(Buffer.isBuffer(brotliResult)).toBe(true)
      expect(Buffer.isBuffer(gzipResult)).toBe(true)
    })

    test('应该处理特殊字符', async () => {
      const specialChars = Buffer.from('测试中文🎉emoji特殊字符©®™')
      
      const result = await compressBrotli(specialChars)
      
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})