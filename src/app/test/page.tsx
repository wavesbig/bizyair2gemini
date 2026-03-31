'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Send, Loader2, ShieldCheck } from 'lucide-react'
import CodeEditor from '@uiw/react-textarea-code-editor'
import { safeFetch } from '@/lib/safeFetch'

interface App {
  id: string
  name: string
  modelName: string
  webAppId: string
  mappings: string
}

export default function TestPage() {
  const [apps, setApps] = useState<App[]>([])
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<unknown>(null)
  const [selectedApp, setSelectedApp] = useState('')
  const [proxyApiKey, setProxyApiKey] = useState('')
  const [hasProxyApiKey, setHasProxyApiKey] = useState(false)

  // Gemini 格式的请求体
  const [requestBody, setRequestBody] = useState(`{
  "contents": [{
    "parts": [
      {"text": "请生成一张图片：美丽的日落"}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "1K"
    },
    "seed": 123456,
    "temperature": 0.8
  }
}`)

  useEffect(() => {
    fetchApps()
    fetchProxyApiKey()
  }, [])

  async function fetchApps() {
    try {
      const result = await safeFetch('/api/apps')

      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = '/login'
          return
        }
        console.error('Failed to fetch apps:', result.data?.error)
        return
      }

      const data = result.data
      setApps(Array.isArray(data) ? data : [])
      if (data.length > 0) {
        setSelectedApp(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error)
    }
  }

  async function fetchProxyApiKey() {
    try {
      const result = await safeFetch('/api/settings')

      if (!result.ok) {
        console.error('Failed to fetch proxy API key:', result.data?.error || result.status)
        return
      }

      const key = typeof result.data?.apiKey === 'string' ? result.data.apiKey : ''
      setProxyApiKey(key)
      setHasProxyApiKey(Boolean(key))
    } catch (error) {
      console.error('Failed to fetch proxy API key:', error)
    }
  }

  async function handleSend() {
    if (!selectedApp) {
      toast.error('请选择应用')
      return
    }

    if (!proxyApiKey) {
      toast.error('请先在设置页配置 Proxy API Key')
      return
    }

    const app = apps.find((a) => a.id === selectedApp)
    if (!app) {
      toast.error('应用不存在')
      return
    }

    setSending(true)
    setResponse(null)

    try {
      const body = JSON.parse(requestBody)

      const res = await fetch(`/api/v1beta/models/${app.modelName}/generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${proxyApiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('API Key 无效')
          return
        }
        const text = await res.text()
        try {
          const errorJson = JSON.parse(text)
          setResponse(errorJson)
        } catch {
          setResponse({ error: `请求失败 (${res.status})`, details: text.slice(0, 500) })
        }
        return
      }

      const data = await res.json()
      setResponse(data)
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('JSON 格式无效')
      } else {
        toast.error('请求失败')
        console.error(error)
      }
    } finally {
      setSending(false)
    }
  }

  // 显示当前应用的映射信息
  const selectedAppData = apps.find((a) => a.id === selectedApp)
  let mappingsDisplay = ''
  if (selectedAppData?.mappings) {
    try {
      const mappings = JSON.parse(selectedAppData.mappings)
      mappingsDisplay = JSON.stringify(mappings, null, 2)
    } catch {
      mappingsDisplay = '{}'
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 py-4 lg:flex-row lg:items-start lg:px-6">
      <Sidebar />
      <main className="flex-1 py-2 lg:py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Gemini API 测试</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">请求配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`size-4 ${hasProxyApiKey ? 'text-emerald-300' : 'text-amber-300'}`} aria-hidden="true" />
                    <p className="text-sm font-medium text-white">代理密钥</p>
                  </div>
                  <p className={`mt-2 text-xs ${hasProxyApiKey ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {hasProxyApiKey ? '已检测到可用的 Proxy API Key' : '未检测到 Proxy API Key，请先到设置页生成或填写'}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-gray-300">选择应用</Label>
                  <Select value={selectedApp} onValueChange={(v) => setSelectedApp(v || '')}>
                    <SelectTrigger className="mt-1 h-auto w-full rounded-2xl border-white/10 bg-white/[0.03] px-4 py-3 text-white hover:bg-white/[0.05]">
                      {selectedAppData ? (
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-white">{selectedAppData.name}</p>
                        </div>
                      ) : (
                        <SelectValue placeholder="选择应用" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900/95 text-white backdrop-blur-xl">
                      {apps.map((app) => (
                        <SelectItem key={app.id} value={app.id} className="rounded-xl px-3 py-2 text-slate-200">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{app.name}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAppData?.mappings && selectedAppData.mappings !== '{}' && (
                  <div>
                    <Label className="text-gray-300">字段映射</Label>
                    <pre className="mt-1 p-2 rounded bg-black/30 text-xs text-gray-400 overflow-x-auto max-h-32">
                      {mappingsDisplay}
                    </pre>
                  </div>
                )}

                <div>
                  <Label className="text-gray-300">Gemini 请求体 (JSON)</Label>
                  <div className="mt-1 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    <CodeEditor
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      language="json"
                      className="text-sm"
                      style={{
                        backgroundColor: 'transparent',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        minHeight: '280px',
                        color: '#fff',
                        caretColor: '#fff',
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || !selectedApp || !proxyApiKey}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      发送请求
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">响应结果</CardTitle>
              </CardHeader>
              <CardContent>
                {response ? (
                  <pre className="bg-black/30 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto max-h-[500px] overflow-y-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    发送请求后显示响应结果
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
