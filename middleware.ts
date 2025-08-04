import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 添加错误处理头
  const response = NextResponse.next()
  
  // 设置错误处理头
  response.headers.set('X-Error-Handler', 'enabled')
  
  // 对于API路由添加额外的错误处理
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('X-API-Route', 'true')
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}