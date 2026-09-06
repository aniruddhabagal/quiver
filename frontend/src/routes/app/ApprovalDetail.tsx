import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, Skeleton } from '../../components/ui/Bits'
import { ApprovalCard } from '../../features/approvals/ApprovalCard'
import { useApproval, useDecide } from '../../lib/hooks'

export default function ApprovalDetail() {
  const { id = '' } = useParams()
  const approval = useApproval(id)
  const decide = useDecide()
  return (
    <>
      <Link to="/app/approvals" className="link t-body-sm inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> All approvals
      </Link>
      <PageHeader title="Approval" description="A single held call, the same card the inbox shows." />
      <div className="max-w-[34rem]">
        {approval.isLoading ? <Skeleton className="h-64" /> : approval.data ? <ApprovalCard approval={approval.data} busy={decide.isPending} onDecide={(decision, reason) => decide.mutate({ id, decision, reason })} /> : <p className="t-body-sm text-fg-3">This approval no longer exists.</p>}
      </div>
    </>
  )
}
