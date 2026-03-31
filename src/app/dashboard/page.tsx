'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AppWindow, Send, Key, Copy, Globe, Sparkles, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { safeFetch } from '@/lib/safeFetch'
import { buildDashboardUsage } from '@/lib/api-docs'

interface DashboardApp {
  isActive: boolean
  modelName: string
  mappings: string
}

const FALLBACK_ORIGIN = 'https://your-production-domain.com'

function subscribeToOrigin() {
  return () => {}
}

function getClientOrigin() {
  return window.location.origin
}

function getServerOrigin() {
  return FALLBACK_ORIGIN
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    apps: 0,
    activeApps: 0,
  })
  const [sampleApp, setSampleApp] = useState<{ modelName: string; mappings: string } | null>(null)
  const origin = useSyncExternalStore(subscribeToOrigin, getClientOrigin, getServerOrigin)

  useEffect(() => {
    async function fetchStats() {
      try {
        const appsResult = await safeFetch('/api/apps')

        if (!appsResult.ok) {
          console.error('Failed to fetch stats')
          return
        }

        const apps = appsResult.data
        const appList: DashboardApp[] = Array.isArray(apps) ? apps : []

        setStats({
          apps: appList.length,
          activeApps: appList.filter((app) => app.isActive).length,
        })
        setSampleApp(appList[0] ?? null)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])

  const usage = buildDashboardUsage(sampleApp ?? undefined, origin)

  function handleCopy(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      toast.success(`${label} 已复制`)
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  const statCards = [
    {
      title: '应用数量',
      value: stats.apps,
      icon: AppWindow,
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: '活跃应用',
      value: stats.activeApps,
      icon: Key,
      color: 'from-green-500 to-emerald-600',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 py-4 lg:flex-row lg:items-start lg:px-6">
      <Sidebar />
      <main className="flex-1 py-2 lg:py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.24em] text-cyan-200 uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Production Console
              </div>
              <div className="space-y-2">
                <h1 className="text-balance font-heading text-4xl font-semibold text-white">仪表盘</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  这里展示当前代理的接入方式、生产环境调用入口与可直接复制的请求示例。
                </p>
              </div>
            </div>
            <div className="hidden rounded-3xl border border-cyan-400/20 bg-cyan-400/8 px-5 py-4 text-right lg:block">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Base URL</p>
              <p className="mt-2 font-mono text-sm text-white">{origin}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="glass-card border-white/10 bg-slate-950/55">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">
                      {stat.title}
                    </CardTitle>
                    <Icon className="size-4 text-gray-400" aria-hidden="true" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white [font-variant-numeric:tabular-nums]">{stat.value}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="glass-card overflow-hidden border-white/10 bg-slate-950/60">
            <CardHeader className="border-b border-white/10 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    生产环境接入说明
                  </div>
                  <CardTitle className="text-white">从模型发现到正式请求，一屏完成</CardTitle>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">推荐模型</p>
                  <p className="mt-1 font-mono text-cyan-200">{sampleApp?.modelName ?? 'your-model-name'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                  <h3 className="mt-2 text-base font-medium text-white">配置代理密钥</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    在设置页生成 `PROXY API Key`，生产请求统一使用 `Authorization: Bearer &lt;key&gt;`。
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
                  <h3 className="mt-2 text-base font-medium text-white">查询可用模型</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    先请求 `/api/v1/models`，拿到当前启用且可调用的模型名，再落到业务代码里。
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                  <h3 className="mt-2 text-base font-medium text-white">发送生产请求</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    当前推荐应用采用 {usage.style === 'gemini' ? 'Gemini 风格' : 'OpenAI 风格'} 请求体，复制下面示例即可联调。
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-cyan-300" aria-hidden="true" />
                      <h3 className="text-sm font-medium text-white">列出可用模型</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('模型列表 curl', usage.modelsCurl)}
                      className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      aria-label="复制模型列表 curl"
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                      复制
                    </Button>
                  </div>
                  <pre className="min-w-0 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200 break-words">
                    {usage.modelsCurl}
                  </pre>
                </section>

                <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Send className="size-4 text-emerald-300" aria-hidden="true" />
                      <h3 className="text-sm font-medium text-white">生产请求示例</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('生产请求 curl', usage.requestCurl)}
                      className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      aria-label="复制生产请求 curl"
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                      复制
                    </Button>
                  </div>
                  <pre className="min-w-0 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200 break-words">
                    {usage.requestCurl}
                  </pre>
                </section>
              </div>

              <div className="rounded-3xl border border-dashed border-cyan-400/20 bg-cyan-400/5 p-5">
                <p className="text-sm leading-6 text-slate-300">
                  仪表盘显示的是面向生产环境的外部调用方式，不依赖后台登录态，也不使用测试页专用接口。部署到正式域名后，复制命令会自动带上当前站点域名。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
