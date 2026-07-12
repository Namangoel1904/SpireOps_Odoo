"use client"

import { useActionState, useMemo, type ReactNode } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Truck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createTrip, type TripFormState } from "@/app/dispatch/actions"

type Vehicle = { id: string; registration_plate: string; make: string; model: string; capacity_kg: number; status: string }
type Driver = { id: string; full_name: string; license_number: string; license_expiry: string; status: string }

const inputClassName = "mt-2 flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
const fieldLabelClassName = "text-xs font-bold uppercase tracking-[0.12em] text-slate-400"

const initialState: TripFormState = {}

export function DispatchTripForm({ vehicles, drivers }: { vehicles: Vehicle[]; drivers: Driver[] }): ReactNode {
  const [state, formAction, isPending] = useActionState(createTrip, initialState)

  const firstVehicle = vehicles[0]

  return (
    <form action={formAction} className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Fleet Manager</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Dispatch a Trip</h1>
          <p className="mt-2 text-sm text-slate-400">Assign qualified resources and validate operational limits before release.</p>
        </div>
        <span className="w-fit rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
          Live DB dispatch
        </span>
      </div>

      {/* Route Details */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-100">Route details</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={fieldLabelClassName}>
            Source
            <input name="source" defaultValue="Bhiwandi Distribution Hub" className={inputClassName} placeholder="Origin facility" required />
          </label>
          <label className={fieldLabelClassName}>
            Destination
            <input name="destination" defaultValue="Pune Fulfillment Center" className={inputClassName} placeholder="Destination facility" required />
          </label>
          <label className={fieldLabelClassName}>
            Cargo Weight <span className="normal-case text-slate-500">(kg)</span>
            <input name="cargoWeight" type="number" min="1" defaultValue="5000" className={inputClassName} required />
          </label>
          <label className={fieldLabelClassName}>
            Planned Distance <span className="normal-case text-slate-500">(km)</span>
            <input name="distance" type="number" min="1" defaultValue="154" className={inputClassName} required />
          </label>
        </div>
      </section>

      {/* Resource Assignment */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-100">Resource assignment</h2>
        {vehicles.length === 0 || drivers.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <p className="text-sm text-amber-200">
              {vehicles.length === 0 ? "No available vehicles. " : ""}
              {drivers.length === 0 ? "No available drivers. " : ""}
              All resources may currently be on trips.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={fieldLabelClassName}>
              Available Vehicle
              <select name="vehicleId" className={inputClassName}>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_plate} · {v.make} {v.model} ({v.capacity_kg.toLocaleString()} kg max)
                  </option>
                ))}
              </select>
              <span className="mt-2 flex items-center gap-2 normal-case text-xs font-medium text-emerald-300">
                <Truck className="h-3.5 w-3.5" />
                {vehicles.length} vehicle(s) available · Select from dropdown
              </span>
            </label>
            <label className={fieldLabelClassName}>
              Available Driver
              <select name="driverId" className={inputClassName}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} · {d.license_number} · Exp: {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : 'N/A'}
                  </option>
                ))}
              </select>
              <span className="mt-2 flex items-center gap-2 normal-case text-xs font-medium text-slate-400">
                <UserRound className="h-3.5 w-3.5" />
                License and availability verified
              </span>
            </label>
          </div>
        )}
      </section>

      {/* Error state */}
      {state.error && (
        <div role="alert" className="flex gap-3 rounded-lg border border-rose-500/50 bg-rose-500/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
          <p className="text-rose-200">{state.error}</p>
        </div>
      )}

      {/* Success state */}
      {state.success && (
        <div role="status" className="flex gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <p>Trip saved as Draft. The Admin dashboard will now show this trip. Use "Validate & Dispatch" to dispatch it immediately.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          name="action"
          value="draft"
          variant="outline"
          className="border-slate-700 text-slate-300"
          disabled={isPending || vehicles.length === 0 || drivers.length === 0}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button
          type="submit"
          name="action"
          value="dispatch"
          className="gap-2 bg-sky-400 text-slate-950 hover:bg-sky-300 disabled:bg-slate-700 disabled:text-slate-400"
          disabled={isPending || vehicles.length === 0 || drivers.length === 0}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Validate & Dispatch <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
