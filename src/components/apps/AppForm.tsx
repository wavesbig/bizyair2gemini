'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import CodeEditor from '@uiw/react-textarea-code-editor'
import { Key, Check, Upload, FileCode } from 'lucide-react'
import { App } from './AppCard'
import { PRESET_TEMPLATES } from './PRESET_TEMPLATES'
import { BizyAirNodeConfig, EMPTY_NODE_CONFIG, extractNodeBindings } from '@/lib/bizyair-node-bindings'

interface FormData {
  name: string
  description: string
  webAppId: string
  apiKey: string
  modelName: string
  isActive: boolean
}

interface AppFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingApp: App | null
  onSuccess: () => void
}

interface ImportedConfig {
  web_app_id?: string | number
  input_values?: Record<string, unknown>
}

function isImportedConfig(value: unknown): value is ImportedConfig {
  return typeof value === 'object' && value !== null
}

export function AppForm({ open, onOpenChange, editingApp, onSuccess }: AppFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    webAppId: '',
    apiKey: '',
    modelName: '',
    isActive: true,
  })
  const [mappingsJson, setMappingsJson] = useState('{\n  \n}')
  const [nodeIdsData, setNodeIdsData] = useState<BizyAirNodeConfig>(EMPTY_NODE_CONFIG)
  const [importCode, setImportCode] = useState('')
  const [showImport, setShowImport] = useState(false)

  const resetForm = useCallback(() => {
    setSelectedPreset('')
    setNodeIdsData(EMPTY_NODE_CONFIG)
    if (editingApp) {
      setFormData({
        name: editingApp.name,
        description: editingApp.description || '',
        webAppId: editingApp.webAppId,
        apiKey: editingApp.apiKey === '********' ? '' : editingApp.apiKey,
        modelName: editingApp.modelName,
        isActive: editingApp.isActive,
      })
      try {
        const parsed = JSON.parse(editingApp.mappings)
        setMappingsJson(JSON.stringify(parsed, null, 2))
      } catch {
        setMappingsJson('{}')
      }
    } else {
      setFormData({
        name: '',
        description: '',
        webAppId: '',
        apiKey: '',
        modelName: '',
        isActive: true,
      })
      setMappingsJson('{\n  \n}')
    }
  }, [editingApp])

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  function applyPreset(presetKey: string) {
    const preset = PRESET_TEMPLATES[presetKey as keyof typeof PRESET_TEMPLATES]
    if (preset) {
      setSelectedPreset(presetKey)
      setMappingsJson(JSON.stringify(preset.mappings, null, 2))
      setFormData((prev) => ({
        ...prev,
        name: prev.name || preset.name,
        description: prev.description || preset.description,
      }))
      toast.success(`已应用预设模板: ${preset.name}`)
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(mappingsJson)
      setMappingsJson(JSON.stringify(parsed, null, 2))
      toast.success('格式化成功')
    } catch {
      toast.error('JSON 格式无效')
    }
  }

  function parseImportCode(code: string) {
    try {
      let webAppId = ''
      let inputValues: Record<string, unknown> = {}

      // 1. 尝试解析 JSON.stringify 格式
      const stringifyMatch = code.match(/JSON\.stringify\s*\(\s*(\{[\s\S]*?\})\s*\)/)
      if (stringifyMatch) {
        try {
          const webAppIdMatch = stringifyMatch[1].match(/web_app_id["\s:]+(\d+)/)
          if (webAppIdMatch) {
            webAppId = webAppIdMatch[1]
          }
          const inputValuesMatch = stringifyMatch[1].match(/input_values["\s:]*(\{[\s\S]*?\})\s*[,}]/)
          if (inputValuesMatch) {
            const jsonStr = inputValuesMatch[1].replace(/,(\s*[}\]])/g, '$1')
            inputValues = JSON.parse(jsonStr)
          }
        } catch { /* continue */ }
      }

      // 2. 尝试解析 curl -d 格式
      const curlMatch = code.match(/curl.*?-d\s+['"]([{[\s\S]*?}])['"]/)
      if (curlMatch && Object.keys(inputValues).length === 0) {
        try {
          const jsonStr = curlMatch[1].replace(/\\n/g, '').replace(/\\"/g, '"')
          const data: unknown = JSON.parse(jsonStr)
          if (isImportedConfig(data)) {
            if (data.web_app_id) webAppId = String(data.web_app_id)
            if (data.input_values) inputValues = data.input_values
          }
        } catch { /* continue */ }
      }

      // 3. 尝试解析纯 JSON 格式
      if (Object.keys(inputValues).length === 0) {
        const jsonBlockMatch = code.match(/(\{[\s\S]*\})/)
        if (jsonBlockMatch) {
          try {
            const data: unknown = JSON.parse(jsonBlockMatch[1])
            if (isImportedConfig(data)) {
              if (data.web_app_id) webAppId = String(data.web_app_id)
              if (data.input_values) inputValues = data.input_values
            }
          } catch { /* continue */ }
        }
      }

      if (!webAppId || Object.keys(inputValues).length === 0) {
        toast.error('无法解析，请检查格式')
        return
      }

      // 4. 提取节点 ID 和类型
      const { nodeConfig } = extractNodeBindings(inputValues)

      // 5. 检测应用类型并选择预设模板
      let selectedPreset = 'custom'
      if (nodeConfig.PromptNode.length > 0 && nodeConfig.LoadImage.length > 0) {
        selectedPreset = 'nano-banana-image-multi'
      } else if (nodeConfig.PromptNode.length > 0) {
        selectedPreset = 'nano-banana-image'
      } else if (nodeConfig.TTSNode.length > 0) {
        selectedPreset = 'nano-banana-tts'
      }

      // 6. 获取模板映射
      const template = PRESET_TEMPLATES[selectedPreset as keyof typeof PRESET_TEMPLATES]

      // 7. 填充表单数据
      setFormData((prev) => ({
        ...prev,
        webAppId,
        name: prev.name || template.name,
        description: prev.description || template.description,
      }))

      // 8. 设置映射（使用带占位符的模板）
      setMappingsJson(JSON.stringify(template.mappings, null, 2))

      // 9. 保存节点 ID 数据
      setNodeIdsData(nodeConfig)

      toast.success(
        `解析成功！检测到: ${nodeConfig.LoadImage.length} 张参考图, ${nodeConfig.PromptNode.length} 个 Prompt 节点`
      )
      setShowImport(false)
    } catch (e) {
      console.error(e)
      toast.error('解析失败，请检查格式')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let mappings: Record<string, string> = {}
      try {
        mappings = JSON.parse(mappingsJson)
      } catch {
        toast.error('字段映射 JSON 格式无效')
        setLoading(false)
        return
      }

      const url = editingApp ? `/api/apps/${editingApp.id}` : '/api/apps'
      const method = editingApp ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mappings,
          nodeIds: nodeIdsData,
        }),
      })

      if (response.ok) {
        toast.success(editingApp ? '应用已更新' : '应用已创建')
        onOpenChange(false)
        onSuccess()
      } else {
        const data = await response.json()
        toast.error(data.error || '操作失败')
      }
    } catch {
      toast.error('提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] bg-slate-900/95 backdrop-blur-xl border-white/10 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            {editingApp ? '编辑应用' : '添加应用'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4 px-1">

          {/* 基本信息 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: NanoBanana 图片生成"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">模型名称</Label>
                <Input
                  value={formData.modelName}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                  placeholder="用于 API 调用的 model 名称，如: nano-banana-v2"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">描述 (可选)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简短描述应用用途..."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
              />
            </div>
          </div>

          {/* 服务配置 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
              服务配置
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Web App ID</Label>
                <Input
                  value={formData.webAppId}
                  onChange={(e) => setFormData({ ...formData, webAppId: e.target.value })}
                  placeholder="BizyAir 应用 ID"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">BizyAir API Key</Label>
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={editingApp ? '留空保持不变' : ''}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
                  required={!editingApp}
                />
              </div>
            </div>
          </div>

          {/* 预设模板 */}
          {!editingApp && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                预设模板
              </h3>
              <Select value={selectedPreset || ''} onValueChange={(v) => applyPreset(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="选择预设模板自动填充映射..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 字段映射 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
                字段映射
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatJson}
                className="text-slate-400 hover:text-white h-6 px-2 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                格式化
              </Button>
            </div>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
              <CodeEditor
                value={mappingsJson}
                onChange={(e) => setMappingsJson(e.target.value)}
                language="json"
                placeholder="字段映射 JSON"
                className="text-sm"
                style={{
                  backgroundColor: 'transparent',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  minHeight: '100px',
                  color: '#fff',
                  caretColor: '#fff',
                }}
                aria-label="字段映射 JSON 编辑器"
              />
            </div>
            <p className="text-xs text-slate-500">
              格式: {"{\"源字段\": \"目标字段\"}"}, 支持嵌套
            </p>
          </div>

          {/* 快速导入 */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImport(!showImport)}
              className="w-full justify-start text-slate-400 hover:text-white h-7 text-xs"
            >
              <Upload className="w-3 h-3 mr-2" />
              {showImport ? '收起导入' : '从代码导入配置'}
            </Button>
            {showImport && (
              <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <Textarea
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="粘贴 JS fetch 代码、curl 命令或 JSON..."
                  className="bg-black/40 border-white/10 text-white text-xs font-mono min-h-[80px] resize-y"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => parseImportCode(importCode)}
                  className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs"
                >
                  <FileCode className="w-3 h-3 mr-1" />
                  解析导入
                </Button>
              </div>
            )}
          </div>

          {/* 启用开关 */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="space-y-0.5">
              <Label className="text-white text-sm">启用应用</Label>
              <p className="text-xs text-slate-500">启用后可接收 API 请求</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 h-10 text-sm"
            disabled={loading}
          >
            {loading ? '保存中...' : editingApp ? '保存更改' : '创建应用'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
