import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormWrapperProps {
  children: React.ReactNode;
  isSubmitting: boolean;
  onSubmit: (formData: FormData) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  buttonLabel: string;
  backButtonLabel?: string;
  className?: string;
  buttonClassName?: string;
  title?: string;
  description?: string;
}

export function FormWrapper({
  children,
  onSubmit,
  isSubmitting,
  onBack,
  canGoBack,
  buttonLabel,
  backButtonLabel = "Go Back",
  className,
  buttonClassName,
  title,
  description
}: FormWrapperProps) {
  return (
    <form 
      // onSubmit={onSubmit} 
      action={onSubmit}
      className={cn("flex flex-col justify-between h-full", className)}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-lg font-medium mb-2">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
      <div className="flex justify-between mt-4">
        {canGoBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backButtonLabel}
          </Button>
        )}
        <Button
          type="submit"
          className={cn(
            "ml-auto",
            buttonClassName,
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {buttonLabel}
        </Button>
      </div>
    </form>
  );
} 