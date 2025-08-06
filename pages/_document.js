// eslint-disable-next-line @next/next/no-document-import-in-page
import BLOG from '@/blog.config'
import Document, { Head, Html, Main, NextScript } from 'next/document'
import { 
  extractCriticalCSS, 
  generateInlineCSS, 
  generateDeferredCSSScript,
  getBuildCSSFiles,
  CRITICAL_CSS_CONFIG 
} from '@/lib/critical-css'

// 预先设置深色模式的脚本内容
const darkModeScript = `
(function() {
  const darkMode = localStorage.getItem('darkMode')

  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  const defaultAppearance = '${BLOG.APPEARANCE || 'auto'}'

  let shouldBeDark = darkMode === 'true' || darkMode === 'dark'

  if (darkMode === null) {
    if (defaultAppearance === 'dark') {
      shouldBeDark = true
    } else if (defaultAppearance === 'auto') {
      // 检查是否在深色模式时间范围内
      const date = new Date()
      const hours = date.getHours()
      const darkTimeStart = ${BLOG.APPEARANCE_DARK_TIME ? BLOG.APPEARANCE_DARK_TIME[0] : 18}
      const darkTimeEnd = ${BLOG.APPEARANCE_DARK_TIME ? BLOG.APPEARANCE_DARK_TIME[1] : 6}
      
      shouldBeDark = prefersDark || (hours >= darkTimeStart || hours < darkTimeEnd)
    }
  }
  
  // 立即设置 html 元素的类
  document.documentElement.classList.add(shouldBeDark ? 'dark' : 'light')
})()
`

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    
    // 在生产环境中提取Critical CSS
    let criticalCSS = ''
    let deferredCSSScript = ''
    
    if (CRITICAL_CSS_CONFIG.enabled) {
      try {
        const cssFiles = getBuildCSSFiles()
        if (cssFiles.length > 0) {
          // 生成延迟加载脚本
          deferredCSSScript = generateDeferredCSSScript(cssFiles)
        }
      } catch (error) {
        console.warn('Critical CSS extraction failed:', error.message)
      }
    }
    
    return { 
      ...initialProps,
      criticalCSS,
      deferredCSSScript
    }
  }

  render() {
    const { criticalCSS, deferredCSSScript } = this.props
    
    return (
      <Html lang={BLOG.LANG}>
        <Head>
          {/* Disable CSP for development to allow all resources */}
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; font-src * data:; img-src * data: blob:; connect-src *; frame-src *; object-src *; base-uri *; form-action *;"
          />
          
          {/* Critical CSS 内联 */}
          {criticalCSS && (
            <style 
              id="critical-css"
              dangerouslySetInnerHTML={{ __html: criticalCSS }}
            />
          )}
          
          {/* 预加载字体 */}
          {BLOG.FONT_AWESOME && (
            <>
              <link
                rel='preload'
                href={BLOG.FONT_AWESOME}
                as='style'
                crossOrigin='anonymous'
              />
              <link
                rel='stylesheet'
                href={BLOG.FONT_AWESOME}
                crossOrigin='anonymous'
                referrerPolicy='no-referrer'
              />
            </>
          )}

          {/* 预先设置深色模式，避免闪烁 */}
          <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
          
          {/* 延迟加载非关键CSS */}
          {deferredCSSScript && (
            <script dangerouslySetInnerHTML={{ __html: deferredCSSScript }} />
          )}
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
