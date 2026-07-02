import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { notificationsApi } from '../api'
import { fmt } from '../utils/formatters'
import { FullPageSpinner } from '../components/common/Spinner'
import { CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { accountId } = useAuthStore()
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', accountId],
    queryFn: () => notificationsApi.list(accountId!),
    enabled: !!accountId,
    refetchInterval: 15_000,
  })

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(accountId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = (notifications as any[]).filter((n: any) => !n.read).length

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {unread > 0 && <p className="text-muted text-sm">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button className="btn-outline flex items-center gap-1 text-sm" onClick={() => markAllMut.mutate()}>
            <CheckCheck size={14} /> Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {(notifications as any[]).map((n: any) => (
          <div
            key={n.id}
            className={`card cursor-pointer transition-all ${!n.read ? 'border-accent-blue/40 bg-accent-blue/5' : ''}`}
            onClick={() => !n.read && markReadMut.mutate(n.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />}
                  <p className="text-white font-medium text-sm">{n.title}</p>
                  <span className="text-muted text-xs bg-bg-secondary px-2 py-0.5 rounded">{n.type}</span>
                </div>
                <p className="text-muted text-sm mt-1">{n.message}</p>
              </div>
              <span className="text-muted text-xs whitespace-nowrap ml-4">{fmt.datetime(n.createdAt)}</span>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-muted">No notifications</p>}
      </div>
    </div>
  )
}
