"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-meta";
import { toast } from "sonner";
import {
  LayoutDashboard,
  AppWindow,
  Send,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/apps", label: "应用管理", icon: AppWindow },
  { href: "/test", label: "测试", icon: Send },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已退出登录");
    router.push("/login");
  };

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-64 lg:self-start">
      <div className="glass-card relative flex max-h-[calc(100vh-2rem)] min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border-white/10 bg-slate-950/60 shadow-[0_22px_70px_-38px_rgba(34,211,238,0.35)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="pointer-events-none absolute -right-12 top-10 size-28 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-14 size-24 rounded-full bg-violet-400/12 blur-3xl" />

        <div className="border-b border-white/10 px-5 py-5">
          <h1 className="text-xl font-bold text-white">BizyAir Proxy</h1>
        </div>

        <nav className="flex flex-wrap gap-2 p-3 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex min-h-11 flex-1 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition-all duration-200 lg:flex-none",
                  isActive
                    ? "border-cyan-300/25 bg-gradient-to-r from-cyan-400/16 via-sky-400/12 to-violet-400/14 text-white shadow-[0_14px_34px_-24px_rgba(34,211,238,0.8)]"
                    : "border-white/6 bg-white/[0.03] text-slate-400 hover:-translate-y-0.5 hover:border-white/12 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 p-1 text-[13px] text-slate-500 text-center">
            <span className="font-mono text-cyan-200">v{APP_VERSION}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-left text-sm text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="size-5" aria-hidden="true" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
