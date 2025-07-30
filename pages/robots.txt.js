/**
 * Dynamic robots.txt generator for NotionNext
 * 
 * This generates robots.txt dynamically to avoid Cloudflare override issues
 * 
 * @author NotionNext Team
 * @version 1.1.0 (Corrected Version)
 * @since 2024-01-29
 */

import BLOG from '@/blog.config'

export const getServerSideProps = async ctx => {
  const baseUrl = BLOG.LINK || 'https://www.shareking.vip'
  const author = 'ShareKing'
  const currentDate = new Date().toISOString().split('T')[0]
  
  // Extract domain without protocol for Host declaration
  const domain = baseUrl.replace('https://', '').replace('http://', '')
  
  let content = `# Robots.txt for ${baseUrl}
# Generated on ${currentDate} (Corrected Version)
# Author: ${author}

#----------------------------------------------------------------
# 1. General rules for all compliant crawlers, including major search engines.
#    Major search engines like Googlebot and Bingbot will follow these rules.
#----------------------------------------------------------------
User-agent: *

# Disallow access to admin, private, and non-content areas
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /_next/
Disallow: /static/

# Disallow access to search result pages to prevent duplicate content
Disallow: /search?*
Disallow: /search/

# Note: There is no need to explicitly "Allow" subdirectories like /images/ or /css/
# unless their parent directory is disallowed. Assuming they are not inside /static/.

#----------------------------------------------------------------
# 2. Block problematic and specific AI training bots by name.
#    These bots will be blocked completely.
#----------------------------------------------------------------
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

#----------------------------------------------------------------
# 3. Sitemap location.
#    This directive is supported by most search engines.
#----------------------------------------------------------------
Sitemap: ${baseUrl}/sitemap.xml

#----------------------------------------------------------------
# Additional information
# For questions about this robots.txt, contact: longxiao0807@gmail.com
#----------------------------------------------------------------
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
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /_next/
Disallow: /static/
Disallow: /search?*
Disallow: /search/

Sitemap: ${baseUrl}/sitemap.xml

# For questions about this robots.txt, contact: longxiao0807@gmail.com
`
    
    ctx.res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    ctx.res.setHeader('Cache-Control', 'public, max-age=300')
    
    ctx.res.write(fallbackContent)
    ctx.res.end()

    return { props: {} }
  }
}

export default () => {}