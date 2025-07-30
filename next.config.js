const { THEME } = require('./blog.config')
const fs = require('fs')
const path = require('path')
const BLOG = require('./blog.config')
const { extractLangPrefix } = require('./lib/utils/pageId')

// 打包时是否分析代码
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: BLOG.BUNDLE_ANALYZER
})

// 扫描项目 /themes下的目录名
const themes = scanSubdirectories(path.resolve(__dirname, 'themes'))
// 检测用户开启的多语言
const locales = (function () {
  // 根据BLOG_NOTION_PAGE_ID 检查支持多少种语言数据.
  // 支持如下格式配置多个语言的页面id xxx,zh:xxx,en:xxx
  const langs = [BLOG.LANG]
  if (BLOG.NOTION_PAGE_ID.indexOf(',') > 0) {
    const siteIds = BLOG.NOTION_PAGE_ID.split(',')
    for (let index = 0; index < siteIds.length; index++) {
      const siteId = siteIds[index]
      const prefix = extractLangPrefix(siteId)
      // 如果包含前缀 例如 zh , en 等
      if (prefix) {
        if (!langs.includes(prefix)) {
          langs.push(prefix)
        }
      }
    }
  }
  return langs
})()

// 编译前执行
// eslint-disable-next-line no-unused-vars
const preBuild = (function () {
  if (
    !process.env.npm_lifecycle_event === 'export' &&
    !process.env.npm_lifecycle_event === 'build'
  ) {
    return
  }
  // 删除 public/sitemap.xml 文件 ； 否则会和/pages/sitemap.xml.js 冲突。
  const sitemapPath = path.resolve(__dirname, 'public', 'sitemap.xml')
  if (fs.existsSync(sitemapPath)) {
    fs.unlinkSync(sitemapPath)
    console.log('Deleted existing sitemap.xml from public directory')
  }

  const sitemap2Path = path.resolve(__dirname, 'sitemap.xml')
  if (fs.existsSync(sitemap2Path)) {
    fs.unlinkSync(sitemap2Path)
    console.log('Deleted existing sitemap.xml from root directory')
  }
})()

/**
 * 扫描指定目录下的文件夹名，用于获取所有主题
 * @param {*} directory
 * @returns
 */
