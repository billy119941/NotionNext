#!/usr/bin/env node

/**
 * 定期提交任务调度器
 * 可以配置为cron job或GitHub Actions
 */

const cron = require('node-cron')
const { submitSitemap } = require('./submit-to-google')

console.log('🕐 启动定期提交调度器...')

// 每天凌晨2点提交sitemap
cron.schedule('0 2 * * *', async () => {
  console.log('\n⏰ 开始定期提交任务...')
  try {
    await submitSitemap()
    console.log('✅ 定期提交完成')
  } catch (error) {
    console.error('❌ 定期提交失败:', error)
  }
}, {
  timezone: "Asia/Shanghai"
})

// 每周一上午9点提交重要页面
cron.schedule('0 9 * * 1', async () => {
  console.log('\n📅 开始周度重点提交...')
  // 这里可以添加重点页面的特殊提交逻辑
}, {
  timezone: "Asia/Shanghai"
})

console.log('✅ 调度器已启动')
console.log('   - 每日 02:00 自动提交sitemap')
console.log('   - 每周一 09:00 提交重点页面')
console.log('   - 按 Ctrl+C 停止调度器')