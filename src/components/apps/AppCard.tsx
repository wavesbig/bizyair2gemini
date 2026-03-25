'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Edit, Trash2, Key, Copy, Terminal } from 'lucide-react'

export interface App {
  id: string
  name: string
  description: string | null
  webAppId: string
  apiKey: string
  modelName: string
  isActive: boolean
  mappings: string
  createdAt: string
}

interface AppCardProps {
  app: App
  onEdit: (app: App) => void
  onDelete: (id: string) => void
  onCopy: (app: App) => void
}

export function AppCard({ app, onEdit, onDelete, onCopy }: AppCardProps) {
  function generateCurl() {
    let mappings: Record<string, string> = {}
    try {
      mappings = JSON.parse(app.mappings || '{}')
    } catch { /* ignore */ }

    const sampleParams = Object.keys(mappings)

    const paramsStr = sampleParams.length > 0
      ? `,\n  ${sampleParams.map(k => `"${k}": "<${k}的值>"`).join(',\n  ')}`
      : ''

    const curl = `curl -X POST http://your-domain.com/api/v1beta/models/${app.modelName}/generateContent \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "contents": [{"parts": [{"text": "Your prompt here"}]}]${paramsStr}
}'`

    navigator.clipboard.writeText(curl).then(() => {
      toast.success('curl 命令已复制到剪贴板')
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  return (
    <Card className="glass-card border-white/10 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-white text-lg">{app.name}</CardTitle>
          <p className="text-sm text-slate-400">
            Model: <code className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-mono text-xs">{app.modelName}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${app.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-500'}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {app.description && (
          <p className="text-slate-400 text-sm">{app.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Key className="w-4 h-4 text-slate-500" />
          <span>Web App ID: <span className="text-slate-300 font-mono">{app.webAppId}</span></span>
        </div>
        <div className="p-2 rounded bg-black/30 text-xs text-slate-400 font-mono max-h-20 overflow-hidden">
          {app.mappings || '{}'}
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(app)}
            className="border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
          >
            <Copy className="w-4 h-4 mr-1" />
            复制
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(app)}
            className="border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
          >
            <Edit className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCurl}
            className="border-white/10 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30"
          >
            <Terminal className="w-4 h-4 mr-1" />
            curl
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(app.id)}
            className="border-white/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
