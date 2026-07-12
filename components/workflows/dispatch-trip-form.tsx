"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, Truck, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Vehicle = { id: string; label: string; capacityKg: number; status: "Available" }
type Driver = { id: string; name: string; license: string }

const vehicles: Vehicle[] = [
  { id: "tr-077", label: "TR-077 · Volvo FH16", capacityKg: 16000, status: "Available" },
  { id: "tr-204", label: "TR-204 · Scania R500", capacityKg: 24000, status: "Available" },
  { id: "tr-118", label: "TR-118 · Tata Prima", capacityKg: 12000, status: "Available" },
]

const drivers: Driver[] = [
  { id: "jane-d", name: "Jane D'Souza", license: "CDL · Ends 2028" },
  { id: "arjun-p", name: "Arjun Patel", license: "CDL · Ends 2027" },
  { id: "samira-k", name: "Samira Khan", license: "CDL · Ends 2029" },
]

const inputClassName = "mt-2 flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
const fieldLabelClassName = "text-xs font-bold uppercase tracking-[0.12em] text-slate-400"

export function DispatchTripForm(): ReactNode {
  const [source, setSource] = useState("Bhiwandi Distribution Hub")
  const [destination, setDestination] = useState("Pune Fulfillment Center")
  const [cargoWeight, setCargoWeight] = useState("18000")
  const [distance, setDistance] = useState("154")
  const [vehicleId, setVehicleId] = useState(vehicles[0].id)
  const [driverId, setDriverId] = useState(drivers[0].id)
  const [submitted, setSubmitted] = useState(false)

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.id === vehicleId) ?? vehicles[0], [vehicleId])
  const weight = Number(cargoWeight) || 0
  const capacityExceeded = weight > selectedVehicle.capacityKg
  const isInvalid = !source || !destination || weight <= 0 || Number(distance) <= 0 || capacityExceeded

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Fleet Manager</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Dispatch a trip</h1><p className="mt-2 text-sm text-slate-400">Assign qualified resources and validate operational limits before release.</p></div><span className="w-fit rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">Draft trip</span></div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 sm:p-6"><h2 className="text-sm font-semibold text-slate-100">Route details</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><label className={fieldLabelClassName}>Source<input value={source} onChange={(event) => setSource(event.target.value)} className={inputClassName} placeholder="Origin facility" required /></label><label className={fieldLabelClassName}>Destination<input value={destination} onChange={(event) => setDestination(event.target.value)} className={inputClassName} placeholder="Destination facility" required /></label><label className={fieldLabelClassName}>Cargo Weight <span className="normal-case text-slate-500">(kg)</span><input type="number" min="1" value={cargoWeight} onChange={(event) => { setCargoWeight(event.target.value); setSubmitted(false) }} className={cn(inputClassName, capacityExceeded && "border-rose-500 focus:border-rose-400 focus:ring-rose-400/20")} required /></label><label className={fieldLabelClassName}>Planned Distance <span className="normal-case text-slate-500">(km)</span><input type="number" min="1" value={distance} onChange={(event) => setDistance(event.target.value)} className={inputClassName} required /></label></div></section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 sm:p-6"><h2 className="text-sm font-semibold text-slate-100">Resource assignment</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><label className={fieldLabelClassName}>Available Vehicle<select value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setSubmitted(false) }} className={inputClassName}>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select><span className="mt-2 flex items-center gap-2 normal-case text-xs font-medium text-emerald-300"><Truck className="h-3.5 w-3.5" />{selectedVehicle.capacityKg.toLocaleString()} kg max load · {selectedVehicle.status}</span></label><label className={fieldLabelClassName}>Available Driver<select value={driverId} onChange={(event) => setDriverId(event.target.value)} className={inputClassName}>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.license}</option>)}</select><span className="mt-2 flex items-center gap-2 normal-case text-xs font-medium text-slate-400"><UserRound className="h-3.5 w-3.5" />License and availability verified</span></label></div></section>

      {capacityExceeded && <div role="alert" className="flex gap-3 rounded-lg border border-rose-500/50 bg-rose-500/10 p-4 text-sm"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><p className="font-semibold text-rose-100">Cargo exceeds vehicle capacity</p><p className="mt-1 leading-6 text-rose-200/80">{weight.toLocaleString()} kg is {Math.abs(weight - selectedVehicle.capacityKg).toLocaleString()} kg over the {selectedVehicle.capacityKg.toLocaleString()} kg maximum for {selectedVehicle.label.split(" · ")[0]}. Reduce the cargo weight or select a higher-capacity vehicle.</p></div></div>}
      {submitted && !isInvalid && <div role="status" className="flex gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /><p>Trip draft is valid and ready for final dispatch approval.</p></div>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="border-slate-700 text-slate-300">Save draft</Button><Button type="submit" className="gap-2 bg-sky-400 text-slate-950 hover:bg-sky-300 disabled:bg-slate-700 disabled:text-slate-400" disabled={isInvalid}>Validate &amp; dispatch<ArrowRight className="h-4 w-4" /></Button></div>
    </form>
  )
}
