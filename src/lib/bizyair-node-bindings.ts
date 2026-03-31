export interface BizyAirNodeConfig {
  LoadImage: string[]
  PromptNode: string[]
  TTSNode: string[]
  bindings?: {
    loadImages?: string[]
    prompt?: Record<string, string>
    tts?: Record<string, string>
  }
}

type InputValuesMap = Record<string, unknown>

export const EMPTY_NODE_CONFIG: BizyAirNodeConfig = {
  LoadImage: [],
  PromptNode: [],
  TTSNode: [],
  bindings: {
    loadImages: [],
    prompt: {},
    tts: {},
  },
}

function createEmptyNodeConfig(): BizyAirNodeConfig {
  return {
    LoadImage: [],
    PromptNode: [],
    TTSNode: [],
    bindings: {
      loadImages: [],
      prompt: {},
      tts: {},
    },
  }
}

function getFieldName(nodeName: string) {
  const dotIndex = nodeName.indexOf('.')
  if (dotIndex === -1 || dotIndex === nodeName.length - 1) {
    return ''
  }

  return nodeName.slice(dotIndex + 1)
}

export function extractNodeBindings(inputValues: InputValuesMap): {
  nodeConfig: BizyAirNodeConfig
  nodeTypes: Record<string, string>
} {
  const nodeConfig = createEmptyNodeConfig()
  const nodeTypes: Record<string, string> = {}
  const loadImageKeysById: Record<string, string> = {}
  const promptFieldsById: Record<string, Record<string, string>> = {}
  const ttsFieldsById: Record<string, Record<string, string>> = {}

  for (const fullKey of Object.keys(inputValues)) {
    const match = fullKey.match(/^(\d+):(.+)$/)
    if (!match) continue

    const [, nodeId, nodeName] = match
    const fieldName = getFieldName(nodeName)

    if (nodeName === 'LoadImage.image' || nodeName.startsWith('LoadImage.')) {
      if (!nodeConfig.LoadImage.includes(nodeId)) {
        nodeConfig.LoadImage.push(nodeId)
      }
      nodeTypes[nodeId] = 'LoadImage'

      if (nodeName === 'LoadImage.image' || !loadImageKeysById[nodeId]) {
        loadImageKeysById[nodeId] = fullKey
      }
      continue
    }

    if (nodeName.includes('NanoBanana') || fieldName === 'prompt') {
      if (!nodeConfig.PromptNode.includes(nodeId)) {
        nodeConfig.PromptNode.push(nodeId)
      }
      nodeTypes[nodeId] = 'PromptNode'

      if (!promptFieldsById[nodeId]) {
        promptFieldsById[nodeId] = {}
      }
      if (fieldName) {
        promptFieldsById[nodeId][fieldName] = fullKey
      }
      continue
    }

    if (nodeName.includes('indexTTS') || nodeName.includes('TTSGenerate')) {
      if (!nodeConfig.TTSNode.includes(nodeId)) {
        nodeConfig.TTSNode.push(nodeId)
      }
      nodeTypes[nodeId] = 'TTSNode'

      if (!ttsFieldsById[nodeId]) {
        ttsFieldsById[nodeId] = {}
      }
      if (fieldName) {
        ttsFieldsById[nodeId][fieldName] = fullKey
      }
    }
  }

  nodeConfig.LoadImage.sort((a, b) => parseInt(a) - parseInt(b))
  nodeConfig.PromptNode.sort((a, b) => parseInt(a) - parseInt(b))
  nodeConfig.TTSNode.sort((a, b) => parseInt(a) - parseInt(b))

  nodeConfig.bindings = {
    loadImages: nodeConfig.LoadImage
      .map((nodeId) => loadImageKeysById[nodeId])
      .filter((value): value is string => Boolean(value)),
    prompt: nodeConfig.PromptNode[0] ? (promptFieldsById[nodeConfig.PromptNode[0]] ?? {}) : {},
    tts: nodeConfig.TTSNode[0] ? (ttsFieldsById[nodeConfig.TTSNode[0]] ?? {}) : {},
  }

  return { nodeConfig, nodeTypes }
}

export function normalizeNodeConfig(value: unknown): BizyAirNodeConfig {
  if (!value || typeof value !== 'object') {
    return createEmptyNodeConfig()
  }

  const record = value as Partial<BizyAirNodeConfig>

  return {
    LoadImage: Array.isArray(record.LoadImage) ? record.LoadImage.map(String) : [],
    PromptNode: Array.isArray(record.PromptNode) ? record.PromptNode.map(String) : [],
    TTSNode: Array.isArray(record.TTSNode) ? record.TTSNode.map(String) : [],
    bindings: {
      loadImages: Array.isArray(record.bindings?.loadImages)
        ? record.bindings.loadImages.map(String)
        : [],
      prompt: record.bindings?.prompt && typeof record.bindings.prompt === 'object'
        ? Object.fromEntries(
            Object.entries(record.bindings.prompt).map(([key, mappedValue]) => [key, String(mappedValue)])
          )
        : {},
      tts: record.bindings?.tts && typeof record.bindings.tts === 'object'
        ? Object.fromEntries(
            Object.entries(record.bindings.tts).map(([key, mappedValue]) => [key, String(mappedValue)])
          )
        : {},
    },
  }
}

export function replaceMappingPlaceholders(
  mapping: Record<string, string>,
  rawNodeConfig: unknown
): Record<string, string> {
  const nodeConfig = normalizeNodeConfig(rawNodeConfig)
  const result: Record<string, string> = {}

  for (const [source, target] of Object.entries(mapping)) {
    let replaced = target

    replaced = replaced.replace(/\{LoadImageField:(\d+)\}/g, (_, rawIndex) => {
      const index = Number(rawIndex) - 1
      return nodeConfig.bindings?.loadImages?.[index] ?? ''
    })

    replaced = replaced.replace(/\{PromptField:([a-zA-Z0-9_]+)\}/g, (_, fieldName) => {
      return nodeConfig.bindings?.prompt?.[fieldName] ?? ''
    })

    replaced = replaced.replace(/\{TTSField:([a-zA-Z0-9_]+)\}/g, (_, fieldName) => {
      return nodeConfig.bindings?.tts?.[fieldName] ?? ''
    })

    for (let i = 0; i < nodeConfig.LoadImage.length; i++) {
      const placeholder = `{LoadImage_${i + 1}}`
      if (replaced.includes(placeholder)) {
        replaced = replaced.replace(placeholder, nodeConfig.LoadImage[i])
      }
    }

    if (nodeConfig.PromptNode.length > 0) {
      replaced = replaced.replace('{PromptNode}', nodeConfig.PromptNode[0])
    }

    if (nodeConfig.TTSNode.length > 0) {
      replaced = replaced.replace('{TTSNode}', nodeConfig.TTSNode[0])
    }

    if (replaced) {
      result[source] = replaced
    }
  }

  return result
}
