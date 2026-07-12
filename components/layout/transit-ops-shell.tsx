"use client"

import type { ComponentType, ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Tractor,
  UserRound,
  UserCog,
  WalletCards,
  Wrench,
  type LucideProps,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Icon = ComponentType<LucideProps>

type NavigationItem = {
  href: string
  label: string
  icon: Icon
  description?: string
}

type RoleView = {
  label: string
  href: string
  icon: Icon
}

export type TransitOpsShellProps = {
  children: ReactNode
  /** Override the role name shown in the signed-in profile menu. */
  user?: {
    name: string
    email: string
    role: string
    initials: string
  }
}

const primaryNavigation: NavigationItem[] = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/fleet", label: "Vehicle Registry", icon: Tractor },
  { href: "/dispatch", label: "Trip Dispatch", icon: ClipboardCheck },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/fuel", label: "Fuel Logs", icon: Fuel },
  { href: "/admin/users", label: "User Management", icon: UserCog },
]

function getNavigationForRole(role: string): NavigationItem[] {
  if (role === 'admin') return primaryNavigation
  if (role === 'fleet_manager') return primaryNavigation.filter(n => n.href !== '/admin/users')
  if (role === 'driver') return primaryNavigation.filter(n => ['/', '/fuel'].includes(n.href))
  if (role === 'safety_officer') return primaryNavigation.filter(n => ['/', '/fleet', '/maintenance'].includes(n.href))
  if (role === 'financial_analyst') return primaryNavigation.filter(n => ['/', '/fleet', '/fuel', '/maintenance'].includes(n.href))
  return primaryNavigation.filter(n => n.href === '/')
}

// Removed static roleViews array

const defaultUser: NonNullable<TransitOpsShellProps["user"]> = {
  name: "Alex Morgan",
  email: "alex.morgan@transitops.io",
  role: "Operations Administrator",
  initials: "AM",
}

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname.startsWith(href)
}

function getBreadcrumbs(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return ["Command Center"]

  return ["Command Center", ...segments.map((segment) => segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))]
}

function Navigation({ userRole, onNavigate }: { userRole: string; onNavigate?: () => void }): ReactNode {
  const pathname = usePathname()
  const navItems = getNavigationForRole(userRole)

  const renderLink = ({ href, label, icon: Icon }: NavigationItem | RoleView): ReactNode => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActivePath(pathname, href)
          ? "bg-sky-400 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.18)]"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )

  return (
    <nav className="flex h-full flex-col px-3 py-4" aria-label="Primary navigation">
      <div className="mb-8 flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-400 text-sm font-black text-slate-950">T</span>
        <div>
          <p className="text-sm font-bold tracking-wide text-slate-50">SPIREOPS</p>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-sky-400">COMMAND CENTER</p>
        </div>
      </div>

      <div className="space-y-1">{navItems.map(renderLink)}</div>

      <div className="mt-auto rounded-md border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs font-semibold text-slate-200">System status</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> All services operational
        </div>
      </div>
    </nav>
  )
}

export function TransitOpsShell({ children, user = defaultUser }: TransitOpsShellProps): ReactNode {
  const pathname = usePathname()
  const router = useRouter()
  const breadcrumbs = getBreadcrumbs(pathname)

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-800 bg-slate-950 lg:block">
        <Navigation userRole={user.role} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="p-0"><Navigation userRole={user.role} onNavigate={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} /></SheetContent>
          </Sheet>

          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && <span className="text-slate-700">/</span>}
                <span className={cn("truncate", index === breadcrumbs.length - 1 ? "font-medium text-slate-100" : "hidden text-slate-500 sm:inline")}>{crumb}</span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative text-slate-400" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-400 ring-2 ring-slate-950" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 text-left hover:bg-slate-900">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-bold text-sky-300">{user.initials}</span>
                  <span className="hidden sm:block"><span className="block text-sm leading-none text-slate-200">{user.name}</span><span className="mt-1 block text-[11px] leading-none text-slate-500">{user.role}</span></span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel><p className="font-medium text-slate-100">{user.name}</p><p className="mt-0.5 font-normal text-slate-500">{user.email}</p></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><UserRound className="mr-2 h-4 w-4 text-slate-400" />Profile settings</DropdownMenuItem>
                <DropdownMenuItem><ShieldCheck className="mr-2 h-4 w-4 text-slate-400" />Access & security</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200 cursor-pointer"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
