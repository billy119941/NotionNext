const URLNormalizer = require('../scripts/lib/URLNormalizer');

describe('URLNormalizer - 基础功能测试', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });

  describe('静态方法测试', () => {
    test('normalizeUrl - 应该移除 .html 后缀', () => {
      const result = URLNormalizer.normalizeUrl('https://example.com/page.html');
      expect(result).toBe('https://example.com/page');
    });

    test('isValidUrl - 应该验证有效的 HTTPS URL', () => {
      const result = URLNormalizer.isValidUrl('https://example.com/page');
      expect(result).toBe(true);
    });

    test('isValidUrl - 应该拒绝无效的 URL', () => {
      const result = URLNormalizer.isValidUrl('not-a-url');
      expect(result).toBe(false);
    });

    test('removeHtmlSuffix - 应该移除 .html 后缀', () => {
      const result = URLNormalizer.removeHtmlSuffix('https://example.com/page.html');
      expect(result).toBe('https://example.com/page');
    });
  });

  describe('实例方法测试', () => {
    let urlNormalizer;

    beforeEach(() => {
      const mockConfig = {
        sitemap: {
          url: 'https://example.com/sitemap.xml'
        }
      };
      urlNormalizer = new URLNormalizer(mockConfig, mockLogger);
    });

    test('normalizeUrls - 应该处理 URL 数组', () => {
      const urls = [
        'https://example.com/page1.html',
        'https://example.com/page2.html'
      ];

      const result = urlNormalizer.normalizeUrls(urls);

      expect(result).toEqual([
        'https://example.com/page1',
        'https://example.com/page2'
      ]);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('categorizeUrls - 应该返回分类对象', () => {
      const urls = [
        'https://example.com/blog/article-1',
        'https://example.com/about'
      ];

      const result = urlNormalizer.categorizeUrls(urls);

      expect(result).toHaveProperty('articles');
      expect(result).toHaveProperty('others');
      expect(Array.isArray(result.articles)).toBe(true);
      expect(Array.isArray(result.others)).toBe(true);
    });
  });
});