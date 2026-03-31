import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth'

// 公开路径
const publicPaths = ['/login', '/api/auth/login', '/api/v1', '/api/v1beta']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公开路径直接放行
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // API 路由
  if (pathname.startsWith('/api/')) {
    // 排除认证相关的 API
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/v1/')) {
      return NextResponse.next()
    }
    // 其他 API 需要登录
    const token = request.cookies.get('session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const session = await decrypt(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 页面路由 - 需要登录
  const token = request.cookies.get('session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await decrypt(token)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
