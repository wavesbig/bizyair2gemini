import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const app = await prisma.application.findUnique({
      where: { id },
    })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...app,
      apiKey: app.apiKey ? '********' : '',
    })
  } catch (error) {
    console.error('Error fetching app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, webAppId, apiKey, modelName, isActive, mappings, nodeIds } = body

    // 如果更新 modelName，检查是否已存在
    if (modelName) {
      const existing = await prisma.application.findFirst({
        where: {
          modelName,
          NOT: { id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Model name already exists' },
          { status: 400 }
        )
      }
    }

    // 构建更新数据
    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (webAppId) updateData.webAppId = webAppId
    if (apiKey && apiKey !== '********') updateData.apiKey = apiKey
    if (modelName) updateData.modelName = modelName
    if (isActive !== undefined) updateData.isActive = isActive
    if (mappings) updateData.mappings = JSON.stringify(mappings)
    if (nodeIds) updateData.nodeIds = JSON.stringify(nodeIds)

    const app = await prisma.application.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...app,
      apiKey: app.apiKey ? '********' : '',
    })
  } catch (error) {
    console.error('Error updating app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.application.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
