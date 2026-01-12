import { useMemo } from "react";
import { FormSchema } from "../types";

export const useDynamicColumns = (schema: FormSchema | null) => {
    return useMemo(() => {
      if (!schema) return [];

      
      const columns: Array<{
        key: string;
        label: string;
        type: string;
        width: string;
        required: boolean;
        validation?: any;
        readonly: boolean;
        computationFormula?: string;
      }> = [];
      
      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.key === 'activity_name' || field.key === 'activity_type') return;
          
          let width = '90px'; // default
          if (field.type === 'textarea') width = '180px';
          if (field.key === 'unit_cost') width = '100px';
          if (field.type === 'calculated') width = '100px';
          
          columns.push({
            key: field.key,
            label: field.label,
            type: field.type,
            width,
            required: field.required || false,
            validation: field.validation,
            readonly: field.readonly || field.type === 'calculated',
            computationFormula: field.computationFormula
          });
        });
      });
      
      return columns;
    }, [schema]);
  }