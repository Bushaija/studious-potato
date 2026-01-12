import { useMutation } from "@tanstack/react-query";
import validateAccountingEquation, { type ValidateAccountingEquationRequest, type ValidateAccountingEquationResponse } from "@/fetchers/execution/validate-accounting-equation";

function useValidateAccountingEquation() {
  return useMutation<ValidateAccountingEquationResponse, Error, ValidateAccountingEquationRequest>({
    mutationFn: validateAccountingEquation,
  });
}

export default useValidateAccountingEquation;


