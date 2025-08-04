/**
 * GitHub Actions 工作流测试
 * 测试 GitHub Actions 配置和执行逻辑
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

describe('GitHub Actions 工作流测试', () => {
  let workflowConfig;

  beforeAll(async () => {
    // 读取工作流配置文件
    const workflowPath = path.join(process.cwd(), '.github/workflows/search-engine-submission.yml');
    const workflowContent = await fs.readFile(workflowPath, 'utf8');
    workflowConfig = yaml.load(workflowContent);
  });

  describe('工作流配置验证', () => {
    test('应该有正确的工作流名称', () => {
      expect(workflowConfig.name).toBe('自动搜索引擎提交');
    });

    test('应该配置了正确的触发条件', () => {
      expect(workflowConfig.on).toHaveProperty('schedule');
      expect(workflowConfig.on).toHaveProperty('workflow_dispatch');
      
      // 验证定时触发配置（每2小时）
      expect(workflowConfig.on.schedule).toEqual([
        { cron: '0 */2 * * *' }
      ]);

      // 验证手动触发配置
      expect(workflowConfig.on.workflow_dispatch).toHaveProperty('inputs');
      expect(workflowConfig.on.workflow_dispatch.inputs).toHaveProperty('test_mode');
      expect(workflowConfig.on.workflow_dispatch.inputs).toHaveProperty('force_submit');
    });

    test('应该配置了正确的环境变量', () => {
      expect(workflowConfig.env).toHaveProperty('NODE_VERSION');
      expect(workflowConfig.env).toHaveProperty('SITEMAP_URL');
      expect(workflowConfig.env.NODE_VERSION).toBe('20');
    });
  });

  describe('任务配置验证', () => {
    test('应该有主要的提交任务', () => {
      expect(workflowConfig.jobs).toHaveProperty('submit-urls');
      
      const submitJob = workflowConfig.jobs['submit-urls'];
      expect(submitJob.name).toBe('提交 URL 到搜索引擎');
      expect(submitJob['runs-on']).toBe('ubuntu-latest');
    });

    test('应该有健康检查任务', () => {
      expect(workflowConfig.jobs).toHaveProperty('health-check');
      
      const healthJob = workflowConfig.jobs['health-check'];
      expect(healthJob.name).toBe('系统健康检查');
      expect(healthJob['runs-on']).toBe('ubuntu-latest');
    });
  });

  describe('步骤配置验证', () => {
    test('主任务应该包含所有必要步骤', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const stepNames = submitJob.steps.map(step => step.name);

      expect(stepNames).toContain('检出代码');
      expect(stepNames).toContain('设置 Node.js');
      expect(stepNames).toContain('安装依赖');
      expect(stepNames).toContain('验证环境变量');
      expect(stepNames).toContain('恢复缓存');
      expect(stepNames).toContain('运行 URL 提交');
      expect(stepNames).toContain('上传执行日志');
    });

    test('应该正确配置 Node.js 版本', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const nodeSetupStep = submitJob.steps.find(step => step.name === '设置 Node.js');
      
      expect(nodeSetupStep.uses).toBe('actions/setup-node@v4');
      expect(nodeSetupStep.with['node-version']).toBe('${{ env.NODE_VERSION }}');
      expect(nodeSetupStep.with.cache).toBe('npm');
    });

    test('应该正确配置依赖安装', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const installStep = submitJob.steps.find(step => step.name === '安装依赖');
      
      expect(installStep.run).toContain('npm install --omit=dev');
      expect(installStep.run).toContain('googleapis@144.0.0');
      expect(installStep.run).toContain('nodemailer@6.9.15');
      expect(installStep.run).toContain('xml2js@0.6.2');
    });

    test('应该正确配置环境变量验证', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const validateStep = submitJob.steps.find(step => step.name === '验证环境变量');
      
      expect(validateStep.run).toContain('GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(validateStep.run).toContain('BING_API_KEY');
    });

    test('应该正确配置缓存', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const cacheStep = submitJob.steps.find(step => step.name === '恢复缓存');
      
      expect(cacheStep.uses).toBe('actions/cache@v4');
      expect(cacheStep.with.path).toBe('.cache');
      expect(cacheStep.with.key).toContain('sitemap-cache');
    });

    test('应该正确配置主执行步骤', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const runStep = submitJob.steps.find(step => step.name === '运行 URL 提交');
      
      expect(runStep.env).toHaveProperty('GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(runStep.env).toHaveProperty('BING_API_KEY');
      expect(runStep.run).toContain('npm run submit-urls');
    });

    test('应该正确配置日志上传', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const uploadStep = submitJob.steps.find(step => step.name === '上传执行日志');
      
      expect(uploadStep.if).toBe('always()');
      expect(uploadStep.uses).toBe('actions/upload-artifact@v4');
      expect(uploadStep.with.path).toBe('.cache/');
      expect(uploadStep.with['if-no-files-found']).toBe('ignore');
    });
  });

  describe('条件执行验证', () => {
    test('健康检查任务应该有正确的执行条件', () => {
      const healthJob = workflowConfig.jobs['health-check'];
      
      expect(healthJob.if).toContain("github.event_name == 'schedule'");
      expect(healthJob.if).toContain("github.event.schedule == '0 0 * * *'");
    });

    test('通知步骤应该有正确的条件', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      
      const successStep = submitJob.steps.find(step => 
        step.name === '发送通知（成功）'
      );
      expect(successStep.if).toContain("success()");
      expect(successStep.if).toContain("github.event.inputs.test_mode != 'true'");

      const failureStep = submitJob.steps.find(step => 
        step.name === '发送通知（失败）'
      );
      expect(failureStep.if).toBe('failure()');
    });
  });

  describe('安全配置验证', () => {
    test('应该正确引用 GitHub Secrets', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const runStep = submitJob.steps.find(step => step.name === '运行 URL 提交');
      
      expect(runStep.env.GOOGLE_SERVICE_ACCOUNT_KEY).toBe('${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}');
      expect(runStep.env.BING_API_KEY).toBe('${{ secrets.BING_API_KEY }}');
      expect(runStep.env.NOTIFICATION_EMAIL).toBe('${{ secrets.NOTIFICATION_EMAIL }}');
      expect(runStep.env.SMTP_CONFIG).toBe('${{ secrets.SMTP_CONFIG }}');
    });

    test('不应该在配置中硬编码敏感信息', () => {
      const workflowString = JSON.stringify(workflowConfig);
      
      // 检查不应该包含的敏感信息模式
      expect(workflowString).not.toMatch(/[a-zA-Z0-9]{32,}/); // 长字符串（可能是密钥）
      expect(workflowString).not.toContain('@gmail.com');
      expect(workflowString).not.toContain('password');
      expect(workflowString).not.toContain('private_key');
    });
  });

  describe('输入参数验证', () => {
    test('应该正确配置测试模式参数', () => {
      const testModeInput = workflowConfig.on.workflow_dispatch.inputs.test_mode;
      
      expect(testModeInput.description).toBe('测试模式（不实际提交）');
      expect(testModeInput.required).toBe(false);
      expect(testModeInput.default).toBe('false');
      expect(testModeInput.type).toBe('choice');
      expect(testModeInput.options).toEqual(['true', 'false']);
    });

    test('应该正确配置强制提交参数', () => {
      const forceSubmitInput = workflowConfig.on.workflow_dispatch.inputs.force_submit;
      
      expect(forceSubmitInput.description).toBe('强制提交（忽略缓存）');
      expect(forceSubmitInput.required).toBe(false);
      expect(forceSubmitInput.default).toBe('false');
      expect(forceSubmitInput.type).toBe('choice');
      expect(forceSubmitInput.options).toEqual(['true', 'false']);
    });
  });

  describe('工作流逻辑验证', () => {
    test('应该正确处理测试模式逻辑', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const runStep = submitJob.steps.find(step => step.name === '运行 URL 提交');
      
      expect(runStep.run).toContain("if [ \"${{ github.event.inputs.test_mode }}\" = \"true\" ]; then");
      expect(runStep.run).toContain("npm run submit-urls:test");
      expect(runStep.run).toContain("npm run submit-urls");
    });

    test('应该正确处理强制提交逻辑', () => {
      const submitJob = workflowConfig.jobs['submit-urls'];
      const runStep = submitJob.steps.find(step => step.name === '运行 URL 提交');
      
      expect(runStep.run).toContain('FORCE_SUBMIT');
      expect(runStep.run).toContain('rm -rf .cache');
    });
  });
});