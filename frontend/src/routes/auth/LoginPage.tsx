import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { AuthShell } from './AuthShell'
import { Field, Input } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../lib/auth'

const schema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(8, 'At least 8 characters') })
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const { register, handleSubmit, setError, formState } = useForm<Form>({ resolver: zodResolver(schema) })

  const submit = handleSubmit(async (v) => {
    try {
      await login(v.email, v.password)
      nav('/app')
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Could not sign in' })
    }
  })

  return (
    <AuthShell title="Sign in" lede="Your loadouts, keys and approvals." alt={<>New here? <Link to="/signup" className="link text-fg-1">Create an account</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        {formState.errors.root && <p className="t-body-sm text-denied">{formState.errors.root.message}</p>}
        <Button type="submit" variant="primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
