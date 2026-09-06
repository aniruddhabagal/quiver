import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { AuthShell } from './AuthShell'
import { Field, Input } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../lib/auth'

const schema = z.object({
  display_name: z.string().min(2, 'Tell us what to call you'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})
type Form = z.infer<typeof schema>

export default function SignupPage() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const { register, handleSubmit, setError, formState } = useForm<Form>({ resolver: zodResolver(schema) })

  const submit = handleSubmit(async (v) => {
    try {
      await signup(v.email, v.password, v.display_name)
      nav('/app')
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Could not create the account' })
    }
  })

  return (
    <AuthShell title="Create an account" lede="One account, as many loadouts as you like." alt={<>Already have one? <Link to="/login" className="link text-fg-1">Sign in</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" htmlFor="name" error={formState.errors.display_name?.message}>
          <Input id="name" autoComplete="name" {...register('display_name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" hint="Eight characters or more." error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        {formState.errors.root && <p className="t-body-sm text-denied">{formState.errors.root.message}</p>}
        <Button type="submit" variant="primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Creating' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
