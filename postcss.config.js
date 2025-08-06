module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // CSS压缩 - 仅在生产环境启用
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          // 启用所有安全的优化
          discardComments: {
            removeAll: true
          },
          // 压缩颜色值
          colormin: true,
          // 合并相同的规则
          mergeRules: true,
          // 移除重复的规则
          discardDuplicates: true,
          // 压缩字体权重
          minifyFontValues: true,
          // 压缩选择器
          minifySelectors: true,
          // 标准化显示值
          normalizeDisplayValues: true,
          // 标准化位置值
          normalizePositions: true,
          // 标准化重复样式
          normalizeRepeatStyle: true,
          // 标准化字符串
          normalizeString: true,
          // 标准化时间值
          normalizeTimingFunctions: true,
          // 标准化Unicode
          normalizeUnicode: true,
          // 标准化URL
          normalizeUrl: true,
          // 标准化空白
          normalizeWhitespace: true,
          // 排序媒体查询
          sortMediaQueries: true,
          // 唯一选择器
          uniqueSelectors: true
        }]
      }
    })
  }
}
