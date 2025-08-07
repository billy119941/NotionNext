/**
 * 压缩测试API
 * 用于测试Brotli和Gzip压缩效果
 */

import { compressionMiddleware, getCompressionStats, selectCompressionFormat } from '../../lib/middleware/compression'

// 测试数据
const testData = {
  html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>压缩测试页面</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .highlight { color: #007acc; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Brotli和Gzip压缩测试</h1>
        <p>这是一个用于测试压缩效果的HTML页面。内容包含重复的文本和结构，以便更好地展示压缩效果。</p>
        <div class="stats">
            <h2>压缩统计信息</h2>
            <p>原始大小: <span class="highlight">{{originalSize}}</span></p>
            <p>压缩大小: <span class="highlight">{{compressedSize}}</span></p>
            <p>压缩率: <span class="highlight">{{compressionRatio}}%</span></p>
            <p>压缩格式: <span class="highlight">{{format}}</span></p>
        </div>
        <p>重复内容开始：</p>
        ${Array(50).fill('<p>这是重复的段落内容，用于测试压缩效果。压缩算法能够很好地处理重复内容。</p>').join('\n        ')}
        <p>重复内容结束。</p>
    </div>
</body>
</html>`,
  
  json: {
    message: "这是一个JSON响应测试",
    data: Array(100).fill({
      id: Math.random(),
      name: "测试数据项",
      description: "这是用于测试压缩效果的重复数据",
      timestamp: new Date().toISOString(),
      metadata: {
        type: "test",
        category: "compression",
        tags: ["brotli", "gzip", "performance", "optimization"]
      }
    }),
    stats: {
      totalItems: 100,
      generatedAt: new Date().toISOString(),
      compressionTest: true
    }
  },
  
  css: `
/* 压缩测试CSS */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
}

.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px 0;
    text-align: center;
    margin-bottom: 40px;
}

.content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-bottom: 40px;
}

.card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 24px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 重复样式用于测试压缩 */
${Array(20).fill(`
.test-class-${Math.floor(Math.random() * 1000)} {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    margin: 8px 0;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    background-color: #f8f9fa;
}
`).join('\n')}
`,
  
  js: `
// 压缩测试JavaScript
(function() {
    'use strict';
    
    // 测试函数集合
    const compressionTest = {
        init: function() {
            console.log('压缩测试初始化');
            this.setupEventListeners();
            this.generateTestData();
            this.runPerformanceTests();
        },
        
        setupEventListeners: function() {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM加载完成');
                this.updateUI();
            });
            
            window.addEventListener('load', () => {
                console.log('页面加载完成');
                this.measurePerformance();
            });
        },
        
        generateTestData: function() {
            const testData = [];
            for (let i = 0; i < 1000; i++) {
                testData.push({
                    id: i,
                    name: \`测试数据项 \${i}\`,
                    description: '这是用于测试压缩效果的重复数据描述',
                    timestamp: new Date().toISOString(),
                    randomValue: Math.random(),
                    category: ['A', 'B', 'C'][i % 3],
                    tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
                });
            }
            return testData;
        },
        
        runPerformanceTests: function() {
            const startTime = performance.now();
            
            // 模拟一些计算密集型操作
            for (let i = 0; i < 10000; i++) {
                const result = Math.sqrt(i) * Math.random();
                if (i % 1000 === 0) {
                    console.log(\`计算进度: \${i/100}%\`);
                }
            }
            
            const endTime = performance.now();
            console.log(\`性能测试完成，耗时: \${endTime - startTime}ms\`);
        },
        
        updateUI: function() {
            const elements = document.querySelectorAll('.test-element');
            elements.forEach((element, index) => {
                element.textContent = \`更新内容 \${index}\`;
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        },
        
        measurePerformance: function() {
            if (window.performance && window.performance.getEntriesByType) {
                const navigationEntries = performance.getEntriesByType('navigation');
                const resourceEntries = performance.getEntriesByType('resource');
                
                console.log('导航性能:', navigationEntries);
                console.log('资源加载性能:', resourceEntries);
            }
        }
    };
    
    // 重复代码块用于测试压缩
    ${Array(10).fill(`
    function testFunction${Math.floor(Math.random() * 1000)}() {
        const data = {
            message: '这是重复的测试函数',
            timestamp: new Date().toISOString(),
            randomId: Math.random().toString(36).substring(2, 15)
        };
        
        return data;
    }
    `).join('\n')}
    
    // 初始化
    compressionTest.init();
})();
`
}

export default function handler(req, res) {
  const { format = 'html', test = 'compression' } = req.query
  
  // 应用压缩中间件
  compressionMiddleware(req, res, () => {
    try {
      const acceptEncoding = req.headers['accept-encoding'] || ''
      const selectedFormat = selectCompressionFormat(acceptEncoding)
      const compressionStats = getCompressionStats()
      
      // 根据请求格式返回不同类型的测试数据
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json')
          return res.json({
            ...testData.json,
            compressionInfo: {
              acceptEncoding,
              selectedFormat,
              stats: compressionStats,
              timestamp: new Date().toISOString()
            }
          })
          
        case 'css':
          res.setHeader('Content-Type', 'text/css')
          return res.send(testData.css)
          
        case 'js':
          res.setHeader('Content-Type', 'application/javascript')
          return res.send(testData.js)
          
        case 'stats':
          res.setHeader('Content-Type', 'application/json')
          return res.json({
            compressionStats,
            browserSupport: {
              brotli: acceptEncoding.includes('br'),
              gzip: acceptEncoding.includes('gzip'),
              deflate: acceptEncoding.includes('deflate')
            },
            selectedFormat,
            acceptEncoding,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date().toISOString()
          })
          
        default: // html
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          return res.send(testData.html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const placeholders = {
              originalSize: '计算中...',
              compressedSize: '计算中...',
              compressionRatio: '计算中...',
              format: selectedFormat || '无压缩'
            }
            return placeholders[key] || match
          }))
      }
    } catch (error) {
      console.error('[Compression API] 错误:', error)
      res.status(500).json({
        error: '压缩测试失败',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
}