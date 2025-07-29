/**
 * 字体优化工具
 * 解决字体显示延迟问题
 */

// 预加载关键字体
export const preloadFonts = () => {
  if (typeof window !== 'undefined') {
    const fonts = [
      // 添加你的关键字体
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont'
    ]
    
    fonts.forEach(font => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = `/fonts/${font}.woff2`
      document.head.appendChild(link)
    })
  }
}

// 字体显示优化 CSS
export const fontDisplayCSS = `
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/Inter.woff2') format('woff2');
  }
  
  /* 系统字体回退 */
  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`

// 减少布局偏移
export const fontLoadingOptimization = () => {
  if (typeof window !== 'undefined') {
    // 使用 Font Loading API
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        document.body.classList.add('fonts-loaded')
      })
    }
  }
}