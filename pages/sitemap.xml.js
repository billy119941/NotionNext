/**
 * Standards-Compliant Sitemap Generator for NotionNext
 * 
 * Generates clean, valid XML sitemap following Google's guidelines.
 * Fixes all common sitemap issues and validation errors.
 * 
 * @author NotionNext Team
 * @version 3.0.0 (Standards-Compliant)
 * @since 2024-01-29
 */

import BLOG from '@/blog.config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { SitemapErrorHandler } from '@/lib/utils/SitemapErrorHandler'

export const getServerSideProps = async ctx => {
  const errorHandler = new SitemapErrorHandler()

  let allUrls = []
  const siteIds = BLOG.NOTION_PAGE_ID.split(',')
  const baseUrl = 'https://www.shareking.vip'

  console.log('[Sitemap] Starting standards-compliant sitemap generation')

  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const id = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)

    try {
      console.log(`[Sitemap] Processing site ${index + 1}/${siteIds.length}: ${id}`)

      const siteData = await getGlobalData({
        pageId: id,
        from: 'sitemap.xml'
      })

      const siteUrls = generateSiteUrls(baseUrl, siteData.allPages, locale)
      allUrls = allUrls.concat(siteUrls)

      console.log(`[Sitemap] Site ${id} processed: ${siteUrls.length} URLs`)

    } catch (error) {
      console.warn(`[Sitemap] Failed to process site ${id}:`, error.message)
      errorHandler.handleError(error, { siteId: id, context: 'site_processing' })

      // 降级处理：生成基本页面
      const fallbackUrls = generateFallbackUrls(baseUrl, locale)
      allUrls = allUrls.concat(fallbackUrls)

      console.log(`[Sitemap] Using fallback for site ${id}: ${fallbackUrls.length} URLs`)
    }
  }

  // 去重和验证
  const validUrls = validateAndDeduplicateUrls(allUrls)
  console.log(`[Sitemap] Final sitemap: ${validUrls.length} valid URLs`)

  // 生成标准 XML
  const xml = generateStandardSitemapXML(validUrls)

  // 设置正确的响应头
  ctx.res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  ctx.res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200')

  ctx.res.write(xml)
  ctx.res.end()

  return { props: {} }
}



// 强化的URL验证和清理函数
function validateAndCleanUrl(url) {
  if (!url || typeof url !== 'string') return null

  // 移除片段标识符 (#) 和查询参数中的片段
  url = url.split('#')[0]

  // 检查是否包含嵌套的URL（如 http://domain.com/https://other.com）
  const urlPattern = /https?:\/\//g
  const matches = url.match(urlPattern)
  if (matches && matches.length > 1) {
    console.warn('[Sitemap] Nested URL detected, skipping:', url)
    return null
  }

  // 检查是否是有效的 URL 格式
  try {
    const urlObj = new URL(url)

    // 确保协议正确
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      console.warn('[Sitemap] Invalid protocol:', url)
      return null
    }

    // 强制使用HTTPS
    if (urlObj.protocol !== 'https:') {
      urlObj.protocol = 'https:'
    }

    // 验证域名是否合法
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      console.warn('[Sitemap] Invalid hostname:', url)
      return null
    }

    // 验证域名是否为预期的域名
    if (!urlObj.hostname.includes('shareking.vip')) {
      console.warn('[Sitemap] URL not from expected domain:', url)
      return null
    }

    // URL编码路径中的特殊字符，但保持路径结构
    const cleanPath = urlObj.pathname
      .split('/')
      .map(segment => {
        if (segment === '') return segment
        // 编码所有特殊字符，包括单引号
        let encoded = encodeURIComponent(segment)
        // 手动编码单引号以提高兼容性
        encoded = encoded.replace(/'/g, '%27')
        return encoded
      })
      .join('/')

    urlObj.pathname = cleanPath

    // 移除多余的查询参数和片段
    urlObj.search = ''
    urlObj.hash = ''

    const finalUrl = urlObj.toString()

    // 最终验证：确保URL不包含明显的错误模式
    if (finalUrl.includes('//') && !finalUrl.match(/^https?:\/\//)) {
      console.warn('[Sitemap] Double slash detected:', finalUrl)
      return null
    }

    return finalUrl
  } catch (error) {
    console.warn('[Sitemap] Invalid URL format:', url, error.message)
    return null
  }
}

