/**
 * 动态导入React Hook
 * 简化动态导入组件的使用
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamicImportManager from '../lib/utils/DynamicImportManager'

/**
 * 使用动态导入的Hook
 * @param {string} componentName - 组件名称
 * @param {Function} importFunction - 导入函数
 * @param {Object} options - 配置选项
 * @returns {Object}
 */
export function useDynamicImport(componentName, importFunction, options = {}) {
  const [component, setComponent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const {
    preload = false,
    retry = 3,
    timeout = 10000,
    lazy = false
  } = options

  const loadComponent = useCallback(async () => {
    if (!mountedRef.current) return

    setLoading(true)
    setError(null)

    try {
      const loadedComponent = await dynamicImportManager.loadComponent(
        componentName,
        importFunction,
        { retry, timeout, preload }
      )

      if (mountedRef.current) {
        setComponent(loadedComponent)
        setLoading(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        setLoading(false)
      }
    }
  }, [componentName, importFunction, retry, timeout, preload])

  const preloadComponent = useCallback(async () => {
    try {
      await dynamicImportManager.preloadComponent(
        componentName,
        importFunction,
        { retry, timeout }
      )
    } catch (err) {
      console.warn(`Failed to preload ${componentName}:`, err)
    }
  }, [componentName, importFunction, retry, timeout])

  useEffect(() => {
    mountedRef.current = true

    if (preload) {
      preloadComponent()
    }

    if (!lazy) {
      loadComponent()
    }

    return () => {
      mountedRef.current = false
    }
  }, [preload, lazy, loadComponent, preloadComponent])

  const reload = useCallback(() => {
    dynamicImportManager.clearCache(componentName)
    loadComponent()
  }, [componentName, loadComponent])

  return {
    component,
    loading,
    error,
    load: loadComponent,
    preload: preloadComponent,
    reload,
    isLoaded: !!component
  }
}

/**
 * 使用懒加载组件的Hook
 * @param {Function} importFunction - 导入函数
 * @param {Object} options - 配置选项
 * @returns {React.Component}
 */
export function useLazyComponent(importFunction, options = {}) {
  const [lazyComponent, setLazyComponent] = useState(null)

  useEffect(() => {
    const component = dynamicImportManager.createLazyComponent(
      importFunction,
      options
    )
    setLazyComponent(() => component)
  }, [importFunction, options])

  return lazyComponent
}

/**
 * 使用批量预加载的Hook
 * @param {Array} components - 组件配置数组
 * @param {Object} options - 配置选项
 * @returns {Object}
 */
export function useBatchPreload(components, options = {}) {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [progress, setProgress] = useState(0)

  const startPreload = useCallback(async () => {
    setLoading(true)
    setCompleted(false)
    setProgress(0)

    try {
      let loadedCount = 0
      const total = components.length

      // 创建带进度跟踪的组件配置
      const componentsWithProgress = components.map(comp => ({
        ...comp,
        options: {
          ...comp.options,
          onLoad: () => {
            loadedCount++
            setProgress((loadedCount / total) * 100)
          }
        }
      }))

      await dynamicImportManager.batchPreload(componentsWithProgress, options)
      
      setCompleted(true)
    } catch (error) {
      console.error('Batch preload failed:', error)
    } finally {
      setLoading(false)
    }
  }, [components, options])

  return {
    loading,
    completed,
    progress,
    startPreload
  }
}

/**
 * 使用智能预加载的Hook
 * @param {Object} options - 配置选项
 */
export function useSmartPreload(options = {}) {
  useEffect(() => {
    dynamicImportManager.enableSmartPreload(options)
  }, [options])

  const addToQueue = useCallback((name, importFunction, componentOptions = {}) => {
    dynamicImportManager.addToPreloadQueue(name, importFunction, componentOptions)
  }, [])

  const getStats = useCallback(() => {
    return dynamicImportManager.getStats()
  }, [])

  return {
    addToQueue,
    getStats
  }
}

/**
 * 使用路由级代码分割的Hook
 * @param {Object} routes - 路由配置
 * @param {Object} options - 配置选项
 * @returns {Object}
 */
export function useRouteCodeSplitting(routes, options = {}) {
  const [loadedRoutes, setLoadedRoutes] = useState(new Set())
  const [currentRoute, setCurrentRoute] = useState(null)

  const preloadRoute = useCallback(async (routeName) => {
    const route = routes[routeName]
    if (!route || loadedRoutes.has(routeName)) return

    try {
      await dynamicImportManager.preloadComponent(
        `route-${routeName}`,
        route.component,
        options
      )
      
      setLoadedRoutes(prev => new Set([...prev, routeName]))
    } catch (error) {
      console.error(`Failed to preload route ${routeName}:`, error)
    }
  }, [routes, loadedRoutes, options])

  const loadRoute = useCallback(async (routeName) => {
    const route = routes[routeName]
    if (!route) return null

    try {
      const component = await dynamicImportManager.loadComponent(
        `route-${routeName}`,
        route.component,
        options
      )
      
      setCurrentRoute({ name: routeName, component })
      setLoadedRoutes(prev => new Set([...prev, routeName]))
      
      return component
    } catch (error) {
      console.error(`Failed to load route ${routeName}:`, error)
      return null
    }
  }, [routes, options])

  // 预加载相邻路由
  const preloadAdjacentRoutes = useCallback((currentRouteName) => {
    const routeNames = Object.keys(routes)
    const currentIndex = routeNames.indexOf(currentRouteName)
    
    if (currentIndex > 0) {
      preloadRoute(routeNames[currentIndex - 1])
    }
    if (currentIndex < routeNames.length - 1) {
      preloadRoute(routeNames[currentIndex + 1])
    }
  }, [routes, preloadRoute])

  return {
    loadedRoutes: Array.from(loadedRoutes),
    currentRoute,
    preloadRoute,
    loadRoute,
    preloadAdjacentRoutes
  }
}