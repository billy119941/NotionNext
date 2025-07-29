/**
 * 轻量级懒加载组件
 * 减少初始包大小
 */

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

// 轻量级加载占位符
const LoadingPlaceholder = ({ height = '200px', className = '' }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ height }}
  >
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400 text-sm">加载中...</div>
    </div>
  </div>
)

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('组件加载错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">组件加载失败</p>
          <button 
            className="mt-2 text-red-600 underline text-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 可见性检测 Hook
const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [element, setElement] = useState(null)

  useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [element, options])

  return [setElement, isVisible]
}

// 懒加载容器组件
export const LazyContainer = ({ 
  children, 
  fallback = <LoadingPlaceholder />,
  height = '200px' 
}) => {
  const [ref, isVisible] = useIntersectionObserver()

  return (
    <div ref={ref} style={{ minHeight: height }}>
      <ErrorBoundary>
        <Suspense fallback={fallback}>
          {isVisible ? children : fallback}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

// 条件渲染组件
export const ConditionalRender = ({ condition, children, fallback = null }) => {
  if (!condition) return fallback
  return children
}

// 延迟加载组件
export const DelayedRender = ({ delay = 100, children }) => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return shouldRender ? children : null
}

// 客户端渲染组件
export const ClientOnly = ({ children, fallback = null }) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return fallback
  return children
}

// 轻量级动态组件工厂
export const createLazyComponent = (importFunc, options = {}) => {
  const {
    fallback = <LoadingPlaceholder />,
    errorFallback = <div>加载失败</div>,
    ssr = false
  } = options

  const DynamicComponent = dynamic(importFunc, {
    loading: () => fallback,
    ssr
  })

  return (props) => (
    <ErrorBoundary fallback={errorFallback}>
      <DynamicComponent {...props} />
    </ErrorBoundary>
  )
}

// 预制的懒加载组件
export const LazyComponents = {
  // 图片画廊
  ImageGallery: createLazyComponent(
    () => import('@/components/ImageGallery'),
    { ssr: false }
  ),
  
  // 代码编辑器
  CodeEditor: createLazyComponent(
    () => import('@/components/CodeEditor'),
    { ssr: false }
  ),
  
  // 图表组件
  Charts: createLazyComponent(
    () => import('@/components/Charts'),
    { ssr: false }
  ),
  
  // 评论系统
  Comments: createLazyComponent(
    () => import('@/components/Comments'),
    { ssr: false }
  )
}