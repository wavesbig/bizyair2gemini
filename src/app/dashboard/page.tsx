'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppWindow, Send, Key } from 'lucide-react'
import { safeFetch } from '@/lib/safeFetch'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    apps: 0,
    templates: 0,
    activeApps: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const appsResult = await safeFetch('/api/apps')

        if (!appsResult.ok) {
          console.error('Failed to fetch stats')
          return
        }

        const apps = appsResult.data

        setStats({
          apps: Array.isArray(apps) ? apps.length : 0,
          templates: 0,
          activeApps: Array.isArray(apps) ? apps.filter((a: any) => a.isActive).length : 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])

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
    {
      title: '模板数量',
      value: stats.templates,
      icon: Send,
      color: 'from-violet-500 to-purple-600',
    },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">仪表盘</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">
                      {stat.title}
                    </CardTitle>
                    <Icon className="w-4 h-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">快速开始</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-white font-medium mb-2">1. 添加应用</h3>
                <p className="text-gray-400 text-sm">
                  在应用管理中添加您的 BizyAir 应用，包括 web_app_id 和 API Key
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-white font-medium mb-2">2. 配置模板</h3>
                <p className="text-gray-400 text-sm">
                  使用预设模板或创建自定义字段映射，将 OpenAI 参数转换为 BizyAir 格式
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-white font-medium mb-2">3. 使用代理</h3>
                <p className="text-gray-400 text-sm">
                  使用配置的 model 名称调用代理服务：
                  <code className="ml-2 px-2 py-1 rounded bg-white/10 text-indigo-300">
                    POST /api/v1/chat/completions
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
