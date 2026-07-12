"use client"

import { signup } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Truck, ShieldCheck, AlertCircle } from 'lucide-react'

const inputCls = "block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
const labelCls = "block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5"

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const [isDriverApplicant, setIsDriverApplicant] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-fuchsia-500/20 border border-sky-500/20">
            <span className="text-2xl font-black text-sky-400">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-50">Join SpireOps</h1>
          <p className="mt-2 text-sm text-slate-400">
            Create your account. An administrator will assign your role.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-sm">
          <form className="space-y-5" action={signup}>

            {/* ── Basic Info ── */}
            <section>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-sky-400">
                Account Details
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className={labelCls}>Full Name</label>
                  <input id="fullName" name="fullName" type="text" required placeholder="e.g. Alex Kumar" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>Email Address</label>
                  <input id="email" name="email" type="email" required placeholder="you@example.com" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="password" className={labelCls}>Password</label>
                  <input id="password" name="password" type="password" required placeholder="Min. 8 characters" minLength={8} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>Phone Number <span className="normal-case text-slate-500">(optional)</span></label>
                  <input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" className={inputCls} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* ── Driver Application Section ── */}
            <section>
              <button
                type="button"
                onClick={() => setIsDriverApplicant(!isDriverApplicant)}
                className="flex w-full items-center justify-between rounded-lg border border-dashed border-slate-700 bg-slate-900 px-4 py-3 text-left transition hover:border-sky-500/50 hover:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10">
                    <Truck className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Applying as a Driver?</p>
                    <p className="text-xs text-slate-500">Optionally provide your licence details for faster approval.</p>
                  </div>
                </div>
                {isDriverApplicant
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />
                }
              </button>

              {isDriverApplicant && (
                <div className="mt-4 space-y-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
                  <div className="flex items-start gap-2 text-xs text-sky-300">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>This information is stored securely and is only visible to Administrators during role assignment. You will still be placed in <strong>pending</strong> status until approved.</p>
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className={labelCls}>Driving Licence Number</label>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      placeholder="e.g. DL-MH-01-12345"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="licenseExpiry" className={labelCls}>Licence Expiry Date</label>
                    <input
                      id="licenseExpiry"
                      name="licenseExpiry"
                      type="date"
                      className={inputCls}
                    />
                  </div>
                  <div className="border-t border-sky-500/10 pt-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Vehicle Details <span className="normal-case text-slate-600">(if applicable)</span></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="vehicleNumber" className={labelCls}>Vehicle Reg. Number</label>
                        <input
                          id="vehicleNumber"
                          name="vehicleNumber"
                          type="text"
                          placeholder="e.g. MH-01-AB-1234"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label htmlFor="vehicleModel" className={labelCls}>Vehicle Make / Model</label>
                        <input
                          id="vehicleModel"
                          name="vehicleModel"
                          type="text"
                          placeholder="e.g. Tata Prima"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Error message from server */}
            <ErrorMessage />

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400 font-bold py-2.5 text-sm"
              disabled={isPending}
            >
              {isPending ? 'Creating Account…' : 'Create Account'}
            </Button>

            <p className="text-center text-xs text-slate-500">
              After registration your account will be in <span className="text-amber-400 font-medium">Pending</span> status until an Administrator assigns your role.
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

// Reads the ?message= query param client-side for error display
function ErrorMessage() {
  if (typeof window === 'undefined') return null
  const msg = new URLSearchParams(window.location.search).get('message')
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {msg}
    </div>
  )
}
