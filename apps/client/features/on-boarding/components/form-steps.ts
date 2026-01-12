import { ComponentType } from "react";
import { FormItems } from "@/features/on-boarding/components/form-items";
import UserInfoForm from "@/features/on-boarding/components/user-info-form";
import FinalStep from "@/features/on-boarding/components/final-step";
import LocationForm from "@/features/on-boarding/components/location-form";

export interface FormStep {
  id: string;
  label: string;
  title: string;
  description: string;
  component: ComponentType<{
    formData: FormItems;
    updateForm: (data: Partial<FormItems>) => void;
    errors: Partial<Record<keyof FormItems, string>>;
    goTo?: (step: number) => void;
  }>;
}

export const formSteps: FormStep[] = [
  {
    id: "info",
    label: "Your info",
    title: "Set up your account",
    description: "Please provide your name, email address, and password.",
    component: UserInfoForm
  },
  {
    id: "plan",
    label: "Select location",
    title: "Choose your location",
    description: "Select your province, district, and hospital.",
    component: LocationForm
  },
  {
    id: "summary",
    label: "Summary",
    title: "Review your details",
    description: "Please review your details before confirming.",
    component: FinalStep
  }
]; 