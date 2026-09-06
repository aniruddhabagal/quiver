import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold leading-none rounded-1 border border-transparent whitespace-nowrap transition-[background,color,border-color,box-shadow,transform] duration-150 ease-ui disabled:opacity-50 disabled:pointer-events-none active:translate-y-px',
  {
    variants: {
      variant: {
        primary: 'bg-arc text-[#0a0820] hover:bg-arc-bright glow-cta',
        ghost: 'bg-transparent text-fg-1 border-hairline-strong hover:bg-glass-strong',
        subtle: 'bg-glass text-fg-2 hover:text-fg-1 hover:bg-glass-strong',
        danger: 'bg-transparent text-denied border-denied/40 hover:bg-denied/10',
        allowed: 'bg-allowed text-[#04140c] hover:brightness-110',
        link: 'bg-transparent text-fg-2 hover:text-fg-1 underline underline-offset-4 px-0',
      },
      size: {
        sm: 'text-[0.8125rem] px-3 py-2',
        md: 'text-[0.9375rem] px-4 py-2.5',
        icon: 'w-9 h-9 p-0',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
