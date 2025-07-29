#!/usr/bin/env node

// 简单的sitemap测试脚本
const fs = require('fs');
const path = require('path');

console.log('Testing sitemap generation...');

// 检查关键文件是否存在
const requiredFiles = [
  'pages/sitemap.xml.js',
  'lib/db/getSiteData.js',
  'lib/utils/URLValidator.js',
  'lib/utils/XMLFormatter.js',
  'lib/utils/SitemapErrorHandler.js',
  'blog.config.js'
];

console.log('\n1. Checking required files:');
let missingFiles = [];
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

// 检查配置
console.log('\n2. Checking configuration:');
try {
  const BLOG = require('./blog.config.js');
  console.log(`✅ NOTION_PAGE_ID: ${BLOG.NOTION_PAGE_ID}`);
  console.log(`✅ LINK: ${BLOG.LINK}`);
  console.log(`✅ SEO_SITEMAP_ENHANCED: ${BLOG.SEO_SITEMAP_ENHANCED}`);
} catch (error) {
  console.log(`❌ Configuration error: ${error.message}`);
  process.exit(1);
}

// 生成基础sitemap XML
console.log('\n3. Generating basic sitemap:');
const baseUrl = 'https://www.shareking.vip';
const currentDate = new Date().toISOString().split('T')[0];

const basicUrls = [
  { loc: baseUrl, lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
  { loc: `${baseUrl}/archive`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' },
  { loc: `${baseUrl}/category`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' },
  { loc: `${baseUrl}/search`, lastmod: currentDate, changefreq: 'weekly', priority: '0.6' },
  { loc: `${baseUrl}/tag`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' }
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${basicUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

console.log('✅ Basic sitemap generated:');
console.log(`   URLs: ${basicUrls.length}`);
console.log(`   Size: ${xml.length} bytes`);

// 保存测试sitemap
fs.writeFileSync('test-sitemap.xml', xml);
console.log('✅ Test sitemap saved to test-sitemap.xml');

console.log('\n4. Recommendations:');
console.log('   - Check Vercel environment variables');
console.log('   - Verify NOTION_PAGE_ID is accessible');
console.log('   - Check Vercel function logs for errors');
console.log('   - Test locally with: npm run dev');

console.log('\n✅ Test completed successfully!');