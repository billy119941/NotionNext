/**
 * 动态导入管理系统
 * 实现组件预加载和按需加载功能
 */

import React, { lazy, Suspense } from 'react'

class DynamicImportManager {
  constructor() {
    this.loadedComponents = new Map()
    this.preloadedComponents = new Set()
    this.loadingComponents = new Map()
    this.componentCache = new Map()
    this.preloadQueue = []
    this.isPreloading = false
  }

  /**
   * 动态加载组件
   * @param {string} componentName - 组件名称
   * @param {Function} importFunction - 导入函数
   * @param {Object} options - 配置选项
   * @returns {Promise<React.Component>}
   */
  async loadComponent(componentName, importFunction, options = {}) {
    const {
      fallback = null,
      retry = 3,
      timeout = 10000,
      preload = false
    } = options

    // 如果组件已加载，直接返回
    if (this.loadedComponents.has(componentName)) {
      return this.loadedComponents.get(componentName)
    }

    // 如果正在加载，返回现有的Promise
    if (this.loadingComponents.has(componentName)) {
      return this.loadingComponents.get(componentName)
    }

    // 创建加载Promise
    const loadPromise = this.createLoadPromise(
      componentName,
      importFunction,
      { retry, timeout, preload }
    )

    this.loadingComponents.set(componentName, loadPromise)

    try {
      const component = await loadPromise
      this.loadedComponents.set(componentName, component)
      this.loadingComponents.delete(componentName)
      
      if (preload) {
        this.preloadedComponents.add(componentName)
      }

      return component
    } catch (error) {
      this.loadingComponents.delete(componentName)
      console.error(`Failed to load component ${componentName}:`, error)
      throw error
    }
  }

