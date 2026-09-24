import { Bell, Sparkles } from 'lucide-react'
import type { Client, Post } from '../types'
import { useUi } from '../ui'
import { FORMAT_LABEL, STATUS_META } from '../lib/meta'
import { needsNudge } from '../lib/insights'
import { PlatformBadge, cx } from './ui'

/** Card compatta di un contenuto, usata in calendari e pipeline */
export function PostCard({
  post,
  client,
  showClient = false,
  showDate = false,
  draggable = false,
  className,
}: {
  post: Post
  client?: Client
  showClient?: boolean
  showDate?: string | false | boolean
  draggable?: boolean
  className?: string
}) {
  const openPost = useUi((s) => s.openPost)
  const meta = STATUS_META[post.status]
  const nudge = needsNudge(post)
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/post-id', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => openPost(post.id)}
      className={cx(
        'group relative w-full overflow-hidden rounded-xl bg-surface p-2.5 pl-3 text-left shadow-soft ring-1 ring-stone-900/5 transition hover:-translate-y-px hover:shadow-lift',
        post.status === 'pubblicato' && 'opacity-60',
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: client?.color ?? '#a8a29e' }} />
      <div className="flex items-center gap-1.5">
        <PlatformBadge platform={post.platform} />
        <span className="text-[11px] font-semibold text-stone-500">
          {showDate ? `${typeof showDate === 'string' ? showDate : post.date.slice(8)} · ` : ''}
          {post.time} · {FORMAT_LABEL[post.format]}
        </span>
        {post.aiGenerated && <Sparkles size={11} className="text-violet-400" />}
        <span className={cx('ml-auto size-2 shrink-0 rounded-full', meta.dot)} title={meta.label} />
      </div>
      {showClient && client && <p className="mt-1.5 truncate text-[11px] font-bold tracking-wide uppercase" style={{ color: client.color }}>{client.name}</p>}
      <p className={cx('line-clamp-2 text-[13px] leading-snug font-medium text-stone-800', showClient ? 'mt-0.5' : 'mt-1.5')}>
        {post.title || post.copy || <span className="text-stone-400 italic">Senza titolo</span>}
      </p>
      {nudge && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <Bell size={11} /> Da sollecitare
        </p>
      )}
      {post.feedback && post.status === 'bozza' && (
        <p className="mt-1.5 line-clamp-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">↺ {post.feedback}</p>
      )}
    </button>
  )
}
