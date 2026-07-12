import { ReactNode } from "react"
import { Lock } from "lucide-react"

export function PendingDashboard(): ReactNode {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 shadow-inner">
        <Lock className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-100">Account Pending Approval</h1>
      <p className="mt-2 max-w-md text-slate-400">
        Your account has been successfully created, but you need an Administrator to assign you a role before you can access the command center.
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-500">
        Current Role: Pending
      </p>
    </div>
  )
}
