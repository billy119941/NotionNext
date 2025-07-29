/**
 * 动态导入工具
 * 减少初始包大小，按需加载组件
 */

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// 创建带加载状态的动态组件
export const createDynamicComponent = (importFunc, options = {}) => {
  const {
    loading = () => <div className="animate-pulse bg-gray-200 h-20 rounded"></div>,
    ssr = false,
    ...dynamicOptions
  } = options

  return dynamic(importFunc, {
    loading,
    ssr,
    ...dynamicOptions
  })
}

// 常用的动态组件
export const DynamicComponents = {
  // 评论系统 - 只在需要时加载
  Comments: createDynamicComponent(
    () => import('@/components/Comments'),
    { ssr: false }
  ),
  
  // 搜索组件 - 只在搜索页面加载
  SearchComponent: createDynamicComponent(
    () => import('@/components/SearchComponent'),
    { ssr: false }
  ),
  
  // 图表组件 - 只在需要时加载
  Chart: createDynamicComponent(
    () => import('@/components/Chart'),
    { ssr: false }
  ),
  
  // 代码高亮 - 只在有代码块时加载
  CodeHighlight: createDynamicComponent(
    () => import('@/components/CodeHighlight'),
    { ssr: false }
  ),
  
  // 社交分享 - 只在需要时加载
  SocialShare: createDynamicComponent(
    () => import('@/components/SocialShare'),
    { ssr: false }
  ),
  
  // 音乐播放器 - 只在需要时加载
  MusicPlayer: createDynamicComponent(
    () => import('@/components/MusicPlayer'),
    { ssr: false }
  ),
  
  // 管理面板 - 只在管理页面加载
  AdminPanel: createDynamicComponent(
    () => import('@/components/AdminPanel'),
    { ssr: false }
  )
}

// 路由级别的代码分割
export const DynamicPages = {
  // 仪表板页面
  Dashboard: createDynamicComponent(
    () => import('@/pages/dashboard'),
    { ssr: false }
  ),
  
  // 搜索页面
  Search: createDynamicComponent(
    () => import('@/pages/search'),
    { ssr: true }
  ),
  
  // 归档页面
  Archive: createDynamicComponent(
    () => import('@/pages/archive'),
    { ssr: true }
  )
}

// 第三方库的动态导入
export const DynamicLibraries = {
  // 日期处理库
  dayjs: () => import('dayjs'),
  
  // 图表库
  chart: () => import('chart.js'),
  
  // 动画库
  lottie: () => import('lottie-web'),
  
  // 代码编辑器
  monaco: () => import('@monaco-editor/react'),
  
  // PDF 查看器
  pdfViewer: () => import('react-pdf')
}

// 条件加载工具
export const conditionalImport = async (condition, importFunc) => {
  if (condition) {
    return await importFunc()
  }
  return null
}

// 预加载关键组件
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // 在空闲时间预加载可能需要的组件
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // 预加载搜索组件
        DynamicComponents.SearchComponent.preload?.()
        // 预加载评论组件
        DynamicComponents.Comments.preload?.()
      })
    }
  }
}

// 基于路由的预加载
export const preloadByRoute = (pathname) => {
  switch (pathname) {
    case '/search':
      DynamicComponents.SearchComponent.preload?.()
      break
    case '/dashboard':
      DynamicPages.Dashboard.preload?.()
      break
    case '/archive':
      DynamicPages.Archive.preload?.()
      break
    default:
      break
  }
}