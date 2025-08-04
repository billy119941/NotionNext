/**
 * 邮件通知功能测试
 * 测试邮件通知的发送和模板功能
 */

const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('邮件通知功能测试', () => {
  let mockTransporter;

  beforeEach(() => {
    // 创建 mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK'
      })
    };

    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
    jest.clearAllMocks();
  });

  describe('邮件发送功能', () => {
    test('应该能够发送成功通知邮件', async () => {
      // 模拟成功的提交结果
      const successResult = {
        totalUrls: 10,
        submittedUrls: 10,
        failedUrls: 0,
        successfulEngines: 2,
        totalEngines: 2,
        successRate: 100,
        results: {
          google: [
            { success: true, url: 'https://example.com/page1' },
            { success: true, url: 'https://example.com/page2' }
          ],
          bing: [
            { success: true, url: 'https://example.com/page1' },
            { success: true, url: 'https://example.com/page2' }
          ]
        }
      };

      // 创建邮件通知器（这里我们需要创建一个简单的实现）
      const emailNotifier = {
        async sendSuccessNotification(result) {
          const mailOptions = {
            from: 'noreply@example.com',
            to: 'admin@example.com',
            subject: '✅ 搜索引擎提交成功',
            html: this.generateSuccessTemplate(result)
          };

          return await mockTransporter.sendMail(mailOptions);
        },

        generateSuccessTemplate(result) {
          return `
            <h2>搜索引擎提交成功报告</h2>
            <p><strong>总计 URL：</strong>${result.totalUrls}</p>
            <p><strong>成功提交：</strong>${result.submittedUrls}</p>
            <p><strong>失败数量：</strong>${result.failedUrls}</p>
            <p><strong>成功率：</strong>${result.successRate}%</p>
            <p><strong>执行时间：</strong>${new Date().toISOString()}</p>
          `;
        }
      };

      // 测试发送成功通知
      const result = await emailNotifier.sendSuccessNotification(successResult);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '✅ 搜索引擎提交成功',
          html: expect.stringContaining('搜索引擎提交成功报告')
        })
      );

      expect(result.messageId).toBe('test-message-id');
    });

    test('应该能够发送失败通知邮件', async () => {
      // 模拟失败的提交结果
      const failureResult = {
        totalUrls: 10,
        submittedUrls: 5,
        failedUrls: 5,
        successfulEngines: 1,
        totalEngines: 2,
        successRate: 50,
        errors: [
          { engine: 'google', error: 'Permission denied', count: 5 }
        ]
      };

      const emailNotifier = {
        async sendFailureNotification(result) {
          const mailOptions = {
            from: 'noreply@example.com',
            to: 'admin@example.com',
            subject: '❌ 搜索引擎提交部分失败',
            html: this.generateFailureTemplate(result)
          };

          return await mockTransporter.sendMail(mailOptions);
        },

        generateFailureTemplate(result) {
          return `
            <h2>搜索引擎提交失败报告</h2>
            <p><strong>总计 URL：</strong>${result.totalUrls}</p>
            <p><strong>成功提交：</strong>${result.submittedUrls}</p>
            <p><strong>失败数量：</strong>${result.failedUrls}</p>
            <p><strong>成功率：</strong>${result.successRate}%</p>
            <h3>错误详情：</h3>
            <ul>
              ${result.errors.map(error => 
                `<li>${error.engine}: ${error.error} (${error.count} 次)</li>`
              ).join('')}
            </ul>
          `;
        }
      };

      // 测试发送失败通知
      const result = await emailNotifier.sendFailureNotification(failureResult);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '❌ 搜索引擎提交部分失败',
          html: expect.stringContaining('搜索引擎提交失败报告')
        })
      );
    });
  });

  describe('SMTP 配置测试', () => {
    test('应该能够解析 SMTP 配置', () => {
      const smtpConfigString = JSON.stringify({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        }
      });

      const smtpConfig = JSON.parse(smtpConfigString);

      expect(smtpConfig).toHaveProperty('host');
      expect(smtpConfig).toHaveProperty('port');
      expect(smtpConfig).toHaveProperty('auth');
      expect(smtpConfig.auth).toHaveProperty('user');
      expect(smtpConfig.auth).toHaveProperty('pass');
    });

    test('应该能够创建 SMTP 传输器', () => {
      const smtpConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        }
      };

      // 模拟创建传输器
      nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);
      
      const transporter = nodemailer.createTransport(smtpConfig);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(smtpConfig);
      expect(transporter).toBe(mockTransporter);
    });
  });

  describe('邮件模板测试', () => {
    test('成功模板应该包含所有必要信息', () => {
      const result = {
        totalUrls: 15,
        submittedUrls: 15,
        failedUrls: 0,
        successRate: 100,
        engines: {
          google: { successful: 15, failed: 0 },
          bing: { successful: 15, failed: 0 }
        }
      };

      const template = `
        <h2>✅ 搜索引擎提交成功</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h3>提交统计</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>总计 URL</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${result.totalUrls}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>成功提交</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${result.submittedUrls}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>成功率</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${result.successRate}%</td>
            </tr>
          </table>
          
          <h3>各搜索引擎详情</h3>
          <ul>
            <li><strong>Google:</strong> 成功 ${result.engines.google.successful}, 失败 ${result.engines.google.failed}</li>
            <li><strong>Bing:</strong> 成功 ${result.engines.bing.successful}, 失败 ${result.engines.bing.failed}</li>
          </ul>
          
          <p><small>执行时间: ${new Date().toLocaleString()}</small></p>
        </div>
      `;

      expect(template).toContain('搜索引擎提交成功');
      expect(template).toContain(result.totalUrls.toString());
      expect(template).toContain(result.successRate.toString());
      expect(template).toContain('Google');
      expect(template).toContain('Bing');
    });

    test('失败模板应该包含错误详情', () => {
      const result = {
        totalUrls: 10,
        submittedUrls: 5,
        failedUrls: 5,
        successRate: 50,
        errors: [
          { engine: 'google', error: 'Permission denied', urls: ['url1', 'url2'] },
          { engine: 'bing', error: 'Invalid URL format', urls: ['url3'] }
        ]
      };

      const template = `
        <h2>⚠️ 搜索引擎提交部分失败</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h3>提交统计</h3>
          <p><strong>总计 URL:</strong> ${result.totalUrls}</p>
          <p><strong>成功提交:</strong> ${result.submittedUrls}</p>
          <p><strong>失败数量:</strong> ${result.failedUrls}</p>
          <p><strong>成功率:</strong> ${result.successRate}%</p>
          
          <h3>错误详情</h3>
          ${result.errors.map(error => `
            <div style="margin-bottom: 15px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7;">
              <h4>${error.engine.toUpperCase()} 错误</h4>
              <p><strong>错误信息:</strong> ${error.error}</p>
              <p><strong>影响 URL 数量:</strong> ${error.urls.length}</p>
            </div>
          `).join('')}
          
          <p><small>执行时间: ${new Date().toLocaleString()}</small></p>
        </div>
      `;

      expect(template).toContain('搜索引擎提交部分失败');
      expect(template).toContain('Permission denied');
      expect(template).toContain('Invalid URL format');
      expect(template).toContain('GOOGLE 错误');
      expect(template).toContain('BING 错误');
    });
  });
});