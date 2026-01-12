import { cn } from "@/lib/utils"

interface ButtonSpinnerProps {
  className?: string
  size?: number // pixels
  strokeWidth?: number
}

export function ButtonSpinner({ className, size = 16, strokeWidth = 2 }: ButtonSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
} 