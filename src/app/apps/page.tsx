'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { safeFetch } from '@/lib/safeFetch'
import { AppCard, App } from '@/components/apps/AppCard'
import { AppForm } from '@/components/apps/AppForm'

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)
  const [deletingApp, setDeletingApp] = useState<App | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    setDeleting(true)
    try {
      const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('应用已删除')
        setDeletingApp(null)
        fetchApps()
      } else {
        toast.error('删除失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setDeleting(false)
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
                onDelete={setDeletingApp}
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

      <Dialog open={Boolean(deletingApp)} onOpenChange={(open) => !open && !deleting && setDeletingApp(null)}>
        <DialogContent className="glass-card max-w-md border-white/10 bg-slate-950/90 p-0 text-white" showCloseButton={!deleting}>
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/12 text-red-300">
                <AlertTriangle aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-lg text-white">删除应用</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-400">
                  这个操作会移除当前应用配置，并立即停止对应模型入口的调用。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">即将删除</p>
              <p className="mt-2 text-base font-medium text-white">{deletingApp?.name}</p>
              <p className="mt-2 text-sm text-slate-400">Model: <span className="font-mono text-cyan-200">{deletingApp?.modelName}</span></p>
            </div>
          </div>

          <DialogFooter className="border-white/10 bg-white/[0.03]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingApp(null)}
              disabled={deleting}
              className="border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => deletingApp && handleDelete(deletingApp.id)}
              disabled={deleting || !deletingApp}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