// 验证slug是否安全和有效
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false

  // 检查是否包含完整的URL
  if (slug.includes('http://') || slug.includes('https://')) {
    console.warn('[Sitemap] Slug contains full URL:', slug)
    return false
  }

  // 检查是否只是片段标识符
  if (slug === '#' || slug.startsWith('#')) {
    console.warn('[Sitemap] Slug is fragment identifier:', slug)
    return false
  }

  // 检查是否为空或只有斜杠
  if (slug.trim() === '' || slug.trim() === '/') {
    return false
  }

  // 检查是否包含真正危险的字符（单引号可以被URL编码，所以不算危险）
  const dangerousChars = ['<', '>', '"', '&']
  if (dangerousChars.some(char => slug.includes(char))) {
    console.warn('[Sitemap] Slug contains dangerous characters:', slug)
    return false
  }

  return true
}

// 检查是否为友情链接或外部链接
function isExternalLink(slug) {
  if (!slug || typeof slug !== 'string') return false

  // 友情链接域名列表
  const friendlyDomains = [
    'netdiskso.xyz',
    'tangly1024.com',
    'github.com',
    'notion.so'
  ]

  // 检查是否包含友情链接域名
  return friendlyDomains.some(domain => slug.includes(domain))
}

// 修正问题URL
function fixProblematicUrl(slug, baseUrl) {
  if (!slug || typeof slug !== 'string') return null

  // 处理分类页面的片段标识符问题
  if (slug === '#') {
    console.log('[Sitemap] Converting fragment identifier to category page')
    return `${baseUrl}/category`
  }

  // 处理嵌套URL问题 - 提取正确的路径
  if (slug.includes('https://shareking.vip/about')) {
    console.log('[Sitemap] Fixing nested about page URL')
    return `${baseUrl}/about`
  }

  // 过滤掉友情链接
  if (isExternalLink(slug)) {
    console.warn('[Sitemap] Skipping external/friendly link:', slug)
    return null
  }

  return slug
}

// 生成站点 URLs
function generateSiteUrls(baseUrl, allPages, locale) {
  const urls = []
  const currentDate = new Date().toISOString().split('T')[0]

  // 处理 locale 前缀
  const localePrefix = (locale && locale.length > 0 && locale !== 'zh-CN')
    ? (locale.startsWith('/') ? locale : '/' + locale)
    : ''

  // 基础页面
  const basePages = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/archive', priority: '0.8', changefreq: 'weekly' },
    { path: '/category', priority: '0.8', changefreq: 'weekly' },
    { path: '/search', priority: '0.6', changefreq: 'monthly' },
    { path: '/tag', priority: '0.8', changefreq: 'weekly' }
  ]

  basePages.forEach(page => {
    const fullUrl = `${baseUrl}${localePrefix}${page.path}`
    const cleanUrl = validateAndCleanUrl(fullUrl)

    if (cleanUrl) {
      urls.push({
        loc: cleanUrl,
        lastmod: currentDate,
        changefreq: page.changefreq,
        priority: page.priority
      })
    }
  })

  // 文章页面
  if (allPages && Array.isArray(allPages)) {
    allPages
      .filter(post => {
        return post &&
          post.status === 'Published' &&
          post.slug &&
          typeof post.slug === 'string' &&
          post.slug.length > 0
      })
      .forEach(post => {
        try {
          // 修正问题URL
          const fixedSlug = fixProblematicUrl(post.slug, baseUrl)
          if (!fixedSlug) {
            console.log('[Sitemap] Skipping problematic slug:', post.slug)
            return
          }

          // 如果修正后的slug是完整URL，直接使用
          if (fixedSlug.startsWith('http')) {
            const cleanUrl = validateAndCleanUrl(fixedSlug)
            if (cleanUrl) {
              // 只有当文章有有效发布日期时才使用，否则使用当前日期
              let lastmod = currentDate
              if (post.publishDay) {
                const publishDate = new Date(post.publishDay)
                const today = new Date()
                // 确保发布日期有效且不是未来日期
                if (!isNaN(publishDate.getTime()) && publishDate <= today) {
                  lastmod = publishDate.toISOString().split('T')[0]
                }
              }

              urls.push({
                loc: cleanUrl,
                lastmod: lastmod,
                changefreq: 'weekly',
                priority: '0.8'
              })
            }
            return
          }

          // 清理 slug
          let cleanSlug = fixedSlug.startsWith('/') ? fixedSlug.slice(1) : fixedSlug

          // 验证清理后的slug
          if (!isValidSlug(cleanSlug)) {
            console.warn('[Sitemap] Invalid slug after cleaning:', cleanSlug)
            return
          }

          // 构建完整 URL
          const fullUrl = BLOG.PSEUDO_STATIC
            ? `${baseUrl}${localePrefix}/${cleanSlug}.html`
            : `${baseUrl}${localePrefix}/${cleanSlug}`

          const cleanUrl = validateAndCleanUrl(fullUrl)

          if (cleanUrl) {
            // 只有当文章有有效发布日期时才使用，否则使用当前日期
            let lastmod = currentDate
            if (post.publishDay) {
              const publishDate = new Date(post.publishDay)
              const today = new Date()
              // 确保发布日期有效且不是未来日期
              if (!isNaN(publishDate.getTime()) && publishDate <= today) {
                lastmod = publishDate.toISOString().split('T')[0]
              }
            }

            urls.push({
              loc: cleanUrl,
              lastmod: lastmod,
              changefreq: 'weekly',
              priority: '0.8'
            })
          }
        } catch (error) {
          console.warn('[Sitemap] Error processing post:', post.slug, error.message)
        }
      })
  }

  return urls
}

