const SitemapDetector = require('../scripts/lib/SitemapDetector');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock utils
jest.mock('../scripts/lib/utils', () => ({
  readJsonFile: jest.fn(),
  writeJsonFile: jest.fn()
}));

describe('SitemapDetector - 基础功能测试', () => {
  let sitemapDetector;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const mockConfig = {
      sitemap: {
        url: 'https://example.com/sitemap.xml',
        cacheFile: '.cache/sitemap-cache.json'
      }
    };

    sitemapDetector = new SitemapDetector(mockConfig, mockLogger);
    jest.clearAllMocks();
  });

  describe('XML 解析', () => {
    test('extractUrls - 应该从 XML 数据中提取 URL', () => {
      const mockParsedData = {
        urlset: {
          url: [
            { loc: 'https://example.com/page1', lastmod: '2025-01-01' },
            { loc: 'https://example.com/page2', lastmod: '2025-01-02' }
          ]
        }
      };

      const result = sitemapDetector.extractUrls(mockParsedData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        loc: 'https://example.com/page1',
        lastmod: '2025-01-01',
        changefreq: null,
        priority: null
      });
    });

    test('extractUrls - 应该处理单个 URL 的情况', () => {
      const mockParsedData = {
        urlset: {
          url: { loc: 'https://example.com/page1', lastmod: '2025-01-01' }
        }
      };

      const result = sitemapDetector.extractUrls(mockParsedData);

      expect(result).toHaveLength(1);
      expect(result[0].loc).toBe('https://example.com/page1');
    });
  });

  describe('URL 比较', () => {
    test('compareAndExtractNew - 应该检测新增的 URL', () => {
      const currentSitemap = {
        urls: [
          { loc: 'https://example.com/page1' },
          { loc: 'https://example.com/page2' }
        ],
        hash: 'new-hash'
      };

      const cachedSitemap = {
        urls: [
          { loc: 'https://example.com/page1' }
        ],
        hash: 'old-hash'
      };

      const result = sitemapDetector.compareAndExtractNew(currentSitemap, cachedSitemap);

      expect(result).toEqual(['https://example.com/page2']);
    });

    test('compareAndExtractNew - 应该处理首次运行的情况', () => {
      const currentSitemap = {
        urls: [
          { loc: 'https://example.com/page1', lastmod: '2025-01-01' },
          { loc: 'https://example.com/page2', lastmod: '2025-01-02' }
        ],
        hash: 'new-hash'
      };

      const result = sitemapDetector.compareAndExtractNew(currentSitemap, null);

      expect(result).toHaveLength(2); // 首次运行限制为最多 10 个
      expect(mockLogger.info).toHaveBeenCalledWith('📝 首次运行，将提交最近的 URL');
    });

    test('compareAndExtractNew - 相同哈希应该返回空数组', () => {
      const currentSitemap = {
        urls: [{ loc: 'https://example.com/page1' }],
        hash: 'same-hash'
      };

      const cachedSitemap = {
        urls: [{ loc: 'https://example.com/page1' }],
        hash: 'same-hash'
      };

      const result = sitemapDetector.compareAndExtractNew(currentSitemap, cachedSitemap);

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('🔄 sitemap 哈希相同，没有变化');
    });
  });

  describe('工具方法', () => {
    test('generateHash - 应该生成 MD5 哈希', () => {
      const content = 'test content';
      const result = sitemapDetector.generateHash(content);
      
      expect(typeof result).toBe('string');
      expect(result).toHaveLength(32); // MD5 哈希长度
    });

    test('isValidUrl - 应该验证 URL 格式', () => {
      expect(sitemapDetector.isValidUrl('https://example.com/page')).toBe(true);
      expect(sitemapDetector.isValidUrl('http://example.com/page')).toBe(true);
      expect(sitemapDetector.isValidUrl('ftp://example.com/page')).toBe(false);
      expect(sitemapDetector.isValidUrl('invalid-url')).toBe(false);
    });
  });
});