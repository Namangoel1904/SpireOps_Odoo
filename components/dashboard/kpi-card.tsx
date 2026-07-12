import type { ComponentType, ReactNode } from "react"
import type { LucideProps } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type KpiCardProps = {
  label: string
  value: string
  detail: string
  icon: ComponentType<LucideProps>
  tone?: "sky" | "emerald" | "amber" | "rose"
  isLoading?: boolean
}

const toneStyles: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/20 bg-rose-400/10 text-rose-300",
}

export function KpiCard({ label, value, detail, icon: Icon, tone = "sky", isLoading = false }: KpiCardProps): ReactNode {
  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-9 w-16" /><Skeleton className="mt-4 h-3 w-36" /></div>
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-md border", toneStyles[tone])}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-50">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </section>
  )
}
