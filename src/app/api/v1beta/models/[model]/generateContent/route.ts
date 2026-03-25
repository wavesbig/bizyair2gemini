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

// 替换映射中的占位符为实际节点 ID
function replaceMappingPlaceholders(
  mapping: Record<string, string>,
  nodeIds: Record<string, string[]>
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [source, target] of Object.entries(mapping)) {
    let replaced = target

    // 替换 LoadImage_N 占位符
    for (let i = 0; i < (nodeIds.LoadImage?.length || 0); i++) {
      const placeholder = `{LoadImage_${i + 1}}`
      if (replaced.includes(placeholder)) {
        replaced = replaced.replace(placeholder, nodeIds.LoadImage[i])
      }
    }

    // 替换 PromptNode 占位符
    if (nodeIds.PromptNode?.length > 0) {
      replaced = replaced.replace('{PromptNode}', nodeIds.PromptNode[0])
    }

    // 替换 TTSNode 占位符
    if (nodeIds.TTSNode?.length > 0) {
      replaced = replaced.replace('{TTSNode}', nodeIds.TTSNode[0])
    }

    result[source] = replaced
  }

  return result
}

// 从嵌套对象中获取值 (支持 dot notation)
function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current === undefined || current === null) return undefined
    // 处理数组索引
    if (key === '0' || /^\d+$/.test(key)) {
      current = current[parseInt(key)]
    } else {
      current = current[key]
    }
  }
  return current
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ [key: string]: string }> }
) {
  try {
    // 验证 API Key
    const authError = await verifyProxyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }

    const { model } = await context.params
    const body = await request.json()

    // 根据 model 查找应用
    const app = await prisma.application.findFirst({
      where: {
        modelName: model,
        isActive: true,
      },
    })

    if (!app) {
      return NextResponse.json(
        { error: `Model '${model}' not found` },
        { status: 404 }
      )
    }

    // 获取映射规则和节点 ID
    let mappings: Record<string, string> = {}
    let nodeIds: Record<string, string[]> = {}
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
    const inputValues: Record<string, any> = {}

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

    // 发送请求到 BizyAir
    console.log('=== BizyAir Request ===')
    console.log('URL:', 'https://api.bizyair.cn/w/v1/webapp/task/openapi/create')
    console.log('Body:', JSON.stringify(bizyairRequest, null, 2))

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
    console.log('=== BizyAir Response ===')
    console.log(JSON.stringify(result, null, 2))

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
