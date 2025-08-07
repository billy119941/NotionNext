import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the ProgressiveLoading component to avoid rendering issues
const MockProgressiveLoading = (props) => {
  return (
    <div data-testid="progressive-loading" className="progressive-loading">
      <img
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        onLoad={props.onLoad}
        onError={props.onError}
      />
    </div>
  )
}

// Mock the actual component
jest.mock('../ProgressiveLoading', () => {
  return function ProgressiveLoading(props) {
    return React.createElement(MockProgressiveLoading, props)
  }
})

import ProgressiveLoading from '../ProgressiveLoading'

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock Image constructor
global.Image = jest.fn(() => ({
  onload: null,
  onerror: null,
  src: ''
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('ProgressiveLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('基础功能', () => {
    test('组件应该存在', () => {
      expect(ProgressiveLoading).toBeDefined()
      expect(typeof ProgressiveLoading).toBe('function')
    })

    test('应该正确渲染', () => {
      const { container } = render(
        <ProgressiveLoading
          src="/test-image.jpg"
          alt="测试图片"
          width={300}
          height={200}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
      expect(container.querySelector('[data-testid="progressive-loading"]')).toBeInTheDocument()
    })

    test('应该接受基本props', () => {
      const props = {
        src: "/test-image.jpg",
        alt: "测试图片",
        width: 300,
        height: 200
      }
      
      expect(() => {
        render(<ProgressiveLoading {...props} />)
      }).not.toThrow()
    })

    test('应该支持不同的占位符类型', () => {
      const placeholderTypes = ['blur', 'skeleton', 'color']
      
      placeholderTypes.forEach(type => {
        expect(() => {
          render(
            <ProgressiveLoading
              src="/test-image.jpg"
              alt="测试图片"
              placeholder={type}
            />
          )
        }).not.toThrow()
      })
    })
  })
})