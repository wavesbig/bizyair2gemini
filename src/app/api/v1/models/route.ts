import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 验证代理 API Key
async function verifyProxyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Missing authorization header', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  if (!settings?.apiKey) {
    return { error: 'Proxy API key not configured', status: 500 }
  }

  if (token !== settings.apiKey) {
    return { error: 'Invalid API key', status: 401 }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    // 验证 API Key
    const authError = await verifyProxyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }

    const apps = await prisma.application.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        modelName: true,
        description: true,
      },
    })

    const models = apps.map((app) => ({
      id: app.modelName,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'bizyair',
      permission: [],
      root: app.modelName,
      parent: null,
    }))

    return NextResponse.json({
      object: 'list',
      data: models,
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
