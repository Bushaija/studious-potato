"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { useMultiplestepForm } from "@/features/on-boarding/hooks/use-multiple-step-form";
import { FormWrapper } from "@/features/on-boarding/components/form-wrapper"; 
import { FormItems } from "@/features/on-boarding/components/form-items";
import { formSteps } from "@/features/on-boarding/components/form-steps";
import { validateField } from "@/features/on-boarding/utils/form-validation";

import SuccessMessage from "@/features/on-boarding/components/success-message";
import SideBar from "@/features/on-boarding/components/side-bar";
import { cn } from "@/lib/utils";
import { getDistrictsByProvince, getHospitalsByDistrict } from "@/features/on-boarding/utils/location-utils";
import { authClient } from "@/lib/auth";
import { useGetFacilityByName } from "@/features/facilities/api/use-get-facility-by-name";

// Extended FormItems to include location data
interface ExtendedFormItems extends FormItems {
  province: string;
  district: string;
  hospital: string;
}

const initialValues: ExtendedFormItems = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  province: "",
  district: "",
  hospital: "",
};

// Define step fields mapping
const stepFields: Record<number, Array<keyof ExtendedFormItems>> = {
  0: ['name', 'email', 'password', 'confirmPassword'],
  1: ['province', 'district', 'hospital'],
  2: [] // Summary step has no fields to validate
};

const simulateUserRegistration = async (userData: {
  name: string;
  email: string;
  password: string;
  facilityId: number | undefined;
}) => {
  console.log("👤 Registering user with data:", userData);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate potential registration scenarios
  const isEmailTaken = userData.email === "test@taken.com";
  
  if (isEmailTaken) {
    throw new Error("Email address is already registered");
  }
  
  // Simulate successful registration
  return {
    id: `user_${Date.now()}`,
    name: userData.name,
    email: userData.email,
    facilityId: userData.facilityId,
    status: "pending_verification",
    createdAt: new Date().toISOString()
  };
};

