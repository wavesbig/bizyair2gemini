import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appId, params } = body

    if (!appId || !params) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取应用
    const app = await prisma.application.findUnique({
      where: { id: appId },
    })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    if (!app.isActive) {
      return NextResponse.json({ error: 'App is inactive' }, { status: 400 })
    }

    // 获取映射规则
    let mappings: Record<string, string> = {}
    try {
      mappings = JSON.parse(app.mappings)
    } catch {
      mappings = {}
    }

    // 转换参数
    const inputValues: Record<string, any> = {}

    // 处理映射
    for (const [openaiKey, bizyairKey] of Object.entries(mappings)) {
      const bizyairKeyStr = String(bizyairKey)
      // 处理嵌套路径如 "messages.0.content"
      const keys = openaiKey.split('.')
      let value: any = params
      for (const k of keys) {
        value = value?.[k]
      }

      if (value !== undefined) {
        inputValues[bizyairKeyStr] = value
      } else if (!bizyairKeyStr.includes(':')) {
        // 默认值
        inputValues[bizyairKeyStr] = mappings[openaiKey]
      }
    }

    // 添加其他未映射的参数
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && !Object.keys(mappings).includes(key)) {
        inputValues[key] = value
      }
    }

    // 构建 BizyAir 请求
    const bizyairRequest = {
      web_app_id: Number(app.webAppId),
      suppress_preview_output: false,
      input_values: inputValues,
    }

    // 发送请求到 BizyAir
    const response = await fetch(
      'https://api.bizyair.cn/w/v1/webapp/task/openapi/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${app.apiKey}`,
        },
        body: JSON.stringify(bizyairRequest),
      }
    )

    // 尝试解析响应为 JSON
    const contentType = response.headers.get('content-type')
    let result: any

    try {
      if (contentType?.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        result = { error: 'Non-JSON response', text: text.slice(0, 500) }
      }
    } catch (parseError) {
      // 如果 JSON 解析失败，尝试获取原始文本
      const text = await response.text().catch(() => 'Unable to read response')
      result = { error: 'JSON parse error', text: text.slice(0, 500), status: response.status }
    }

    return NextResponse.json({
      request: bizyairRequest,
      response: result,
      status: response.status,
    })
  } catch (error) {
    console.error('Test request error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
