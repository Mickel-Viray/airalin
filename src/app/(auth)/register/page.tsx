'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '../actions'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const result = await signup(formData)
    
    if (result?.error) setError(result.error)
    if (result?.success) setSuccess(result.success)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <BrainCircuit className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-2xl tracking-tight">Airalin</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Create an account</h2>
          <p className="text-slate-500 mt-2 text-sm">Start your AI-powered study journey</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-md">{error}</div>}
          {success && <div className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 p-3 rounded-md">{success}</div>}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="student@dhvsu.edu.ph" required disabled={isLoading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Create a password"
                  className="w-full h-10 pl-3 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}