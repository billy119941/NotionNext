const ErrorHandler = require('../scripts/lib/ErrorHandler');

// Mock utils
jest.mock('../scripts/lib/utils', () => ({
  sleep: jest.fn().mockResolvedValue()
}));

describe('ErrorHandler - 基础功能测试', () => {
  let errorHandler;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    const mockConfig = {
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };

    errorHandler = new ErrorHandler(mockConfig, mockLogger);
  });

  describe('错误分类', () => {
    test('classifyError - 应该分类网络错误', () => {
      const networkError = new Error('Network timeout');
      const result = errorHandler.classifyError(networkError);
      expect(result).toBe('NETWORK_ERROR');
    });

    test('classifyError - 应该分类认证错误', () => {
      const authError = new Error('Unauthorized access');
      const result = errorHandler.classifyError(authError);
      expect(result).toBe('AUTH_ERROR');
    });

    test('classifyError - 应该分类配额错误', () => {
      const quotaError = new Error('Rate limit exceeded');
      const result = errorHandler.classifyError(quotaError);
      expect(result).toBe('QUOTA_ERROR');
    });
  });

  describe('重试判断', () => {
    test('isRetryableError - 网络错误应该可重试', () => {
      const networkError = new Error('Network timeout');
      const result = errorHandler.isRetryableError(networkError);
      expect(result).toBe(true);
    });

    test('isRetryableError - 认证错误不应该重试', () => {
      const authError = new Error('Unauthorized access');
      const result = errorHandler.isRetryableError(authError);
      expect(result).toBe(false);
    });
  });

  describe('批量结果处理', () => {
    test('processBatchResults - 应该正确处理成功和失败的结果', () => {
      const results = [
        { status: 'fulfilled', value: 'success1' },
        { status: 'rejected', reason: new Error('failure1') },
        { status: 'fulfilled', value: 'success2' }
      ];
      const originalItems = ['item1', 'item2', 'item3'];

      const processed = errorHandler.processBatchResults(results, originalItems);

      expect(processed.successful).toHaveLength(2);
      expect(processed.failed).toHaveLength(1);
      expect(processed.summary.total).toBe(3);
      expect(processed.summary.successful).toBe(2);
      expect(processed.summary.failed).toBe(1);
      expect(processed.summary.successRate).toBe(67);
    });
  });
});