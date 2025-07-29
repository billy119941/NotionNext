/**
 * Simplified Sitemap Generator for NotionNext
 * 
 * This is a simplified version that focuses on reliability over advanced features.
 * It generates a basic sitemap with fallback mechanisms for Vercel deployment.
 * 
 * @author NotionNext Team
 * @version 2.1.0 (Simplified)
 * @since 2024-01-28
 */

import BLOG from '@/blog.config'

export const getServerSideProps = async ctx => {
  const baseUrl = 'https://www.shareking.vip'
  
  try {
    console.log('[Sitemap] Starting sitemap generation...')
    
    // 尝试获取数据
    let allPages = []
    try {
      const { getGlobalData } = await import('@/lib/db/getSiteData')
      const data = await getGlobalData({
        pageId: BLOG.NOTION_PAGE_ID,
        from: 'sitemap.xml'
      })
      allPages = data?.allPages || []
      console.log(`[Sitemap] Fetched ${allPages.length} pages from Notion`)
    } catch (dataError) {
      console.warn('[Sitemap] Failed to fetch Notion data:', dataError.message)
      // 继续使用空数组，生成基础sitemap
    }

    // 生成sitemap XML
    const xml = generateSitemapXML(baseUrl, allPages)
    
    // 设置响应头
    ctx.res.setHeader('Content-Type', 'application/xml')
    ctx.res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200')
    
    ctx.res.write(xml)
    ctx.res.end()

    console.log('[Sitemap] Sitemap generated successfully')
    return { props: {} }

  } catch (error) {
    console.error('[Sitemap] Critical error:', error)
    
    // 生成最基础的sitemap
    const fallbackXml = generateFallbackSitemap(baseUrl)
    
    ctx.res.setHeader('Content-Type', 'application/xml')
    ctx.res.setHeader('Cache-Control', 'public, max-age=300')
    
    ctx.res.write(fallbackXml)
    ctx.res.end()

    return { props: {} }
  }
}



function generateSitemapXML(baseUrl, allPages) {
  const currentDate = new Date().toISOString().split('T')[0]
  
  // 基础页面
  const urls = [
    { loc: baseUrl, lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/archive`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' },
    { loc: `${baseUrl}/category`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' },
    { loc: `${baseUrl}/search`, lastmod: currentDate, changefreq: 'weekly', priority: '0.6' },
    { loc: `${baseUrl}/tag`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' }
  ]

  // 添加RSS链接
  if (allPages && allPages.length > 0) {
    urls.push({
      loc: `${baseUrl}/rss/feed.xml`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.7'
    })
  }

  // 添加文章页面
  if (allPages && Array.isArray(allPages)) {
    allPages
      .filter(p => {
        return p && 
               p.status === 'Published' &&
               p.slug &&
               p.publishDay &&
               typeof p.slug === 'string' &&
               p.slug.length > 0
      })
      .forEach(post => {
        try {
          const postUrl = BLOG.PSEUDO_STATIC 
            ? `${baseUrl}/${post.slug}.html`
            : `${baseUrl}/${post.slug}`
          
          urls.push({
            loc: postUrl,
            lastmod: new Date(post.publishDay).toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8'
          })
        } catch (error) {
          console.warn('[Sitemap] Error processing post:', post.slug, error.message)
        }
      })
  }

  // 生成XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  console.log(`[Sitemap] Generated XML with ${urls.length} URLs`)
  return xml
}

function generateFallbackSitemap(baseUrl) {
  const currentDate = new Date().toISOString().split('T')[0]
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/archive</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/category</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`

  console.log('[Sitemap] Generated fallback sitemap')
  return xml
}

function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}



export default () => {}
