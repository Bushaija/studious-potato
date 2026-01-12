"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { DynamicField } from "./field-components";
import { SheetModalLayout, FullPageLayout, getGridClasses, getGridContainerClasses } from "./form-layouts";
import { 
  FormSchemaConfig, 
  shouldUseModal, 
  createFormSchema,
  type FormMode 
} from "@/lib/form-schema";

interface DynamicFormProps<T = any> {
  config: FormSchemaConfig;
  data?: Partial<T>;
  onSubmit: (data: T) => Promise<{ error?: string } | void>;
  onSuccess?: (data: T) => void;
  onCancel?: () => void;
  className?: string;
  // For page forms - navigation
  redirectPath?: string;
  // Override layout decision
  forceLayout?: "modal" | "page";
  // Modal control props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DynamicForm<T = any>({
  config,
  data,
  onSubmit,
  onSuccess,
  onCancel,
  className,
  redirectPath,
  forceLayout,
  open,
  onOpenChange,
}: DynamicFormProps<T>) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  
  // Create Zod schema from field config
  const schema = React.useMemo(() => createFormSchema(config.fields), [config.fields]);
  
  // Determine layout
  const useModal = forceLayout 
    ? forceLayout === "modal"
    : shouldUseModal(config.fields.length, config.maxFieldsForModal, config.layout);
  
  // Initialize form with default values
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: React.useMemo(() => {
      const defaults: Record<string, any> = {};
      config.fields.forEach(field => {
        if (data && field.name in data) {
          defaults[field.name] = data[field.name];
        } else {
          // Set sensible defaults based on field type
          switch (field.type) {
            case "checkbox":
            case "switch":
              defaults[field.name] = false;
              break;
            case "number":
              defaults[field.name] = field.min || 0;
              break;
            case "multiselect":
              defaults[field.name] = [];
              break;
            default:
              defaults[field.name] = "";
          }
        }
      });
      return defaults;
    }, [config.fields, data]),
  });

  // Handle form submission
  const handleSubmit = (formData: any) => {
    startTransition(async () => {
      try {
        const result = await onSubmit(formData);
        
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        
        toast.success(
          config.mode === "create" ? "Created successfully" :
          config.mode === "edit" ? "Updated successfully" :
          "Saved successfully"
        );
        
        onSuccess?.(formData);
        
        // Handle navigation for page forms
        if (!useModal && redirectPath) {
          router.push(redirectPath);
        }
      } catch (error) {
        toast.error("An error occurred. Please try again.");
        console.error("Form submission error:", error);
      }
    });
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (!useModal && redirectPath) {
      router.back();
    }
  };

  // Filter visible fields based on dependencies
  const visibleFields = React.useMemo(() => {
    const formValues = form.watch();
    return config.fields.filter(field => {
      if (field.dependsOn) {
        return field.showWhen?.(formValues) ?? true;
      }
      return true;
    });
  }, [config.fields, form.watch()]);

  // Render fields in grid layout
  const renderFields = () => {
    const columns = config.columns || 4;
    const gridClasses = getGridContainerClasses(columns);
    
    return (
      <div className={gridClasses}>
        {visibleFields.map((field) => (
          <DynamicField
            key={field.name}
            field={field}
            control={form.control}
            className={getGridClasses(field.colSpan || 1, columns)}
          />
        ))}
      </div>
    );
  };

  // Choose layout component
  const LayoutComponent = useModal ? SheetModalLayout : FullPageLayout;

  return (
    <Form {...form}>
      <LayoutComponent
        config={config}
        onSubmit={form.handleSubmit(handleSubmit)}
        isPending={isPending}
        onCancel={handleCancel}
        className={className}
        open={open}
        onOpenChange={onOpenChange}
      >
        {renderFields()}
      </LayoutComponent>
    </Form>
  );
}

// Hook for creating form configurations
export function useFormConfig<T = any>(
  baseConfig: Omit<FormSchemaConfig, "mode">,
  mode: FormMode,
  data?: Partial<T>
): FormSchemaConfig {
  return React.useMemo(() => ({
    ...baseConfig,
    mode,
    // Adjust submit text based on mode
    submitText: baseConfig.submitText || (
      mode === "create" ? "Create" :
      mode === "edit" ? "Update" :
      "Save"
    ),
  }), [baseConfig, mode]);
}

// Pre-configured form components for common use cases
export function CreateForm<T = any>(props: Omit<DynamicFormProps<T>, "config"> & { 
  config: Omit<FormSchemaConfig, "mode"> 
}) {
  const config = useFormConfig(props.config, "create", props.data);
  return <DynamicForm {...props} config={config} />;
}

export function EditForm<T = any>(props: Omit<DynamicFormProps<T>, "config"> & { 
  config: Omit<FormSchemaConfig, "mode"> 
}) {
  const config = useFormConfig(props.config, "edit", props.data);
  return <DynamicForm {...props} config={config} />;
}

export function DetailsForm<T = any>(props: Omit<DynamicFormProps<T>, "config"> & { 
  config: Omit<FormSchemaConfig, "mode"> 
}) {
  const config = useFormConfig(props.config, "details", props.data);
  return <DynamicForm {...props} config={config} />;
}
