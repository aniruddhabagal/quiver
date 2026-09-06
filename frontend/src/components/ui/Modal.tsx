import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: boolean
  wide?: boolean
}

/** Centre dialog, or a right-hand sheet when `side` is set. */
export function Modal({ open, onOpenChange, title, description, children, footer, side = false, wide = false }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-slate border border-hairline-strong text-fg-1 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] focus:outline-none flex flex-col',
            side
              ? 'inset-y-0 right-0 w-full max-w-[34rem] data-[state=open]:animate-[sheet-in_260ms_var(--ease-ui)]'
              : cn('left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] rounded-3 data-[state=open]:animate-[pop-in_220ms_var(--ease-ui)]', wide ? 'max-w-3xl' : 'max-w-lg'),
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-hairline">
            <div>
              <Dialog.Title className="t-display-sm text-fg-1">{title}</Dialog.Title>
              {description && <Dialog.Description className="t-body-sm text-fg-3 mt-1">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="text-fg-3 hover:text-fg-1 rounded-1 p-1 -mr-1" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className={cn('px-6 py-5', side && 'flex-1 overflow-y-auto')}>{children}</div>
          {footer && <div className="px-6 py-4 border-t border-hairline flex items-center justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
