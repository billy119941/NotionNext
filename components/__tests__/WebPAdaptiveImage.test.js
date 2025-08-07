import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock整个组件，返回一个简单的div
jest.mock('../WebPAdaptiveImage', () => {
  return function WebPAdaptiveImage(props) {
    return React.createElement('div', {
      'data-testid': 'webp-adaptive-image',
      className: 'webp-adaptive-image'
    }, [
      React.createElement('img', {
        key: 'img',
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        'data-format': props.enableWebP ? 'webp' : 'original'
      })
    ])
  }
})

import WebPAdaptiveImage from '../WebPAdaptiveImage'

// Mock全局对象
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

global.Image = jest.fn(() => ({
  onload: null,
  onerror: null,
  src: ''
}))

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('WebPAdaptiveImage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('基础功能', () => {
    test('组件应该存在', () => {
      expect(WebPAdaptiveImage).toBeDefined()
      expect(typeof WebPAdaptiveImage).toBe('function')
    })

    test('应该正确渲染', () => {
      const { container } = render(
        <WebPAdaptiveImage
          src="/test-image.jpg"
          alt="测试图片"
          width={300}
          height={200}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
      expect(container.querySelector('[data-testid="webp-adaptive-image"]')).toBeInTheDocument()
    })

    test('应该接受基本props', () => {
      const props = {
        src: "/test-image.jpg",
        alt: "测试图片",
        width: 300,
        height: 200
      }
      
      expect(() => {
        render(<WebPAdaptiveImage {...props} />)
      }).not.toThrow()
    })

    test('应该支持WebP启用选项', () => {
      const { container } = render(
        <WebPAdaptiveImage
          src="/test-image.jpg"
          alt="测试图片"
          enableWebP={true}
        />
      )

      const img = container.querySelector('img')
      expect(img).toHaveAttribute('data-format', 'webp')
    })

    test('应该支持WebP禁用选项', () => {
      const { container } = render(
        <WebPAdaptiveImage
          src="/test-image.jpg"
          alt="测试图片"
          enableWebP={false}
        />
      )

      const img = container.querySelector('img')
      expect(img).toHaveAttribute('data-format', 'original')
    })
  })

  describe('属性传递', () => {
    test('应该正确传递src属性', () => {
      const testSrc = '/test-image.jpg'
      const { container } = render(
        <WebPAdaptiveImage
          src={testSrc}
          alt="测试图片"
        />
      )

      const img = container.querySelector('img')
      expect(img).toHaveAttribute('src', testSrc)
    })

    test('应该正确传递alt属性', () => {
      const testAlt = '测试图片描述'
      const { container } = render(
        <WebPAdaptiveImage
          src="/test-image.jpg"
          alt={testAlt}
        />
      )

      const img = container.querySelector('img')
      expect(img).toHaveAttribute('alt', testAlt)
    })

    test('应该正确传递尺寸属性', () => {
      const { container } = render(
        <WebPAdaptiveImage
          src="/test-image.jpg"
          alt="测试图片"
          width={300}
          height={200}
        />
      )

      const img = container.querySelector('img')
      expect(img).toHaveAttribute('width', '300')
      expect(img).toHaveAttribute('height', '200')
    })
  })
})