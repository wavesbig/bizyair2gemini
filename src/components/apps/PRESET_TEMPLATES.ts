// 预设模板 - 使用占位符 {LoadImage_N}, {PromptNode}, {TTSNode}
// 占位符会在请求时替换为实际节点 ID
// LoadImage_N: N 从 1 开始，按节点 ID 小到大排序

export const PRESET_TEMPLATES = {
  'nano-banana-image': {
    name: 'NanoBanana 单图生成',
    description: 'Gemini 图片生成 → NanoBanana（单图，无参考图）',
    mappings: {
      'contents.0.parts.0.text': '{PromptNode}:BizyAir_NanoBanana2.prompt',
      'generationConfig.imageConfig.aspectRatio': '{PromptNode}:BizyAir_NanoBanana2.aspect_ratio',
      'generationConfig.imageConfig.imageSize': '{PromptNode}:BizyAir_NanoBanana2.resolution',
      'generationConfig.seed': '{PromptNode}:BizyAir_NanoBanana2.seed',
      'generationConfig.temperature': '{PromptNode}:BizyAir_NanoBanana2.temperature',
      'generationConfig.topP': '{PromptNode}:BizyAir_NanoBanana2.top_p',
    },
  },
  'nano-banana-image-multi': {
    name: 'NanoBanana 多图生成',
    description: 'Gemini 图片生成 → NanoBanana（多参考图）',
    mappings: {
      // 图片节点按顺序映射 (parts.0 ~ parts.7)
      'contents.0.parts.0.imageUrl': '{LoadImage_1}:LoadImage.image',
      'contents.0.parts.1.imageUrl': '{LoadImage_2}:LoadImage.image',
      'contents.0.parts.2.imageUrl': '{LoadImage_3}:LoadImage.image',
      'contents.0.parts.3.imageUrl': '{LoadImage_4}:LoadImage.image',
      'contents.0.parts.4.imageUrl': '{LoadImage_5}:LoadImage.image',
      'contents.0.parts.5.imageUrl': '{LoadImage_6}:LoadImage.image',
      'contents.0.parts.6.imageUrl': '{LoadImage_7}:LoadImage.image',
      'contents.0.parts.7.imageUrl': '{LoadImage_8}:LoadImage.image',
      // prompt 放在图片之后
      'contents.0.parts.8.text': '{PromptNode}:BizyAir_NanoBanana2.prompt',
      // 配置参数
      'generationConfig.imageConfig.aspectRatio': '{PromptNode}:BizyAir_NanoBanana2.aspect_ratio',
      'generationConfig.imageConfig.imageSize': '{PromptNode}:BizyAir_NanoBanana2.resolution',
      'generationConfig.seed': '{PromptNode}:BizyAir_NanoBanana2.seed',
      'generationConfig.temperature': '{PromptNode}:BizyAir_NanoBanana2.temperature',
      'generationConfig.topP': '{PromptNode}:BizyAir_NanoBanana2.top_p',
      'generationConfig.maxTokens': '{PromptNode}:BizyAir_NanoBanana2.max_tokens',
      'generationConfig.inputCount': '{PromptNode}:BizyAir_NanoBanana2.inputcount',
      'generationConfig.mode': '{PromptNode}:BizyAir_NanoBanana2.mode',
    },
  },
  'nano-banana-tts': {
    name: 'NanoBanana TTS',
    description: 'Gemini TTS 请求 → IndexTTS',
    mappings: {
      'contents.0.parts.0.text': '{TTSNode}:easy indexTTSGenerate.text',
      'generationConfig.temperature': '{TTSNode}:easy indexTTSGenerate.temperature',
      'generationConfig.seed': '{TTSNode}:easy indexTTSGenerate.seed',
    },
  },
  'custom': {
    name: '自定义映射',
    description: '从粘贴的代码自动解析映射关系',
    mappings: {},
  },
} as const

export type PresetTemplateKey = keyof typeof PRESET_TEMPLATES

type InputValuesMap = Record<string, unknown>

// 从 input_values 中提取节点 ID，按类型分组
export function extractNodeIds(inputValues: InputValuesMap): {
  nodeIds: Record<string, string[]>
  nodeTypes: Record<string, string>
} {
  const nodeIds: Record<string, string[]> = {
    LoadImage: [],
    PromptNode: [],
    TTSNode: [],
  }
  const nodeTypes: Record<string, string> = {}

  for (const key of Object.keys(inputValues)) {
    const match = key.match(/^(\d+):(.+)$/)
    if (match) {
      const [, nodeId, nodeName] = match

      // 分类节点类型
      if (nodeName === 'LoadImage.image' || nodeName.startsWith('LoadImage.')) {
        if (!nodeIds.LoadImage.includes(nodeId)) {
          nodeIds.LoadImage.push(nodeId)
        }
        nodeTypes[nodeId] = 'LoadImage'
      } else if (nodeName.includes('NanoBanana2') || nodeName.includes('prompt')) {
        if (!nodeIds.PromptNode.includes(nodeId)) {
          nodeIds.PromptNode.push(nodeId)
        }
        nodeTypes[nodeId] = 'PromptNode'
      } else if (nodeName.includes('indexTTS') || nodeName.includes('TTSGenerate')) {
        if (!nodeIds.TTSNode.includes(nodeId)) {
          nodeIds.TTSNode.push(nodeId)
        }
        nodeTypes[nodeId] = 'TTSNode'
      }
    }
  }

  // 按 ID 数字排序
  nodeIds.LoadImage.sort((a, b) => parseInt(a) - parseInt(b))
  nodeIds.PromptNode.sort((a, b) => parseInt(a) - parseInt(b))
  nodeIds.TTSNode.sort((a, b) => parseInt(a) - parseInt(b))

  return { nodeIds, nodeTypes }
}
