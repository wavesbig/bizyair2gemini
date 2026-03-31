import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BizyAirNodeConfig, replaceMappingPlaceholders } from '@/lib/bizyair-node-bindings'

type JsonMap = Record<string, unknown>

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

export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const authError = await verifyProxyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }

    const body = await request.json()
    const { model, messages, temperature, max_tokens, top_p, seed, ...extraParams } = body

    if (!model) {
      return NextResponse.json(
        { error: 'Missing required parameter: model' },
        { status: 400 }
      )
    }

    // 根据 model 查找应用
    const app = await prisma.application.findUnique({
      where: { modelName: model },
    })

    if (!app) {
      return NextResponse.json(
        { error: `Model '${model}' not found` },
        { status: 404 }
      )
    }

    if (!app.isActive) {
      return NextResponse.json(
        { error: `Model '${model}' is inactive` },
        { status: 403 }
      )
    }

    // 获取映射规则和节点 ID
    let mappings: Record<string, string> = {}
    let nodeIds: BizyAirNodeConfig = { LoadImage: [], PromptNode: [], TTSNode: [] }
    try {
      mappings = JSON.parse(app.mappings)
    } catch {
      mappings = {}
    }
    try {
      nodeIds = JSON.parse(app.nodeIds || '{}')
    } catch {
      nodeIds = {}
    }

    // 替换映射中的占位符
    const resolvedMappings = replaceMappingPlaceholders(mappings, nodeIds)

    // 转换参数
    const inputValues: JsonMap = {}

    // 处理标准化字段映射
    const normalizedParams = {
      messages,
      temperature,
      max_tokens,
      top_p,
      seed,
      ...extraParams,
    }

    for (const [openaiKey, bizyairKey] of Object.entries(resolvedMappings)) {
      // 处理嵌套路径如 "messages.0.content"
      const keys = openaiKey.split('.')
      let value: unknown = normalizedParams

      for (const k of keys) {
        if (value === undefined || value === null || typeof value !== 'object') {
          value = undefined
          break
        }

        if (/^\d+$/.test(k)) {
          if (!Array.isArray(value)) {
            value = undefined
            break
          }
          value = value[parseInt(k, 10)]
          continue
        }

        value = (value as JsonMap)[k]
      }

      if (value !== undefined) {
        inputValues[bizyairKey] = value
      } else if (!bizyairKey.includes(':') || openaiKey.startsWith(bizyairKey.split(':')[0])) {
        // 默认值处理
        const defaultValue = mappings[openaiKey]
        if (typeof defaultValue === 'string' && !defaultValue.includes(':')) {
          inputValues[bizyairKey] = defaultValue
        } else if (typeof defaultValue === 'boolean' || typeof defaultValue === 'number') {
          inputValues[bizyairKey] = defaultValue
        }
      }
    }

    // 添加其他未映射的参数
    for (const [key, value] of Object.entries(normalizedParams)) {
      if (value !== undefined && !Object.keys(mappings).includes(key)) {
        // 尝试自动映射 camelCase 到 BizyAir 格式
        const autoKey = `0:easy ${key.charAt(0).toUpperCase() + key.slice(1)}`
        inputValues[autoKey] = value
      }
    }

    // 构建 BizyAir 请求
    const bizyairRequest = {
      web_app_id: app.webAppId,
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

    const result = await response.json()

    // 转换为 OpenAI 格式响应
    if (result.code === 0 || result.success) {
      return NextResponse.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(result.data || result),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      })
    } else {
      return NextResponse.json(
        {
          error: {
            message: result.message || 'BizyAir API error',
            type: 'api_error',
            code: result.code,
          },
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', type: 'server_error' } },
      { status: 500 }
    )
  }
}
