import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api'
import { QK } from '../query-keys'
import type {
  AnalyticsOverview,
  ApiKey,
  Approval,
  Call,
  Loadout,
  LoadoutVersion,
  OutcomeSlice,
  Server,
  TimeseriesPoint,
  ToolSpec,
  TopTool,
  UpstreamTool,
  User,
  VersionDiff,
} from '../types'

export const useMe = () => useQuery({ queryKey: QK.me, queryFn: () => apiFetch<User>('/auth/me'), retry: false })

/* ---- servers ---- */
export const useServers = () => useQuery({ queryKey: QK.servers, queryFn: () => apiFetch<Server[]>('/servers') })
export const useServer = (id: string) => useQuery({ queryKey: QK.server(id), queryFn: () => apiFetch<Server>(`/servers/${id}`), enabled: !!id })
export const useServerTools = (id: string) =>
  useQuery({ queryKey: QK.serverTools(id), queryFn: () => apiFetch<UpstreamTool[]>(`/servers/${id}/tools`), enabled: !!id })

export function useCreateServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; url: string; transport: Server['transport']; auth: { type: Server['auth']['type']; header_name?: string; value?: string } }) =>
      apiFetch<Server>('/servers', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.servers }),
  })
}
export function useProbeServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<Server>(`/servers/${id}/probe`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.servers }),
  })
}
export function useDeleteServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/servers/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.servers }),
  })
}

/* ---- loadouts ---- */
export const useLoadouts = () => useQuery({ queryKey: QK.loadouts, queryFn: () => apiFetch<Loadout[]>('/loadouts') })
export const useLoadout = (id: string) => useQuery({ queryKey: QK.loadout(id), queryFn: () => apiFetch<Loadout>(`/loadouts/${id}`), enabled: !!id })
export const useVersions = (id: string) =>
  useQuery({ queryKey: QK.versions(id), queryFn: () => apiFetch<LoadoutVersion[]>(`/loadouts/${id}/versions`), enabled: !!id })
export const useDiff = (id: string, from: number, to: number) =>
  useQuery({
    queryKey: QK.diff(id, from, to),
    queryFn: () => apiFetch<VersionDiff>(`/loadouts/${id}/diff`, { params: { from, to } }),
    enabled: !!id && from >= 0 && to > from,
  })

export function useCreateLoadout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) => apiFetch<Loadout>('/loadouts', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.loadouts }),
  })
}
export function useSaveTools(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tools: ToolSpec[]) => apiFetch<Loadout>(`/loadouts/${id}/tools`, { method: 'PUT', body: { tools } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.loadout(id) })
      void qc.invalidateQueries({ queryKey: QK.loadouts })
      void qc.invalidateQueries({ queryKey: QK.versions(id) })
    },
  })
}
export function usePublish(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (publish: boolean) => apiFetch<Loadout>(`/loadouts/${id}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.loadout(id) })
      void qc.invalidateQueries({ queryKey: QK.loadouts })
    },
  })
}
export function useUpdateLoadout(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Pick<Loadout, 'name' | 'description' | 'settings'>>) => apiFetch<Loadout>(`/loadouts/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.loadout(id) })
      void qc.invalidateQueries({ queryKey: QK.loadouts })
    },
  })
}
export function useRollback(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (version: number) => apiFetch<Loadout>(`/loadouts/${id}/versions/${version}/rollback`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.loadout(id) })
      void qc.invalidateQueries({ queryKey: QK.versions(id) })
    },
  })
}
export function usePlaygroundCall(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { alias: string; arguments: Record<string, unknown> }) => apiFetch<Call>(`/loadouts/${id}/playground/call`, { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['calls'] }),
  })
}

/* ---- approvals ---- */
export const useApprovals = (status?: Approval['status']) =>
  useQuery({ queryKey: QK.approvals(status), queryFn: () => apiFetch<Approval[]>('/approvals', { params: { status } }) })
export const useApproval = (id: string) => useQuery({ queryKey: QK.approval(id), queryFn: () => apiFetch<Approval>(`/approvals/${id}`), enabled: !!id })
export function useDecide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approved' | 'denied'; reason?: string }) =>
      apiFetch<Approval>(`/approvals/${id}/decide`, { method: 'POST', body: { decision, reason } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['calls'] })
      void qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

/* ---- calls ---- */
export const useCalls = (filters: { loadout_id?: string; status?: string; q?: string; limit?: number }) =>
  useQuery({ queryKey: QK.calls(filters), queryFn: () => apiFetch<Call[]>('/calls', { params: filters }) })
export const useCall = (id: string | null) =>
  useQuery({ queryKey: QK.call(id ?? ''), queryFn: () => apiFetch<Call>(`/calls/${id}`), enabled: !!id })

/* ---- keys ---- */
export const useKeys = () => useQuery({ queryKey: QK.keys, queryFn: () => apiFetch<ApiKey[]>('/keys') })
export function useCreateKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; scope: ApiKey['scope'] }) => apiFetch<ApiKey & { plaintext: string }>('/keys', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.keys }),
  })
}
export function useRevokeKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QK.keys }),
  })
}

/* ---- analytics ---- */
export const useOverview = () => useQuery({ queryKey: QK.analytics('overview'), queryFn: () => apiFetch<AnalyticsOverview>('/analytics/overview') })
export const useTimeseries = (hours = 24, step = 60) =>
  useQuery({ queryKey: QK.analytics('timeseries', { hours, step }), queryFn: () => apiFetch<TimeseriesPoint[]>('/analytics/timeseries', { params: { hours, step } }) })
export const useTopTools = () => useQuery({ queryKey: QK.analytics('top-tools'), queryFn: () => apiFetch<TopTool[]>('/analytics/top-tools') })
export const useOutcomes = () => useQuery({ queryKey: QK.analytics('outcomes'), queryFn: () => apiFetch<OutcomeSlice[]>('/analytics/outcomes') })
