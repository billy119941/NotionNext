/**
 * 路由级别代码分割配置
 * 实现页面组件的按需加载
 */

import React from 'react'

import dynamicImportManager from './DynamicImportManager'

// 路由组件配置
export const routeComponents = {
  // 主要页面
  home: {
    component: () => import('../../pages/index'),
    priority: 'high',
    preload: true
  },

  // 文章相关页面
  post: {
    component: () => import('../../pages/[prefix]/[slug]/index'),
    priority: 'high',
    preload: true
  },

  // 分类页面
  category: {
    component: () => import('../../pages/category/index'),
    priority: 'normal',
    preload: false
  },

  // 标签页面
  tag: {
    component: () => import('../../pages/tag/index'),
    priority: 'normal',
    preload: false
  },

  // 搜索页面
  search: {
    component: () => import('../../pages/search/index'),
    priority: 'normal',
    preload: false
  },

  // 归档页面
  archive: {
    component: () => import('../../pages/archive/index'),
    priority: 'low',
    preload: false
  },

  // 管理页面
  admin: {
    component: () => import('../../pages/admin/404-monitor'),
    priority: 'low',
    preload: false
  },

  // 认证页面
  auth: {
    component: () => import('../../pages/auth/index'),
    priority: 'low',
    preload: false
  },

  // 仪表板页面
  dashboard: {
    component: () => import('../../pages/dashboard/[[...index]]'),
    priority: 'normal',
    preload: false
  }
}

// 主题组件配置
export const themeComponents = {
  // HEO主题组件
  heo: {
    header: () => import('../../themes/heo/components/Header'),
    footer: () => import('../../themes/heo/components/Footer'),
    sidebar: () => import('../../themes/heo/components/SideBar'),
    blogPostCard: () => import('../../themes/heo/components/BlogPostCard'),
    postHeader: () => import('../../themes/heo/components/PostHeader'),
    categoryGroup: () => import('../../themes/heo/components/CategoryGroup'),
    tagGroups: () => import('../../themes/heo/components/TagGroups'),
    hero: () => import('../../themes/heo/components/Hero'),
    searchButton: () => import('../../themes/heo/components/SearchButton'),
    menuListTop: () => import('../../themes/heo/components/MenuListTop')
  },

  // 其他主题可以在这里添加
  hexo: {
    header: () => import('../../themes/hexo/components/Header'),
    footer: () => import('../../themes/hexo/components/Footer')
  }
}

// 功能组件配置
export const featureComponents = {
  // 评论系统
  comments: {
    giscus: () => import('../../components/Giscus'),
    gitalk: () => import('../../components/Gitalk'),
    twikoo: () => import('../../components/Twikoo'),
    waline: () => import('../../components/WalineComponent'),
    cusdis: () => import('../../components/CusdisComponent')
  },

  // 搜索组件
  search: {
    algolia: () => import('../../components/AlgoliaSearchModal')
  },

  // 分析组件
  analytics: {
    gtag: () => import('../../components/Gtag'),
    busuanzi: () => import('../../components/Busuanzi'),
    ackee: () => import('../../components/Ackee')
  },

  // 社交组件
  social: {
    shareBar: () => import('../../components/ShareBar'),
    shareButtons: () => import('../../components/ShareButtons'),
    facebookPage: () => import('../../components/FacebookPage'),
    facebookMessenger: () => import('../../components/FacebookMessenger')
  },

  // 媒体组件
  media: {
    player: () => import('../../components/Player'),
    pdf: () => import('../../components/Pdf'),
    live2d: () => import('../../components/Live2D')
  },

  // 效果组件
  effects: {
    fireworks: () => import('../../components/Fireworks'),
    sakura: () => import('../../components/Sakura'),
    starry: () => import('../../components/StarrySky'),
    ribbon: () => import('../../components/Ribbon'),
    mouseFollow: () => import('../../components/MouseFollow')
  }
}

/**
 * 路由代码分割管理器
 */
class RouteCodeSplittingManager {
  constructor() {
    this.currentTheme = null
    this.preloadedRoutes = new Set()
    this.routePreloadRules = new Map()
  }

  /**
   * 初始化路由代码分割
   * @param {string} theme - 当前主题
   * @param {Object} options - 配置选项
   */
  initialize(theme, options = {}) {
    this.currentTheme = theme

    const {
      enableSmartPreload = true,
      preloadHighPriority = true,
      preloadThemeComponents = true
    } = options

    // 预加载高优先级路由
    if (preloadHighPriority) {
      this.preloadHighPriorityRoutes()
    }

    // 预加载主题组件
    if (preloadThemeComponents && theme) {
      this.preloadThemeComponents(theme)
    }

    // 启用智能预加载
    if (enableSmartPreload) {
      this.enableSmartPreload()
    }

    // 设置路由预加载规则
    this.setupRoutePreloadRules()
  }

  /**
   * 预加载高优先级路由
   */
  async preloadHighPriorityRoutes() {
    try {
      const highPriorityRoutes = Object.entries(routeComponents)
        .filter(([_, config]) => config.priority === 'high' && config.preload)
        .map(([name, config]) => ({
          name: `route-${name}`,
          importFunction: config.component,
          priority: 'high'
        }))

      if (highPriorityRoutes.length > 0) {
        await dynamicImportManager.batchPreload(highPriorityRoutes, {
          concurrency: 2,
          delay: 200
        })
        console.log(`[路由预加载] 成功预加载 ${highPriorityRoutes.length} 个高优先级路由`)
      }
    } catch (error) {
      console.warn('[路由预加载] 预加载高优先级路由失败:', error)
    }
  }

