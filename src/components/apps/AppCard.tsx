'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Edit, Trash2, Key, Copy, Terminal } from 'lucide-react'
import { buildAppCurl, inferApiStyle } from '@/lib/api-docs'

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
  onDelete: (app: App) => void
  onCopy: (app: App) => void
}

export function AppCard({ app, onEdit, onDelete, onCopy }: AppCardProps) {
  function generateCurl() {
    const curl = buildAppCurl(app, window.location.origin)
    const style = inferApiStyle(app)

    navigator.clipboard.writeText(curl).then(() => {
      toast.success(`${style === 'gemini' ? 'Gemini' : 'OpenAI'} 生产 curl 已复制`)
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  return (
    <Card className="glass-card border-white/10 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-white text-lg">{app.name}</CardTitle>
          <p className="min-w-0 text-sm text-slate-400">
            Model: <code className="ml-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-indigo-300 break-words">{app.modelName}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${app.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-500'}`} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {app.description && (
          <p className="text-slate-400 text-sm">{app.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Key className="size-4 text-slate-500" aria-hidden="true" />
          <span>Web App ID: <span className="text-slate-300 font-mono">{app.webAppId}</span></span>
        </div>
        <div className="max-h-20 overflow-hidden rounded bg-black/30 p-2 font-mono text-xs text-slate-400">
          {app.mappings || '{}'}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Production Endpoint</p>
          <p className="mt-2 break-words font-mono text-xs leading-5 text-cyan-200">
            {inferApiStyle(app) === 'gemini'
              ? `/api/v1beta/models/${app.modelName}/generateContent`
              : '/api/v1/chat/completions'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(app)}
            className="border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            aria-label={`复制应用 ${app.name}`}
          >
            <Copy data-icon="inline-start" aria-hidden="true" />
            复制
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(app)}
            className="border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            aria-label={`编辑应用 ${app.name}`}
          >
            <Edit data-icon="inline-start" aria-hidden="true" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCurl}
            className="border-white/10 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30"
            aria-label={`复制 ${app.name} 的生产 curl`}
          >
            <Terminal data-icon="inline-start" aria-hidden="true" />
            复制 Curl
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(app)}
            className="border-white/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 ml-auto"
            aria-label={`删除应用 ${app.name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
