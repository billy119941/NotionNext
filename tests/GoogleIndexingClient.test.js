const GoogleIndexingClient = require('../scripts/lib/GoogleIndexingClient');

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({
        gaxios: {
          defaults: {}
        }
      }))
    },
    indexing: jest.fn().mockReturnValue({
      urlNotifications: {
        publish: jest.fn()
      }
    })
  }
}));

describe('GoogleIndexingClient - 基础功能测试', () => {
  let googleClient;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const mockConfig = {
      google: {
        indexingApiUrl: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
        quotaLimit: 200,
        scopes: ['https://www.googleapis.com/auth/indexing']
      }
    };

    googleClient = new GoogleIndexingClient(mockConfig, mockLogger);
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    test('应该正确初始化配置', () => {
      expect(googleClient.config).toBeDefined();
      expect(googleClient.logger).toBe(mockLogger);
      expect(googleClient.quotaLimit).toBe(200);
      expect(googleClient.quotaUsed).toBe(0);
    });
  });

  describe('配额管理', () => {
    test('应该正确跟踪配额使用情况', () => {
      // 模拟配额使用
      googleClient.quotaUsed = 50;

      const quotaInfo = googleClient.getQuotaInfo();

      expect(quotaInfo).toEqual({
        used: 50,
        limit: 200,
        remaining: 150,
        percentage: 25
      });
    });

    test('应该正确计算配额百分比', () => {
      googleClient.quotaUsed = 100;
      const quotaInfo = googleClient.getQuotaInfo();
      expect(quotaInfo.percentage).toBe(50);
    });
  });

  describe('状态信息', () => {
    test('应该返回 API 状态', () => {
      const status = googleClient.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('quota');
      expect(typeof status.initialized).toBe('boolean');
    });
  });

  describe('配额重置', () => {
    test('应该能够重置配额', () => {
      googleClient.quotaUsed = 50;
      googleClient.resetQuota();
      
      expect(googleClient.quotaUsed).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('🔄 Google API 配额已重置');
    });
  });
});