  /**
   * 创建加载Promise
   * @param {string} componentName - 组件名称
   * @param {Function} importFunction - 导入函数
   * @param {Object} options - 配置选项
   * @returns {Promise}
   */
  createLoadPromise(componentName, importFunction, options) {
    const { retry, timeout, preload } = options

    return new Promise(async (resolve, reject) => {
      let attempts = 0
      const maxAttempts = retry + 1

      const attemptLoad = async () => {
        attempts++
        
        try {
          // 设置超时
          const timeoutPromise = new Promise((_, timeoutReject) => {
            setTimeout(() => {
              timeoutReject(new Error(`Component ${componentName} load timeout`))
            }, timeout)
          })

          // 执行导入
          const loadPromise = importFunction()
          const module = await Promise.race([loadPromise, timeoutPromise])
          
          // 获取默认导出或命名导出
          const component = module.default || module[componentName] || module
          
          if (!component) {
            throw new Error(`Component ${componentName} not found in module`)
          }

          resolve(component)
        } catch (error) {
          if (attempts < maxAttempts) {
            // 重试前等待一段时间
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000)
            setTimeout(attemptLoad, delay)
          } else {
            reject(error)
          }
        }
      }

      attemptLoad()
    })
  }

  /**
   * 预加载组件
   * @param {string} componentName - 组件名称
   * @param {Function} importFunction - 导入函数
   * @param {Object} options - 配置选项
   */
  async preloadComponent(componentName, importFunction, options = {}) {
    if (this.preloadedComponents.has(componentName) || 
        this.loadedComponents.has(componentName)) {
      return
    }

    try {
      await this.loadComponent(componentName, importFunction, {
        ...options,
        preload: true
      })
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error)
    }
  }

  /**
   * 批量预加载组件
   * @param {Array} components - 组件配置数组
   * @param {Object} options - 配置选项
   */
  async batchPreload(components, options = {}) {
    const { 
      concurrency = 3,
      delay = 100,
      priority = 'normal'
    } = options

    // 根据优先级排序
    const sortedComponents = this.sortByPriority(components, priority)
    
    // 分批处理
    for (let i = 0; i < sortedComponents.length; i += concurrency) {
      const batch = sortedComponents.slice(i, i + concurrency)
      
      const promises = batch.map(({ name, importFunction, options: compOptions }) =>
        this.preloadComponent(name, importFunction, compOptions)
      )

      await Promise.allSettled(promises)
      
      // 批次间延迟
      if (i + concurrency < sortedComponents.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * 根据优先级排序组件
   * @param {Array} components - 组件数组
   * @param {string} defaultPriority - 默认优先级
   * @returns {Array}
   */
  sortByPriority(components, defaultPriority) {
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    
    return components.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || defaultPriority] || 2
      const bPriority = priorityOrder[b.priority || defaultPriority] || 2
      return bPriority - aPriority
    })
  }

  /**
   * 创建懒加载组件
   * @param {Function} importFunction - 导入函数
   * @param {Object} options - 配置选项
   * @returns {React.Component}
   */
  createLazyComponent(importFunction, options = {}) {
    const {
      fallback = null,
      errorBoundary = true,
      displayName = 'LazyComponent'
    } = options

    const LazyComponent = lazy(importFunction)
    LazyComponent.displayName = displayName

    if (errorBoundary) {
      return this.withErrorBoundary(LazyComponent, fallback, displayName)
    }

    return (props) => (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }

  /**
   * 添加错误边界
   * @param {React.Component} Component - 组件
   * @param {React.Element} fallback - 加载中组件
   * @param {string} displayName - 显示名称
   * @returns {React.Component}
   */
  withErrorBoundary(Component, fallback, displayName) {
    return class extends React.Component {
      constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
      }

      static displayName = `ErrorBoundary(${displayName})`

      static getDerivedStateFromError(error) {
        return { hasError: true, error }
      }

      componentDidCatch(error, errorInfo) {
        console.error(`Error in lazy component ${displayName}:`, error, errorInfo)
      }

      render() {
        if (this.state.hasError) {
          return (
            <div className="error-boundary">
              <p>组件加载失败</p>
              <button onClick={() => this.setState({ hasError: false, error: null })}>
                重试
              </button>
            </div>
          )
        }

        return (
          <Suspense fallback={fallback}>
            <Component {...this.props} />
          </Suspense>
        )
      }
    }
  }

  /**
   * 智能预加载 - 基于用户行为预测
   * @param {Object} options - 配置选项
   */
  enableSmartPreload(options = {}) {
    const {
      intersectionThreshold = 0.1,
      hoverDelay = 200,
      idleTimeout = 2000
    } = options

    // 基于视口交叉预加载
    this.setupIntersectionPreload(intersectionThreshold)
    
    // 基于鼠标悬停预加载
    this.setupHoverPreload(hoverDelay)
    
    // 基于空闲时间预加载
    this.setupIdlePreload(idleTimeout)
  }

  /**
   * 设置视口交叉预加载
   * @param {number} threshold - 交叉阈值
   */
  setupIntersectionPreload(threshold) {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const { componentName, importFunction } = entry.target.dataset
            if (componentName && importFunction) {
              this.preloadComponent(componentName, () => import(importFunction))
            }
          }
        })
      },
      { threshold }
    )

    // 观察带有预加载标记的元素
    document.querySelectorAll('[data-preload-component]').forEach(el => {
      observer.observe(el)
    })
  }

  /**
   * 设置鼠标悬停预加载
   * @param {number} delay - 延迟时间
   */
  setupHoverPreload(delay) {
    if (typeof window === 'undefined') return

    let hoverTimer = null

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-hover-preload]')
      if (!target) return

      const { componentName, importFunction } = target.dataset
      if (!componentName || !importFunction) return

      hoverTimer = setTimeout(() => {
        this.preloadComponent(componentName, () => import(importFunction))
      }, delay)
    })

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-hover-preload]')
      if (target && hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
      }
    })
  }

  /**
   * 设置空闲时间预加载
   * @param {number} timeout - 空闲超时时间
   */
  setupIdlePreload(timeout) {
    if (typeof window === 'undefined' || !window.requestIdleCallback) {
      return
    }

    const preloadLowPriorityComponents = () => {
      if (this.preloadQueue.length === 0) return

      window.requestIdleCallback((deadline) => {
        while (deadline.timeRemaining() > 0 && this.preloadQueue.length > 0) {
          const { name, importFunction, options } = this.preloadQueue.shift()
          this.preloadComponent(name, importFunction, options)
        }

        if (this.preloadQueue.length > 0) {
          setTimeout(preloadLowPriorityComponents, timeout)
        }
      })
    }

    setTimeout(preloadLowPriorityComponents, timeout)
  }

  /**
   * 添加到预加载队列
   * @param {string} name - 组件名称
   * @param {Function} importFunction - 导入函数
   * @param {Object} options - 配置选项
   */
  addToPreloadQueue(name, importFunction, options = {}) {
    this.preloadQueue.push({ name, importFunction, options })
  }

  /**
   * 获取已加载的组件列表
   * @returns {Array}
   */
  getLoadedComponents() {
    return Array.from(this.loadedComponents.keys())
  }

  /**
   * 获取预加载的组件列表
   * @returns {Array}
   */
  getPreloadedComponents() {
    return Array.from(this.preloadedComponents)
  }

  /**
   * 清理缓存
   * @param {string} componentName - 组件名称（可选）
   */
  clearCache(componentName) {
    if (componentName) {
      this.loadedComponents.delete(componentName)
      this.preloadedComponents.delete(componentName)
      this.componentCache.delete(componentName)
    } else {
      this.loadedComponents.clear()
      this.preloadedComponents.clear()
      this.componentCache.clear()
    }
  }

  /**
   * 获取加载统计信息
   * @returns {Object}
   */
  getStats() {
    return {
      loaded: this.loadedComponents.size,
      preloaded: this.preloadedComponents.size,
      loading: this.loadingComponents.size,
      queued: this.preloadQueue.length
    }
  }
}

// 创建全局实例
const dynamicImportManager = new DynamicImportManager()

export default dynamicImportManager
export { DynamicImportManager }