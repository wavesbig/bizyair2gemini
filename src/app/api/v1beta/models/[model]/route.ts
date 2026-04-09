import { NextRequest, NextResponse } from 'next/server'
import { POST as handleGenerateContent } from './generateContent/route'

function normalizeModelName(rawModel: string) {
  if (rawModel.endsWith(':generateContent')) {
    return rawModel.slice(0, -':generateContent'.length)
  }

  return rawModel
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ [key: string]: string }> }
) {
  const params = await context.params
  const model = params.model

  // Compatibility endpoint for Gemini SDK style:
  // /v1beta/models/{model}:generateContent
  if (!model.includes(':generateContent')) {
    return NextResponse.json(
      { error: 'Use /api/v1beta/models/{model}:generateContent or /api/v1beta/models/{model}/generateContent' },
      { status: 405 }
    )
  }

  const normalizedModel = normalizeModelName(model)

  return handleGenerateContent(request, {
    params: Promise.resolve({ model: normalizedModel }),
  })
}
