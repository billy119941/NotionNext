import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'
import { withErrorHandler, ValidationError } from '@/lib/utils/apiErrorHandler'

/**
 * 接受邮件订阅
 * @param {*} req
 * @param {*} res
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: '方法不被允许' })
  }

  const { email, firstName, lastName } = req.body
  
  // 验证邮箱格式
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('请提供有效的邮箱地址')
  }
  
  const response = await subscribeToMailchimpApi({ 
    email, 
    first_name: firstName, 
    last_name: lastName 
  })
  
  const data = await response.json()
  console.log('Subscription data:', data)
  
  res.status(200).json({ 
    status: 'success', 
    message: 'Subscription successful!' 
  })
}

export default withErrorHandler(handler)
