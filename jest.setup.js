import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.elements = new Set()
  }

  observe(element) {
    this.elements.add(element)
    // 模拟元素立即进入视口
    setTimeout(() => {
      this.callback([
        {
          target: element,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        },
      ])
    }, 100)
  }

  unobserve(element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }

  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
})

// Mock Image constructor
global.Image = class {
  constructor() {
    this.onload = null
    this.onerror = null
    this.src = ''
    this.alt = ''
    this.width = 0
    this.height = 0
  }

  set src(value) {
    this._src = value
    // 模拟图片加载成功
    setTimeout(() => {
      if (this.onload) {
        this.width = 100
        this.height = 100
        this.onload()
      }
    }, 50)
  }

  get src() {
    return this._src
  }
}

// Mock sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage,
})

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
})

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 50, // 50MB
    jsHeapSizeLimit: 1024 * 1024 * 100, // 100MB
  },
})

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  mockStorage.getItem.mockClear()
  mockStorage.setItem.mockClear()
  mockStorage.removeItem.mockClear()
  mockStorage.clear.mockClear()
})