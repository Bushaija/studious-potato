"use client"

import { InputField, SelectField } from "@/features/on-boarding/components/form-field";
import { formFields } from "@/features/on-boarding/schema/onboarding-schema";
import { getProvinces } from "@/features/on-boarding/utils/location-utils";
import { FormWrapper } from "@/features/on-boarding/components/form-wrapper";
import { FormItems } from "@/features/on-boarding/components/form-items";

interface LocationFormProps {
  formData: FormItems;
  updateForm: (data: Partial<FormItems>) => void;
  errors: Partial<Record<keyof FormItems, string>>;
  goTo?: (step: number) => void;
  districts?: Array<{ value: string; label: string }>;
  hospitals?: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
  onSubmit?: (formData: FormData) => void;
}

export default function LocationForm({ 
  formData, 
  updateForm, 
  errors,
  districts = [],
  hospitals = [],
  isSubmitting = false,
  onSubmit = () => {}
}: LocationFormProps) {
  const handleInputChange = (field: keyof FormItems, value: string) => {
    updateForm({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {formFields.map((field) => {
        const commonProps = {
          id: field.id,
          label: field.label,
          value: formData[field.id],
          onChange: (value: string) => handleInputChange(field.id, value),
          error: errors[field.id],
          required: field.required,
          placeholder: field.placeholder,
          disabled: (field.id === "district" && !formData.province) ||
                  (field.id === "hospital" && !formData.district)
        };

        return field.type === "select" ? (
          <SelectField
            key={field.id}
            {...commonProps}
            options={
              field.id === "province"
              ? getProvinces()
              : field.id === "district"
              ? districts
              : hospitals
            }
          />
        ) : (
          <InputField
            key={field.id}
            {...commonProps}
            type={field.type}
          />
        );
      })}
    </div>
  );
}
