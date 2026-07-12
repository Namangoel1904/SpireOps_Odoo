import { login } from './actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
            <span className="text-xl font-bold text-sky-400">T</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-50">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to access your command center</p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
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
                className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
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
                className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          {message && (
            <div className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              {message}
            </div>
          )}

          <Button
            formAction={login}
            className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400 font-semibold"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-sky-400 hover:text-sky-300">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
