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

// 从嵌套对象中获取值 (支持 dot notation)
function getValueByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === undefined || current === null) return undefined

    if (/^\d+$/.test(key)) {
      if (!Array.isArray(current)) return undefined
      current = current[parseInt(key, 10)]
      continue
    }

    if (typeof current !== 'object') return undefined
    current = (current as JsonMap)[key]
  }
  return current
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ [key: string]: string }> }
) {
  const startTime = Date.now()

  try {
    // 验证 API Key
    const authError = await verifyProxyAuth(request)
    if (authError) {
      console.warn(`[GenerateContent] Auth failed: ${authError.error}`)
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }

    const { model } = await context.params
    const body = await request.json()

    console.info(`[GenerateContent] Request received for model: ${model}`)

    // 根据 model 查找应用
    const app = await prisma.application.findFirst({
      where: {
        modelName: model,
        isActive: true,
      },
    })

    if (!app) {
      console.warn(`[GenerateContent] Model not found: ${model}`)
      return NextResponse.json(
        { error: `Model '${model}' not found` },
        { status: 404 }
      )
    }

    console.info(`[GenerateContent] App found: ${app.name} (${app.id})`)

    // 获取映射规则和节点 ID
    let mappings: Record<string, string> = {}
    let nodeIds: BizyAirNodeConfig = { LoadImage: [], PromptNode: [], TTSNode: [] }
    try {
      mappings = JSON.parse(app.mappings || '{}')
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

    // 转换 Gemini 参数到 BizyAir input_values
    const inputValues: JsonMap = {}

    // 处理用户定义的映射
    for (const [sourcePath, targetPath] of Object.entries(resolvedMappings)) {
      const value = getValueByPath(body, sourcePath)
      if (value !== undefined && value !== null) {
        inputValues[targetPath] = value
      }
    }

    // 构建 BizyAir 请求
    const bizyairRequest = {
      web_app_id: Number(app.webAppId),
      suppress_preview_output: false,
      input_values: inputValues,
    }

    console.info(`[GenerateContent] Forwarding to BizyAir: web_app_id=${app.webAppId}`)
    console.debug(`[GenerateContent] BizyAir request body:`, JSON.stringify(bizyairRequest))

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
    const duration = Date.now() - startTime

    console.info(`[GenerateContent] BizyAir response received in ${duration}ms, status=${result.status || result.code}`)

    // 返回 Gemini 格式响应
    if (result.code === 0 || result.success || result.status === 'Success') {
      return NextResponse.json({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify(result.data || result) }
              ]
            },
            finishReason: 'STOP'
          }
        ]
      })
    } else {
      console.log('=== BizyAir Error ===')
      console.log('Message:', result.message)
      console.log('Code:', result.code)
      console.log('Full response:', result)
      return NextResponse.json(
        {
          error: {
            message: result.message || 'BizyAir API error',
            code: result.code,
            fullResponse: result,
          },
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Gemini proxy error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', type: 'server_error', details: String(error) } },
      { status: 500 }
    )
  }
}
