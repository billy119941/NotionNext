import fs from 'fs'

export function generateRedirectJson({ allPages }) {
  // 在 Vercel 生产环境中跳过文件写入操作
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.log('Skipping redirect.json generation in production environment')
    return
  }
  
  // 添加安全检查
  if (!allPages || !Array.isArray(allPages)) {
    console.warn('generateRedirectJson: allPages is not a valid array')
    return
  }
  
  let uuidSlugMap = {}
  allPages.forEach(page => {
    if (page && page.type === 'Post' && page.status === 'Published') {
      uuidSlugMap[page.id] = page.slug
    }
  })
  
  try {
    fs.writeFileSync('./public/redirect.json', JSON.stringify(uuidSlugMap))
    console.log('✅ Redirect.json generated successfully')
  } catch (error) {
    console.warn('无法写入文件', error)
    // 不抛出错误，避免影响页面渲染
  }
}
