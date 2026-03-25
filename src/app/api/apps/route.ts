import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apps = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // 隐藏 API Key
    const appsWithoutKey = apps.map((app) => ({
      ...app,
      apiKey: app.apiKey ? '********' : '',
    }))

    return NextResponse.json(appsWithoutKey)
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, webAppId, apiKey, modelName, isActive, mappings, nodeIds } = body

    if (!name || !webAppId || !apiKey || !modelName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 检查 modelName 是否已存在
    const existing = await prisma.application.findUnique({
      where: { modelName },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Model name already exists' },
        { status: 400 }
      )
    }

    const app = await prisma.application.create({
      data: {
        name,
        description,
        webAppId,
        apiKey,
        modelName,
        isActive: isActive ?? true,
        mappings: mappings ? JSON.stringify(mappings) : '{}',
        nodeIds: nodeIds ? JSON.stringify(nodeIds) : '{}',
      },
    })

    return NextResponse.json({
      ...app,
      apiKey: '********',
    })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