  /**
   * 预加载主题组件
   * @param {string} theme - 主题名称
   */
  async preloadThemeComponents(theme) {
    try {
      const themeConfig = themeComponents[theme]
      if (!themeConfig) {
        console.log(`[主题预加载] 主题 ${theme} 配置不存在`)
        return
      }

      const components = Object.entries(themeConfig).map(([name, importFunction]) => ({
        name: `theme-${theme}-${name}`,
        importFunction,
        priority: 'normal'
      }))

      if (components.length > 0) {
        await dynamicImportManager.batchPreload(components, {
          concurrency: 3,
          delay: 100
        })
        console.log(`[主题预加载] 成功预加载 ${components.length} 个主题组件`)
      }
    } catch (error) {
      console.warn(`[主题预加载] 预加载主题组件失败: ${theme}`, error)
    }
  }

  /**
   * 启用智能预加载
   */
  enableSmartPreload() {
    try {
      dynamicImportManager.enableSmartPreload({
        intersectionThreshold: 0.2,
        hoverDelay: 300,
        idleTimeout: 3000
      })
      console.log('[智能预加载] 智能预加载功能已启用')
    } catch (error) {
      console.warn('[智能预加载] 启用智能预加载失败:', error)
    }
  }

  /**
   * 设置路由预加载规则
   */
  setupRoutePreloadRules() {
    // 首页 -> 预加载文章页和分类页
    this.routePreloadRules.set('home', ['post', 'category'])

    // 文章页 -> 预加载相关文章和评论组件
    this.routePreloadRules.set('post', ['comments'])

    // 分类页 -> 预加载标签页
    this.routePreloadRules.set('category', ['tag'])

    // 搜索页 -> 预加载搜索组件
    this.routePreloadRules.set('search', ['search'])
  }

  /**
   * 根据当前路由预加载相关组件
   * @param {string} currentRoute - 当前路由名称
   */
  async preloadRelatedComponents(currentRoute) {
    try {
      const relatedComponents = this.routePreloadRules.get(currentRoute)
      if (!relatedComponents) return

      for (const componentType of relatedComponents) {
        // 预加载路由组件
        if (routeComponents[componentType]) {
          await dynamicImportManager.preloadComponent(
            `route-${componentType}`,
            routeComponents[componentType].component
          )
        }

        // 预加载功能组件
        if (featureComponents[componentType]) {
          const components = Object.entries(featureComponents[componentType])
          for (const [name, importFunction] of components) {
            await dynamicImportManager.preloadComponent(
              `feature-${componentType}-${name}`,
              importFunction
            )
          }
        }
      }
      console.log(`[相关组件预加载] 成功预加载 ${currentRoute} 相关组件`)
    } catch (error) {
      console.warn(`[相关组件预加载] 预加载相关组件失败: ${currentRoute}`, error)
    }
  }

  /**
   * 获取路由组件
   * @param {string} routeName - 路由名称
   * @returns {Promise<React.Component>}
   */
  async getRouteComponent(routeName) {
    const routeConfig = routeComponents[routeName]
    if (!routeConfig) {
      throw new Error(`Route ${routeName} not found`)
    }

    return await dynamicImportManager.loadComponent(
      `route-${routeName}`,
      routeConfig.component,
      {
        retry: 3,
        timeout: 10000
      }
    )
  }

  /**
   * 获取主题组件
   * @param {string} theme - 主题名称
   * @param {string} componentName - 组件名称
   * @returns {Promise<React.Component>}
   */
  async getThemeComponent(theme, componentName) {
    const themeConfig = themeComponents[theme]
    if (!themeConfig || !themeConfig[componentName]) {
      throw new Error(`Theme component ${theme}/${componentName} not found`)
    }

    return await dynamicImportManager.loadComponent(
      `theme-${theme}-${componentName}`,
      themeConfig[componentName],
      {
        retry: 2,
        timeout: 8000
      }
    )
  }

  /**
   * 获取功能组件
   * @param {string} category - 功能分类
   * @param {string} componentName - 组件名称
   * @returns {Promise<React.Component>}
   */
  async getFeatureComponent(category, componentName) {
    const categoryConfig = featureComponents[category]
    if (!categoryConfig || !categoryConfig[componentName]) {
      throw new Error(`Feature component ${category}/${componentName} not found`)
    }

    return await dynamicImportManager.loadComponent(
      `feature-${category}-${componentName}`,
      categoryConfig[componentName],
      {
        retry: 2,
        timeout: 8000
      }
    )
  }

  /**
   * 创建懒加载路由组件
   * @param {string} routeName - 路由名称
   * @param {Object} options - 配置选项
   * @returns {React.Component}
   */
  createLazyRouteComponent(routeName, options = {}) {
    const routeConfig = routeComponents[routeName]
    if (!routeConfig) {
      throw new Error(`Route ${routeName} not found`)
    }

    return dynamicImportManager.createLazyComponent(
      routeConfig.component,
      {
        displayName: `LazyRoute(${routeName})`,
        fallback: <div className="loading">加载中...</div>,
        ...options
      }
    )
  }

  /**
   * 获取加载统计信息
   * @returns {Object}
   */
  getStats() {
    return {
      ...dynamicImportManager.getStats(),
      currentTheme: this.currentTheme,
      preloadedRoutes: Array.from(this.preloadedRoutes),
      routePreloadRules: Object.fromEntries(this.routePreloadRules)
    }
  }
}

// 创建全局实例
const routeCodeSplittingManager = new RouteCodeSplittingManager()

export default routeCodeSplittingManager
export { RouteCodeSplittingManager }