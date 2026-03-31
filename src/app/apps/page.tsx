'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { safeFetch } from '@/lib/safeFetch'
import { AppCard, App } from '@/components/apps/AppCard'
import { AppForm } from '@/components/apps/AppForm'

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)

  useEffect(() => {
    fetchApps()
  }, [])

  async function fetchApps() {
    try {
      const result = await safeFetch('/api/apps')

      if (!result.ok) {
        console.error('Failed to fetch apps:', result.data?.error || result.status)
        return
      }

      setApps(Array.isArray(result.data) ? result.data : [])
    } catch (error) {
      console.error('Failed to fetch apps:', error)
    } finally {
      setLoading(false)
    }
  }

  function openDialog(app?: App) {
    setEditingApp(app || null)
    setDialogOpen(true)
  }

  function copyAndEdit(app: App) {
    const appCopy: App = {
      ...app,
      id: '', // Empty id for new app
      name: `${app.name} (副本)`,
      modelName: `${app.modelName}-copy`,
      apiKey: '',
    }
    setEditingApp(appCopy)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个应用吗？')) return

    try {
      const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('应用已删除')
        fetchApps()
      } else {
        toast.error('删除失败')
      }
    } catch {
      toast.error('网络错误')
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 px-4 py-4 lg:flex-row lg:items-start lg:px-6">
      <Sidebar />
      <main className="flex-1 py-2 lg:py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">应用管理</h1>
            <Button
              onClick={() => openDialog()}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加应用
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={openDialog}
                onDelete={handleDelete}
                onCopy={copyAndEdit}
              />
            ))}
          </div>

          {apps.length === 0 && !loading && (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">暂无应用，请添加第一个应用</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AppForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingApp={editingApp}
        onSuccess={fetchApps}
      />
    </div>
  )
}
