import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasApiKey: !!settings.apiKey,
      apiKey: settings.apiKey || null,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey } = body

    if (apiKey !== undefined) {
      await prisma.settings.update({
        where: { id: 'default' },
        data: { apiKey },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 生成随机 API Key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 生成 sk- 开头的随机 Key (48位十六进制)
    const array = new Uint8Array(24)
    crypto.getRandomValues(array)
    const newApiKey = `sk-${Array.from(array, b => b.toString(16).padStart(2, '0')).join('')}`

    await prisma.settings.update({
      where: { id: 'default' },
      data: { apiKey: newApiKey },
    })

    return NextResponse.json({ apiKey: newApiKey })
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