// 生成降级 URLs
function generateFallbackUrls(baseUrl, locale) {
  const currentDate = new Date().toISOString().split('T')[0]
  const localePrefix = (locale && locale.length > 0 && locale !== 'zh-CN')
    ? (locale.startsWith('/') ? locale : '/' + locale)
    : ''

  return [
    {
      loc: `${baseUrl}${localePrefix}`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '1.0'
    },
    {
      loc: `${baseUrl}${localePrefix}/archive`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8'
    },
    {
      loc: `${baseUrl}${localePrefix}/category`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8'
    }
  ]
}

// 验证和去重 URLs
function validateAndDeduplicateUrls(urls) {
  const uniqueUrls = new Map()

  urls.forEach(urlData => {
    const cleanUrl = validateAndCleanUrl(urlData.loc)

    if (cleanUrl) {
      const existing = uniqueUrls.get(cleanUrl)

      // 如果已存在，保留最新的 lastmod
      if (!existing || new Date(urlData.lastmod) > new Date(existing.lastmod)) {
        uniqueUrls.set(cleanUrl, {
          ...urlData,
          loc: cleanUrl
        })
      }
    }
  })

  return Array.from(uniqueUrls.values())
}

// 生成标准 XML - 只使用必需的命名空间
function generateStandardSitemapXML(urls) {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
  const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  const urlsetClose = '</urlset>'

  const urlEntries = urls.map(url => {
    // 验证lastmod日期格式
    const lastmod = validateLastmodDate(url.lastmod)

    return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  }).join('\n')

  return `${xmlHeader}
${urlsetOpen}
${urlEntries}
${urlsetClose}`
}

// 验证lastmod日期格式
function validateLastmodDate(dateStr) {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0]
  }

  // 检查是否为有效的YYYY-MM-DD格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    console.warn('[Sitemap] Invalid lastmod date format:', dateStr)
    return new Date().toISOString().split('T')[0]
  }

  // 验证日期是否有效
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    console.warn('[Sitemap] Invalid lastmod date:', dateStr)
    return new Date().toISOString().split('T')[0]
  }

  // 确保日期不是未来日期
  const today = new Date()
  if (date > today) {
    console.warn('[Sitemap] Future lastmod date detected:', dateStr)
    return new Date().toISOString().split('T')[0]
  }

  return dateStr
}

// XML 转义函数
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



export default () => { }
