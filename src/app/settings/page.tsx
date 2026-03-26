'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Key, Lock, Eye, EyeOff, RefreshCw, Copy } from 'lucide-react'
import { safeFetch } from '@/lib/safeFetch'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [maskedApiKey, setMaskedApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const result = await safeFetch('/api/settings')

      if (!result.ok) {
        console.error('Failed to fetch settings:', result.data?.error || result.status)
        return
      }

      setHasApiKey(result.data.hasApiKey)
      setMaskedApiKey(result.data.apiKey || '')
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  function copyApiKey() {
    if (maskedApiKey) {
      navigator.clipboard.writeText(maskedApiKey).then(() => {
        toast.success('API Key 已复制')
      }).catch(() => {
        toast.error('复制失败')
      })
    } else {
      toast.error('请先设置 API Key')
    }
  }

  async function saveApiKey(key: string) {
    if (!key.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })

      if (response.ok) {
        toast.success('API Key 已保存')
        setHasApiKey(true)
        setMaskedApiKey(key)
        setApiKey('')
      } else {
        toast.error('保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  function handleApiKeyBlur() {
    if (apiKey.trim()) {
      saveApiKey(apiKey)
    }
  }

  async function handleApiKeySave() {
    if (!apiKey.trim()) {
      toast.error('请输入 API Key')
      return
    }
    await saveApiKey(apiKey)
  }

  function generateApiKey() {
    // 生成 sk- 开头的随机 Key (48位十六进制)
    const array = new Uint8Array(24)
    crypto.getRandomValues(array)
    const key = `sk-${Array.from(array, b => b.toString(16).padStart(2, '0')).join('')}`
    setApiKey(key)
    toast.success('已生成新 API Key')
  }

  async function handlePasswordChange() {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('请填写所有密码字段')
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast.error('新密码与确认密码不匹配')
      return
    }

    if (passwords.new.length < 6) {
      toast.error('新密码至少需要 6 个字符')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      })

      if (response.ok) {
        toast.success('密码已更新')
        setPasswords({ current: '', new: '', confirm: '' })
      } else {
        const data = await response.json()
        toast.error(data.error || '修改失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">设置</h1>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  代理 API Key
                </CardTitle>
                <CardDescription className="text-gray-400">
                  用于验证代理请求的身份凭证
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasApiKey && maskedApiKey && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <Key className="w-4 h-4 text-indigo-400" />
                    <code className="flex-1 text-sm text-gray-300 font-mono">{maskedApiKey}</code>
                    <button
                      type="button"
                      onClick={copyApiKey}
                      className="text-gray-400 hover:text-white p-1"
                      title="复制 API Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div>
                  <Label className="text-gray-300">{hasApiKey ? '重新设置 API Key' : '设置 API Key'}</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onBlur={handleApiKeyBlur}
                        placeholder={hasApiKey ? '输入新 Key 替换当前' : '输入 API Key'}
                        className="glass-input text-white pr-20"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="button"
                          onClick={generateApiKey}
                          className="text-indigo-400 hover:text-indigo-300 p-1"
                          title="生成随机 Key"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleApiKeySave}
                      disabled={saving}
                      className="bg-gradient-to-r from-indigo-500 to-violet-600"
                    >
                      {saving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    在调用代理接口时需要在 Authorization header 中使用此 Key
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  修改密码
                </CardTitle>
                <CardDescription className="text-gray-400">
                  修改 Web UI 管理页面的登录密码
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">当前密码</Label>
                  <Input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="glass-input text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">新密码</Label>
                  <Input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="glass-input text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">确认新密码</Label>
                  <Input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="glass-input text-white mt-1"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="bg-gradient-to-r from-indigo-500 to-violet-600"
                >
                  {saving ? '修改中...' : '修改密码'}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">使用说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-400 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-2">代理调用示例</h4>
                  <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto">
{`curl -X POST https://your-domain.com/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "your-model-name",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.8
  }'`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">获取模型列表</h4>
                  <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto">
{`curl https://your-domain.com/api/v1/models \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