function scanSubdirectories(directory) {
  const subdirectories = []

  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file)
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      subdirectories.push(file)
    }

    // subdirectories.push(file)
  })

  return subdirectories
}

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  output: process.env.EXPORT
    ? 'export'
    : process.env.NEXT_BUILD_STANDALONE === 'true'
      ? 'standalone'
      : undefined,
  staticPageGenerationTimeout: 120,

  // 性能优化配置
  swcMinify: true, // 使用 SWC 进行代码压缩
  compress: true, // 启用 gzip 压缩
  poweredByHeader: false, // 移除 X-Powered-By 头

  // 多语言， 在export时禁用
  i18n: process.env.EXPORT
    ? undefined
    : {
      defaultLocale: BLOG.LANG,
      // 支持的所有多语言,按需填写即可
      locales: locales
    },

  // 图片优化配置
  images: {
    // 图片压缩格式优先级
    formats: ['image/avif', 'image/webp'],
    // 图片尺寸优化
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 启用图片优化
    minimumCacheTTL: 31536000, // 1年缓存
    // 允许next/image加载的图片 域名
    domains: [
      'gravatar.com',
      'www.notion.so',
      'avatars.githubusercontent.com',
      'images.unsplash.com',
      'source.unsplash.com',
      'p1.qhimg.com',
      'webmention.io',
      'ko-fi.com'
    ]
  },

  // 默认将feed重定向至 /public/rss/feed.xml
  redirects: process.env.EXPORT
    ? undefined
    : () => {
      return [
        {
          source: '/feed',
          destination: '/rss/feed.xml',
          permanent: true
        }
      ]
    },
  // 重写url
  rewrites: process.env.EXPORT
    ? undefined
    : () => {
      // 处理多语言重定向
      const langsRewrites = []
      if (BLOG.NOTION_PAGE_ID.indexOf(',') > 0) {
        const siteIds = BLOG.NOTION_PAGE_ID.split(',')
        const langs = []
        for (let index = 0; index < siteIds.length; index++) {
          const siteId = siteIds[index]
          const prefix = extractLangPrefix(siteId)
          // 如果包含前缀 例如 zh , en 等
          if (prefix) {
            langs.push(prefix)
          }
          console.log('[Locales]', siteId)
        }

        // 映射多语言
        // 示例： source: '/:locale(zh|en)/:path*' ; :locale() 会将语言放入重写后的 `?locale=` 中。
        langsRewrites.push(
          {
            source: `/:locale(${langs.join('|')})/:path*`,
            destination: '/:path*'
          },
          // 匹配没有路径的情况，例如 [domain]/zh 或 [domain]/en
          {
            source: `/:locale(${langs.join('|')})`,
            destination: '/'
          },
          // 匹配没有路径的情况，例如 [domain]/zh/ 或 [domain]/en/
          {
            source: `/:locale(${langs.join('|')})/`,
            destination: '/'
          }
        )
      }

      return [
        ...langsRewrites,
        // 伪静态重写
        {
          source: '/:path*.html',
          destination: '/:path*'
        }
      ]
    },
  headers: process.env.EXPORT
    ? undefined
    : () => {
      return [
        {
          source: '/:path*{/}?',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT'
            },
            {
              key: 'Access-Control-Allow-Headers',
              value:
                'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable'
            },
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self' *",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' *",
                "style-src 'self' 'unsafe-inline' *",
                "font-src 'self' * data:",
                "img-src 'self' data: blob: *",
                "connect-src 'self' *",
                "frame-src 'self' *",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self' *"
              ].join('; ')
            }
          ]
        }
      ]
    },
  webpack: (config, { dev, isServer }) => {
    // 动态主题：添加 resolve.alias 配置，将动态路径映射到实际路径
    config.resolve.alias['@'] = path.resolve(__dirname)

    if (!isServer) {
      console.log('[默认主题]', path.resolve(__dirname, 'themes', THEME))
    }
    config.resolve.alias['@theme-components'] = path.resolve(
      __dirname,
      'themes',
      THEME
    )

    // 性能优化配置
    if (!dev && !isServer) {
      // 更激进的代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // React 相关库单独分包
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20
          },
          // Notion 相关库单独分包
          notion: {
            test: /[\\/]node_modules[\\/](notion-client|notion-utils|react-notion-x)[\\/]/,
            name: 'notion',
            chunks: 'all',
            priority: 15
          },
          // 其他第三方库
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            maxSize: 200000
          },
          // 公共代码
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            maxSize: 100000
          }
        }
      }

      // 压缩和 Tree shaking 优化
      config.optimization.minimize = true
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      config.optimization.providedExports = true

      // 移除 console.log 和 debugger (生产环境)
      config.optimization.minimizer.forEach(plugin => {
        if (plugin.constructor.name === 'TerserPlugin') {
          plugin.options.terserOptions.compress = {
            ...plugin.options.terserOptions.compress,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          }
        }
      })
    }

    // 开发环境源码映射
    if (dev) {
      config.devtool = 'eval-source-map'
    }

    // 添加更多优化
    if (!dev) {
      // 忽略某些模块以减少包大小
      config.resolve.alias = {
        ...config.resolve.alias,
        // 使用轻量级替代品
        'moment': 'dayjs'
        // 移除lodash别名，保持原有的lodash模块结构
      }

      // 添加更多压缩选项
      config.optimization.concatenateModules = true
      config.optimization.flagIncludedChunks = true
      // occurrenceOrder 在 webpack 5 中已被移除，使用 chunkIds 和 moduleIds 替代
      config.optimization.chunkIds = 'size'
      config.optimization.moduleIds = 'size'
    }

    return config
  },
  experimental: {
    scrollRestoration: true
  },
  exportPathMap: function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    // 保留sitemap.xml.js的动态生成功能
    const pages = { ...defaultPathMap }
    // 只删除auth相关页面，保留sitemap
    delete pages['/auth']
    return pages
  },
  publicRuntimeConfig: {
    // 这里的配置既可以服务端获取到，也可以在浏览器端获取到
    THEMES: themes
  }
}

module.exports = process.env.ANALYZE
  ? withBundleAnalyzer(nextConfig)
  : nextConfig
