import { cn } from '@/lib/utils'

export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <div 
            className="flex items-center justify-center gap-2 p-1 w-[28px] h-[28px]"
            style={{
                background: 'linear-gradient(to right, #9B99FE, #2BC8B7)'
            }}
        >
             <div 
                className={cn('size-5 border-3 border-white', className)}
                style={{
                    background: 'linear-gradient(to bottom right, #9B99FE, #2BC8B7)'
                }}
             />
        </div>
    )
}

