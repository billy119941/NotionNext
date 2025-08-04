import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

function Error({ statusCode, hasGetInitialPropsRun, err }) {
  const router = useRouter()
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // 记录错误到控制台
    console.error('Page Error:', {
      statusCode,
      hasGetInitialPropsRun,
      error: err?.message,
      url: window.location.href,
      timestamp: new Date().toISOString()
    })

    // 对于5xx错误，自动重试一次
    if (statusCode >= 500 && statusCode < 600 && retryCount === 0) {
      console.log(`${statusCode} error detected, attempting auto-retry...`)
      setRetryCount(1)
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }

    // 如果是419错误，尝试刷新页面
    if (statusCode === 419) {
      console.log('419 error detected, attempting to refresh...')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }, [statusCode, retryCount])

  const handleRetry = () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const getErrorMessage = (code) => {
    switch (code) {
      case 400:
        return '请求参数错误'
      case 401:
        return '未授权访问'
      case 403:
        return '禁止访问'
      case 404:
        return '页面未找到'
      case 419:
        return '页面已过期'
      case 500:
        return '服务器内部错误'
      case 502:
        return '网关错误'
      case 503:
        return '服务暂时不可用'
      case 504:
        return '网关超时'
      default:
        return statusCode ? `服务器发生了 ${statusCode} 错误` : '客户端发生了错误'
    }
  }

  const getErrorDescription = (code) => {
    switch (code) {
      case 419:
        return '页面数据已过期，正在尝试刷新...'
      case 500:
      case 502:
      case 503:
      case 504:
        return '服务器暂时遇到问题，我们正在努力修复。请稍后再试。'
      case 404:
        return '您访问的页面不存在，可能已被删除或移动。'
      default:
        return '遇到了一些技术问题，请稍后再试。'
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '40px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#dc3545',
          marginBottom: '20px',
          fontWeight: '600'
        }}>
          {statusCode || '错误'}
        </h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          color: '#495057',
          marginBottom: '15px',
          fontWeight: '500'
        }}>
          {getErrorMessage(statusCode)}
        </h2>
        
        <p style={{
          color: '#6c757d',
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          {getErrorDescription(statusCode)}
        </p>
        
        {statusCode === 419 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #0070f3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {statusCode !== 419 && (
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                padding: '12px 24px',
                backgroundColor: isRetrying ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
            >
              {isRetrying ? '重试中...' : '重试'}
            </button>
          )}
          
          <button 
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            返回首页
          </button>
          
          <button 
            onClick={() => router.back()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            返回上页
          </button>
        </div>
        
        {retryCount > 0 && (
          <p style={{
            marginTop: '20px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            已重试 {retryCount} 次
          </p>
        )}
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  
  // 记录服务端错误
  if (err) {
    console.error('Server Error:', {
      statusCode,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    })
  }
  
  return { statusCode }
}

export default Error