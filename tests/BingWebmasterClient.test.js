const BingWebmasterClient = require('../scripts/lib/BingWebmasterClient');

// Mock axios
jest.mock('axios');

describe('BingWebmasterClient - 基础功能测试', () => {
  let bingClient;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const mockConfig = {
      bing: {
        webmasterApiUrl: 'https://api.indexnow.org/indexnow',
        quotaLimit: 10000
      },
      sitemap: {
        url: 'https://example.com/sitemap.xml'
      }
    };

    bingClient = new BingWebmasterClient(mockConfig, mockLogger);
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    test('应该正确初始化配置', () => {
      expect(bingClient.config).toBeDefined();
      expect(bingClient.logger).toBe(mockLogger);
      expect(bingClient.quotaLimit).toBe(10000);
      expect(bingClient.quotaUsed).toBe(0);
      expect(bingClient.useIndexNow).toBe(true);
    });
  });

  describe('URL 处理', () => {
    test('应该正确提取主机名', () => {
      const testCases = [
        { url: 'https://example.com/page', expected: 'example.com' },
        { url: 'http://www.example.com/page', expected: 'www.example.com' },
        { url: 'https://subdomain.example.com/page', expected: 'subdomain.example.com' }
      ];

      testCases.forEach(({ url, expected }) => {
        const hostname = bingClient.extractHostname(url);
        expect(hostname).toBe(expected);
      });
    });

    test('应该正确提取网站 URL', () => {
      const testCases = [
        { url: 'https://example.com/sitemap.xml', expected: 'https://example.com' },
        { url: 'http://www.example.com/sitemap.xml', expected: 'http://www.example.com' }
      ];

      testCases.forEach(({ url, expected }) => {
        const siteUrl = bingClient.extractSiteUrl(url);
        expect(siteUrl).toBe(expected);
      });
    });

    test('应该处理无效 URL', () => {
      const hostname = bingClient.extractHostname('not-a-valid-url');
      const siteUrl = bingClient.extractSiteUrl('not-a-valid-url');
      expect(hostname).toBeNull();
      expect(siteUrl).toBeNull();
    });
  });

  describe('配额管理', () => {
    test('应该正确跟踪配额使用情况', () => {
      // 模拟配额使用
      bingClient.quotaUsed = 100;

      const quotaInfo = bingClient.getQuotaInfo();

      expect(quotaInfo).toEqual({
        used: 100,
        limit: 10000,
        remaining: 9900,
        percentage: 1
      });
    });

    test('应该正确计算配额百分比', () => {
      bingClient.quotaUsed = 5000;
      const quotaInfo = bingClient.getQuotaInfo();
      expect(quotaInfo.percentage).toBe(50);
    });
  });

  describe('状态信息', () => {
    test('应该返回 API 状态', () => {
      const status = bingClient.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('siteUrl');
      expect(status).toHaveProperty('quota');
      expect(typeof status.initialized).toBe('boolean');
    });
  });

  describe('工具方法', () => {
    test('应该正确分割数组', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = bingClient.chunkArray(array, 3);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    test('应该处理空数组', () => {
      const chunks = bingClient.chunkArray([], 3);
      expect(chunks).toEqual([]);
    });
  });

  describe('配额重置', () => {
    test('应该能够重置配额', () => {
      bingClient.quotaUsed = 100;
      bingClient.resetQuota();
      
      expect(bingClient.quotaUsed).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('🔄 Bing API 配额已重置');
    });
  });
});