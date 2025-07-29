/**
 * Dynamic robots.txt generator for NotionNext
 * 
 * This generates robots.txt dynamically to avoid Cloudflare override issues
 * 
 * @author NotionNext Team
 * @version 1.0.1
 * @since 2024-01-29
 */

import BLOG from '@/blog.config'

export const getServerSideProps = async ctx => {
  const baseUrl = BLOG.LINK || 'https://www.shareking.vip'
  const author = 'ShareKing' // 使用英文避免编码问题
  const currentDate = new Date().toISOString().split('T')[0]
  
  // Extract domain without protocol for Host declaration
  const domain = baseUrl.replace('https://', '').replace('http://', '')
  
  let content = `# Robots.txt for ${baseUrl}
# Generated on ${currentDate}
# Author: ${author}

# Allow all web crawlers to access all content
User-agent: *
Allow: /

# Disallow access to admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /_next/
Disallow: /static/

# Disallow access to search result pages to prevent duplicate content
Disallow: /search?*
Disallow: /search/*

# Allow access to important directories
Allow: /images/
Allow: /css/
Allow: /js/
Allow: /fonts/

# Specific rules for major search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 1

User-agent: Baiduspider
Allow: /
Crawl-delay: 2

User-agent: YandexBot
Allow: /
Crawl-delay: 1

# Block problematic and AI training bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MajesticSEO
Disallow: /

# Block AI training bots
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: meta-externalagent
Disallow: /

# Host declaration (domain only, no protocol)
Host: ${domain}

# Sitemap locations
Sitemap: ${baseUrl}/sitemap.xml`

  // 只添加实际存在的 sitemap 文件
  // 目前只有主 sitemap.xml 文件存在，其他增强版 sitemap 暂未实现

  content += `

# Additional information
# For questions about this robots.txt, contact: longxiao0807@gmail.com
`

  try {
    // Set response headers
    ctx.res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    ctx.res.setHeader('Cache-Control', 'public, max-age=86400') // 24 hours cache
    
    ctx.res.write(content)
    ctx.res.end()

    console.log('[Robots] Dynamic robots.txt generated successfully')
    return { props: {} }

  } catch (error) {
    console.error('[Robots] Error generating robots.txt:', error)
    
    // Fallback content
    const fallbackContent = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

Host: ${domain}
`
    
    ctx.res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    ctx.res.setHeader('Cache-Control', 'public, max-age=300')
    
    ctx.res.write(fallbackContent)
    ctx.res.end()

    return { props: {} }
  }
}

export default () => {}