export default function RegisterPageWithQuery() {
  const router = useRouter();
  const [formData, setFormData] = useState<ExtendedFormItems>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ExtendedFormItems, string>>>({});
  const [districts, setDistricts] = useState<Array<{ value: string; label: string }>>([]);
  const [hospitals, setHospitals] = useState<Array<{ value: string; label: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStage, setRegistrationStage] = useState<'idle' | 'facility_lookup' | 'user_registration' | 'completed'>('idle');

  // const registerMutation = useRegister();
  const { data: facility, isLoading: isFacilityLoading } = useGetFacilityByName(formData.hospital);

  const { 
    nextStep, 
    goTo, 
    currentStepIndex, 
    showSuccessMsg,
    isLastStep,
    isFirstStep 
  } = useMultiplestepForm(formSteps.length);

  useEffect(() => {
    if (formData.province) {
      const provinceDistricts = getDistrictsByProvince(formData.province);
      setDistricts(provinceDistricts);
      // Reset district and hospital when province changes
      setFormData(prev => ({ ...prev, district: "", hospital: "" }));
      setHospitals([]);
    } else {
      setDistricts([]);
      setHospitals([]);
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.province && formData.district) {
      const districtHospitals = getHospitalsByDistrict(formData.province, formData.district);
      setHospitals(districtHospitals);
      // Reset hospital when district changes
      setFormData(prev => ({ ...prev, hospital: "" }));
    } else {
      setHospitals([]);
    }
  }, [formData.district]);

  const updateForm = (data: Partial<ExtendedFormItems>) => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear errors for the fields being updated
    setErrors(prev => {
      const newErrors = { ...prev };
      for (const key in data) {
        delete newErrors[key as keyof ExtendedFormItems];
      }
      return newErrors;
    });
  };

  const validateCurrentStep = () => {
    const currentStepFields = stepFields[currentStepIndex];
    const validationErrors: Partial<Record<keyof ExtendedFormItems, string>> = {};

    // Validate each field in the current step
    for (const field of currentStepFields) {
      if (field === 'name' || field === 'email' || field === 'password' || field === 'confirmPassword') {
        const value = formData[field];
        const error = validateField(field, value);
        if (error) {
          validationErrors[field] = error;
        }
      } else if (field === 'province' || field === 'district' || field === 'hospital') {
        const value = formData[field];
        if (!value || value.trim() === '') {
          validationErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }
      }
    }

    // Password confirmation check (only for step 0)
    if (currentStepIndex === 0 && formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match";
    }

    return validationErrors;
  };

  const performRegistration = async () => {
    try {
      console.log("🚀 Starting registration process...");
      console.log("📝 Form data to be submitted:", {
        name: formData.name,
        email: formData.email,
        province: formData.province,
        district: formData.district,
        hospital: formData.hospital,
        password: formData.password,
        passwordLength: formData.password.length
      });

      // Stage 1: Wait for facility lookup if still loading
      if (isFacilityLoading) {
        setRegistrationStage('facility_lookup');
        toast.loading("Looking up facility...", { id: 'registration' });
        console.log("⏳ Waiting for facility lookup to complete...");
        
        // Wait for facility loading to complete
        while (isFacilityLoading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Check if facility was found
      if (!facility) {
        throw new Error("Facility not found. Please check your hospital selection and try again.");
      }
      
      console.log("🏥 Facility lookup successful:", facility);
      toast.success("Facility found!", { id: 'registration' });
      
      // Small delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stage 2: User Registration using Better Auth with error handling
      setRegistrationStage('user_registration');
      toast.loading("Creating your account...", { id: 'registration' });

      const registrationResult = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        // facilityId: facility?.facilityId
      });

      if (registrationResult.error) {
        // toast.error(registrationResult?.error.message, { id: 'registration' });
        throw new Error(registrationResult.error.message);
      }
      
      console.log("✅ User registration successful:", registrationResult);
      toast.success("Account created successfully!", { id: 'registration' });
      
      // Complete the registration
      setRegistrationStage('completed');
      
      // Show success and navigate
      setTimeout(() => {
        nextStep(); // This will trigger the success message display
        toast.success("Welcome! Please check your email for verification.");
        
        // Redirect to login after showing the final success message
        setTimeout(() => {
          console.log("🚀 Redirecting to login page...");
          router.push('/sign-in');
        }, 2500); // Wait 2.5 seconds to let user read the final toast
      }, 1000);
      
    } catch (error) {
      console.error("❌ Registration failed:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(errorMessage, { id: 'registration' });
      
      setRegistrationStage('idle');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    console.log("🔄 Submit handler called, current step:", currentStepIndex);
    
    // Validate current step
    const validationErrors = validateCurrentStep();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      console.log("❌ Validation errors:", validationErrors);
      return;
    }

    // Clear any existing errors
    setErrors({});

    if (!isLastStep) {
      console.log("➡️ Moving to next step");
      nextStep();
      return;
    }

    // Final submission
    console.log("🎯 Final submission triggered");
    setIsSubmitting(true);
    await performRegistration();
  };

  /**
   * Handle back button navigation
   * - On first step: Navigate back to sign-in page
   * - On other steps: Go to previous step in the form
   */
  const handleBack = () => {
    if (isFirstStep) {
      router.push('/sign-in');
    } else {
      goTo(currentStepIndex - 1);
    }
  };

  /**
   * Get appropriate back button label based on current step
   */
  const getBackButtonLabel = () => {
    if (isFirstStep) {
      return "Back to Sign In";
    }
    return "Previous Step";
  };

  const getCurrentSubmissionLabel = () => {
    // Show loading state if facility is being fetched or form is submitting
    if (isFacilityLoading) {
      return "Looking up facility...";
    }
    
    if (!isSubmitting) return "Create Account";
    
    switch (registrationStage) {
      case 'facility_lookup':
        return "Looking up facility...";
      case 'user_registration':
        return "Creating account...";
      default:
        return "Processing...";
    }
  };

  const CurrentStepComponent = formSteps[currentStepIndex].component;

  const stepProps = {
    formData,
    updateForm,
    errors,
    goTo,
    districts,
    hospitals,
    isSubmitting: isSubmitting || isFacilityLoading,
  };

  return (
    <div
      className={cn(
        "flex justify-between w-11/12 max-w-4xl relative m-1 rounded-lg bg-card dark:bg-transparent p-4",
        currentStepIndex === 1 ? "h-[600px] md:h-[500px]" : "h-[500px]"
      )}
    >
      {!showSuccessMsg && (
        <SideBar 
          currentStepIndex={currentStepIndex} 
          goTo={goTo}
          items={formSteps.map(step => ({
            id: step.id,
            label: step.label,
            step: formSteps.findIndex(s => s.id === step.id) + 1
          }))}
        />
      )}
      <main className={cn(
        showSuccessMsg ? "w-full" : "w-full md:mt-5 md:w-[65%]"
      )}>
        {showSuccessMsg ? (
          <AnimatePresence mode="wait">
            <SuccessMessage 
              title="Registration Successful!"
              description="Please check your email to verify your account. Once verified, you can sign in to your dashboard."
              onAction={() => router.push('/sign-in')}
              actionLabel="Go to Sign In"
            />
          </AnimatePresence>
        ) : (
          <FormWrapper
            title={formSteps[currentStepIndex].title}
            description={formSteps[currentStepIndex].description}
            isSubmitting={isSubmitting || isFacilityLoading}
            onSubmit={handleSubmit}
            onBack={handleBack}
            canGoBack={true} // Always show back button for better UX
            backButtonLabel={getBackButtonLabel()}
            buttonLabel={
              isLastStep 
                ? getCurrentSubmissionLabel()
                : "Next Step"
            }
            buttonClassName={cn(
              "transition-colors",
              isLastStep ? "bg-black hover:bg-gray-700" : "bg-black hover:bg-gray-700",
              (isSubmitting || isFacilityLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            <AnimatePresence mode="wait">
              <CurrentStepComponent
                key={`step-${currentStepIndex}`}
                {...stepProps}
              />
            </AnimatePresence>
          </FormWrapper>
        )}
      </main>
    </div>
  );
}