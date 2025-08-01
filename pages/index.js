import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPostBlocks } from '@/lib/db/getSiteData'
import { generateRobotsTxt } from '@/lib/robots.txt'
import { generateRss } from '@/lib/rss'
// import { generateSitemapXml } from '@/lib/sitemap.xml' // 已改为动态生成
import { DynamicLayout } from '@/themes/theme'
import { generateRedirectJson } from '@/lib/redirect'

/**
 * 首页布局
 * @param {*} props
 * @returns
 */
const Index = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutIndex' {...props} />
}

/**
 * SSG 获取数据
 * @returns
 */
export async function getStaticProps(req) {
  const { locale } = req
  const from = 'index'
  const props = await getGlobalData({ from, locale })
  const POST_PREVIEW_LINES = siteConfig(
    'POST_PREVIEW_LINES',
    12,
    props?.NOTION_CONFIG
  )
  props.posts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )

  // 处理分页
  if (siteConfig('POST_LIST_STYLE') === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (siteConfig('POST_LIST_STYLE') === 'page') {
    props.posts = props.posts?.slice(
      0,
      siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
    )
  }

  // 预览文章内容 - 在导出模式下完全禁用以避免错误
  if (!process.env.EXPORT && siteConfig('POST_LIST_PREVIEW', false, props?.NOTION_CONFIG) && props.posts && Array.isArray(props.posts)) {
    try {
      for (let index = 0; index < props.posts.length; index++) {
        const post = props.posts[index]
        if (post && post.password && post.password !== '') {
          continue
        }
        if (post && post.id) {
          post.blockMap = await getPostBlocks(post.id, 'slug', POST_PREVIEW_LINES)
        }
      }
    } catch (error) {
      console.warn('预览内容生成失败:', error)
    }
  }

  // 生成robotTxt - 添加错误处理
  try {
    generateRobotsTxt(props)
  } catch (error) {
    console.warn('生成 robots.txt 失败:', error)
  }
  
  // 生成Feed订阅 - 添加错误处理
  try {
    generateRss(props)
  } catch (error) {
    console.warn('生成 RSS 失败:', error)
  }
  
  // 生成sitemap - 已改为动态生成，注释掉静态生成
  // generateSitemapXml(props)
  
  // 生成重定向 JSON - 添加错误处理
  if (siteConfig('UUID_REDIRECT', false, props?.NOTION_CONFIG)) {
    try {
      generateRedirectJson(props)
    } catch (error) {
      console.warn('生成重定向 JSON 失败:', error)
    }
  }

  // 生成全文索引 - 仅在 yarn build 时执行 && process.env.npm_lifecycle_event === 'build'

  delete props.allPages

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Index
