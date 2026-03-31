// 预设模板 - 使用角色化占位符而不是写死 BizyAir 节点前缀
// {LoadImageField:N} -> 第 N 个真实 LoadImage.image 完整字段 key
// {PromptField:prompt} -> 导入配置里检测到的真实 Prompt 字段 key
// {TTSField:text} -> 导入配置里检测到的真实 TTS 字段 key

export const PRESET_TEMPLATES = {
  'nano-banana-image': {
    name: 'NanoBanana 单图生成',
    description: 'Gemini 图片生成 → NanoBanana（单图，无参考图）',
    mappings: {
      'contents.0.parts.0.text': '{PromptField:prompt}',
      'generationConfig.imageConfig.aspectRatio': '{PromptField:aspect_ratio}',
      'generationConfig.imageConfig.imageSize': '{PromptField:resolution}',
      'generationConfig.seed': '{PromptField:seed}',
      'generationConfig.temperature': '{PromptField:temperature}',
      'generationConfig.topP': '{PromptField:top_p}',
    },
  },
  'nano-banana-image-multi': {
    name: 'NanoBanana 多图生成',
    description: 'Gemini 图片生成 → NanoBanana（多参考图）',
    mappings: {
      // 图片节点按顺序映射
      'contents.0.parts.0.imageUrl': '{LoadImageField:1}',
      'contents.0.parts.1.imageUrl': '{LoadImageField:2}',
      'contents.0.parts.2.imageUrl': '{LoadImageField:3}',
      'contents.0.parts.3.imageUrl': '{LoadImageField:4}',
      'contents.0.parts.4.imageUrl': '{LoadImageField:5}',
      'contents.0.parts.5.imageUrl': '{LoadImageField:6}',
      'contents.0.parts.6.imageUrl': '{LoadImageField:7}',
      'contents.0.parts.7.imageUrl': '{LoadImageField:8}',
      'contents.0.parts.8.imageUrl': '{LoadImageField:9}',
      'contents.0.parts.9.imageUrl': '{LoadImageField:10}',
      'contents.0.parts.10.imageUrl': '{LoadImageField:11}',
      'contents.0.parts.11.imageUrl': '{LoadImageField:12}',
      'contents.0.parts.12.imageUrl': '{LoadImageField:13}',
      'contents.0.parts.13.imageUrl': '{LoadImageField:14}',
      // prompt 放在图片之后
      'contents.0.parts.14.text': '{PromptField:prompt}',
      // 配置参数
      'generationConfig.imageConfig.aspectRatio': '{PromptField:aspect_ratio}',
      'generationConfig.imageConfig.imageSize': '{PromptField:resolution}',
      'generationConfig.seed': '{PromptField:seed}',
      'generationConfig.temperature': '{PromptField:temperature}',
      'generationConfig.topP': '{PromptField:top_p}',
      'generationConfig.maxTokens': '{PromptField:max_tokens}',
      'generationConfig.inputCount': '{PromptField:inputcount}',
      'generationConfig.mode': '{PromptField:mode}',
    },
  },
  'nano-banana-tts': {
    name: 'NanoBanana TTS',
    description: 'Gemini TTS 请求 → IndexTTS',
    mappings: {
      'contents.0.parts.0.text': '{TTSField:text}',
      'generationConfig.temperature': '{TTSField:temperature}',
      'generationConfig.seed': '{TTSField:seed}',
    },
  },
  'custom': {
    name: '自定义映射',
    description: '从粘贴的代码自动解析映射关系',
    mappings: {},
  },
} as const

export type PresetTemplateKey = keyof typeof PRESET_TEMPLATES
