import { useForm } from 'react-hook-form'
import { PageHeader } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { useAuth } from '../../lib/auth'
import { apiFetch } from '../../lib/api'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function Settings() {
  const { user } = useAuth()
  const profile = useForm({ defaultValues: { display_name: user?.display_name ?? '', email: user?.email ?? '' } })
  const defaults = useForm({ defaultValues: { approval_timeout_s: 120, agent_header: 'X-Agent-Name', slack_webhook: '' } })
  const save = useMutation({
    mutationFn: (body: unknown) => apiFetch('/settings', { method: 'PUT', body }),
    onSuccess: () => toast.success('Saved'),
  })

  return (
    <>
      <PageHeader title="Settings" description="Your account and the defaults new loadouts start with." />
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <form className="panel p-5 flex flex-col gap-4" onSubmit={profile.handleSubmit((v) => save.mutate({ profile: v }))}>
          <h2 className="t-title">Profile</h2>
          <Field label="Name" htmlFor="p-name">
            <Input id="p-name" {...profile.register('display_name')} />
          </Field>
          <Field label="Email" htmlFor="p-email">
            <Input id="p-email" type="email" {...profile.register('email')} />
          </Field>
          <Button type="submit" variant="ghost" className="self-start" disabled={save.isPending}>
            Save profile
          </Button>
        </form>
        <form className="panel p-5 flex flex-col gap-4" onSubmit={defaults.handleSubmit((v) => save.mutate({ defaults: v }))}>
          <h2 className="t-title">Defaults for new loadouts</h2>
          <Field label="Approval timeout, seconds" htmlFor="d-timeout" hint="How long a held call waits before it expires.">
            <Input id="d-timeout" type="number" min={15} max={600} {...defaults.register('approval_timeout_s', { valueAsNumber: true })} />
          </Field>
          <Field label="Agent name header" htmlFor="d-header" hint="Agents can identify themselves with this header. Otherwise the key name is used.">
            <Input id="d-header" {...defaults.register('agent_header')} />
          </Field>
          <Field label="Slack incoming webhook" htmlFor="d-slack" hint="Held calls post a card with a review link.">
            <Input id="d-slack" placeholder="https://hooks.slack.com/services/…" {...defaults.register('slack_webhook')} />
          </Field>
          <Button type="submit" variant="ghost" className="self-start" disabled={save.isPending}>
            Save defaults
          </Button>
        </form>
        <section className="panel p-5 border-denied/30 lg:col-span-2">
          <h2 className="t-title text-denied">Danger zone</h2>
          <p className="t-body-sm text-fg-3 mt-1 mb-4">Deleting the account removes every server, loadout, key and call record. Published endpoints stop answering.</p>
          <Button variant="danger" onClick={() => save.mutate({ delete_account: true })}>
            Delete account
          </Button>
        </section>
      </div>
    </>
  )
}
