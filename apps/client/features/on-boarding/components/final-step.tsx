"use client";

import { ReviewField } from "@/features/on-boarding/components/review-field";
import { ReviewSection } from "@/features/on-boarding/components/review-section";
import { FormItems } from "@/features/on-boarding/components/form-items";
import { Step, reviewLabels, reviewTestIds } from "@/features/on-boarding/components/review-constants";

interface FinalStepProps {
  formData: FormItems;
  updateForm: (data: Partial<FormItems>) => void;
  errors: Partial<Record<keyof FormItems, string>>;
  goTo?: (step: number) => void;
}

const FinalStep = ({ formData, goTo }: FinalStepProps) => {
  const { name, email, province, district, hospital } = formData;

  const personalInfo = [
    { label: reviewLabels.personal.fields.name, value: name },
    { label: reviewLabels.personal.fields.email, value: email },
  ];

  const locationInfo = [
    { label: reviewLabels.location.fields.province, value: province },
    { label: reviewLabels.location.fields.district, value: district },
    { label: reviewLabels.location.fields.hospital, value: hospital },
  ];

  return (
    <div className="space-y-4">
      <ReviewSection 
        title={reviewLabels.personal.title}
        onEdit={() => goTo?.(Step.Personal)}
        data-testid={reviewTestIds.personal}
      >
        {personalInfo.map(({ label, value }) => (
          <ReviewField 
            key={label} 
            label={label} 
            value={value} 
          />
        ))}
      </ReviewSection>

      <ReviewSection 
        title={reviewLabels.location.title}
        onEdit={() => goTo?.(Step.Location)}
        data-testid={reviewTestIds.location}
      >
        {locationInfo.map(({ label, value }) => (
          <ReviewField 
            key={label} 
            label={label} 
            value={value} 
          />
        ))}
      </ReviewSection>
    </div>
  );
};

export default FinalStep;