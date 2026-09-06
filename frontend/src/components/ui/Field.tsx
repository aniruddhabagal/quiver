import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full bg-abyss border border-hairline rounded-1 px-3 py-2 text-[0.9375rem] text-fg-1 placeholder:text-fg-4 focus:outline-none focus:border-arc/70 focus:ring-2 focus:ring-arc/25 transition-colors disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-[5.5rem] resize-y leading-relaxed', className)} {...props} />
})

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(control, 'appearance-none pr-8 bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23a9a4d1%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]', className)} {...props}>
      {children}
    </select>
  )
})

interface FieldProps {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="t-body-sm font-medium text-fg-2">
        {label}
      </label>
      {children}
      {error ? <span className="t-caption text-denied">{error}</span> : hint ? <span className="t-caption text-fg-3">{hint}</span> : null}
    </div>
  )
}
