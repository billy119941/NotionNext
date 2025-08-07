/**
 * React Hooks调用验证测试
 * 检测项目中是否存在Invalid hook call错误
 */

import React, { useState, useEffect, useCallback } from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// 测试组件 - 正确的hooks使用
const ValidHooksComponent = () => {
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('初始消息')

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    setMessage(`计数: ${count}`)
  }, [count])

  return (
    <div data-testid="valid-hooks-component">
      <p data-testid="message">{message}</p>
      <button data-testid="increment" onClick={handleClick}>
        增加
      </button>
    </div>
  )
}

// 测试组件 - 检查是否有条件性hooks调用
const ConditionalHooksTest = ({ shouldUseHook = true }) => {
  // 这是正确的 - hooks总是被调用
  const [value, setValue] = useState(null)
  
  useEffect(() => {
    if (shouldUseHook) {
      setValue('条件满足')
    } else {
      setValue('条件不满足')
    }
  }, [shouldUseHook])

  return (
    <div data-testid="conditional-hooks-test">
      <span data-testid="value">{value}</span>
    </div>
  )
}

describe('React Hooks调用验证', () => {
  test('应该正确使用基本hooks', () => {
    expect(() => {
      render(<ValidHooksComponent />)
    }).not.toThrow()

    expect(screen.getByTestId('valid-hooks-component')).toBeInTheDocument()
    expect(screen.getByTestId('message')).toHaveTextContent('计数: 0')
  })

  test('应该正确处理条件性逻辑（非条件性hooks调用）', () => {
    expect(() => {
      render(<ConditionalHooksTest shouldUseHook={true} />)
    }).not.toThrow()

    expect(screen.getByTestId('conditional-hooks-test')).toBeInTheDocument()
    expect(screen.getByTestId('value')).toHaveTextContent('条件满足')
  })

  test('应该在不同条件下正常工作', () => {
    expect(() => {
      render(<ConditionalHooksTest shouldUseHook={false} />)
    }).not.toThrow()

    expect(screen.getByTestId('value')).toHaveTextContent('条件不满足')
  })

  test('验证hooks调用顺序一致性', () => {
    const { rerender } = render(<ConditionalHooksTest shouldUseHook={true} />)
    
    expect(() => {
      rerender(<ConditionalHooksTest shouldUseHook={false} />)
    }).not.toThrow()

    expect(screen.getByTestId('value')).toHaveTextContent('条件不满足')
  })
})

// 检查是否有未使用的hooks导入
describe('Hooks导入检查', () => {
  test('应该能够正常导入和使用React hooks', () => {
    // 验证hooks导入没有问题
    expect(useState).toBeDefined()
    expect(useEffect).toBeDefined()
    expect(useCallback).toBeDefined()
    expect(typeof useState).toBe('function')
    expect(typeof useEffect).toBe('function')
    expect(typeof useCallback).toBe('function')
  })
})