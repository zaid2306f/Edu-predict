import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { resetPassword } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get('token') ?? '' },
  })

  const onSubmit = async (data: { token: string; password: string }) => {
    setLoading(true)
    try {
      await resetPassword(data.token, data.password)
      toast.success('Password reset successfully')
      navigate('/login')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h2 className="text-2xl font-bold">Reset password</h2>
      <p className="mt-1 text-sm text-muted">Enter the token from your email and choose a new password</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <Label>Reset Token</Label>
          <Input className="mt-1.5" {...register('token')} />
          {errors.token && <p className="mt-1 text-xs text-danger">{String(errors.token.message)}</p>}
        </div>
        <div>
          <Label>New Password</Label>
          <Input type="password" className="mt-1.5" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-danger">{String(errors.password.message)}</p>}
        </div>
        <div>
          <Label>Confirm Password</Label>
          <Input type="password" className="mt-1.5" {...register('confirm')} />
          {errors.confirm && <p className="mt-1 text-xs text-danger">{String(errors.confirm.message)}</p>}
        </div>
        <Button type="submit" className="w-full" variant="gradient" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset Password
        </Button>
      </form>
    </motion.div>
  )
}
