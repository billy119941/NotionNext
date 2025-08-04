import { cleanCache } from '@/lib/cache/local_file_cache'
import { withErrorHandler } from '@/lib/utils/apiErrorHandler'

/**
 * 清理缓存
 * @param {*} req
 * @param {*} res
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: '方法不被允许' })
  }
  
  await cleanCache()
  res.status(200).json({ status: 'success', message: 'Clean cache successful!' })
}

export default withErrorHandler(handler)
