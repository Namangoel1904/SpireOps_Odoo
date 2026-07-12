import { signup } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <span className="text-xl font-bold text-emerald-400">T</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-50">Create an Account</h2>
          <p className="mt-2 text-sm text-slate-400">Sign up to join SpireOps</p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="fullName" className="sr-only">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Full Name"
                className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email address"
                className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password"
                className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          {message && (
            <div className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              {message}
            </div>
          )}

          <Button
            formAction={signup}
            className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold"
          >
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Sign In
          </Link>
        </div>

        <div className="mt-2 text-center text-xs text-slate-500">
          Note: New sign-ups default to a 'pending' role.
        </div>
      </div>
    </div>
  )
}
