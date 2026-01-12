import { useEffect, useState } from "react"
import { SchemaResponse } from "../types"

export const useFormSchema = (projectType: string, facilityType: string, moduleType: string = 'planning') => {
    const [schema, setSchema] = useState<SchemaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(!projectType || !facilityType) return;

        const fetchSchema = async () => {
            setIsLoading(true);
            setError(null);

            try {
                await new Promise(resolve => setTimeout(resolve, 800));

                const mockSchema: SchemaResponse = {
                    id: 1,
                    name: `${projectType} Planning Form - ${facilityType}`,
                    version: "1.0",
                    projectType: projectType as any,
                    facilityType: facilityType as any,
                    moduleType: "planning",
                    isActive: true,
                    schema: {
                      title: "Annual Budget Planning Form version 3",
                      version: "1.0",
                      sections: [
                        {
                          id: "activity_details",
                          title: "Activity Details",
                          fields: [
                            {
                              key: "activity_name",
                              type: "readonly",
                              label: "Activity",
                              required: true
                            }
                          ]
                        },
                        {
                          id: "planning_data",
                          title: "Planning Data",
                          fields: [
                            {
                              key: "frequency",
                              type: "number",
                              label: "Frequency",
                              required: true,
                              validation: { min: 0, step: 1 },
                              defaultValue: 1
                            },
                            {
                              key: "unit_cost",
                              type: "currency",
                              label: "Unit Cost ($)",
                              required: true,
                              validation: { min: 0 }
                            }
                          ]
                        },
                        {
                          id: "quarterly_counts",
                          title: "Quarterly Counts",
                          fields: [
                            {
                              key: "q1_count",
                              type: "number",
                              label: "Q1 Count",
                              required: true,
                              validation: { min: 0 }
                            },
                            {
                              key: "q2_count",
                              type: "number",
                              label: "Q2 Count",
                              required: true,
                              validation: { min: 0 }
                            },
                            {
                              key: "q3_count",
                              type: "number",
                              label: "Q3 Count",
                              required: true,
                              validation: { min: 0 }
                            },
                            {
                              key: "q4_count",
                              type: "number",
                              label: "Q4 Count",
                              required: true,
                              validation: { min: 0 }
                            }
                          ]
                        },
                        {
                          id: "calculated_amounts",
                          title: "Calculated Amounts",
                          fields: [
                            {
                              key: "q1_amount",
                              type: "calculated",
                              label: "Q1 Amount ($)",
                              readonly: true,
                              computationFormula: "unit_cost * q1_count"
                            },
                            {
                              key: "q2_amount",
                              type: "calculated",
                              label: "Q2 Amount ($)",
                              readonly: true,
                              computationFormula: "unit_cost * q2_count"
                            },
                            {
                              key: "q3_amount",
                              type: "calculated",
                              label: "Q3 Amount ($)",
                              readonly: true,
                              computationFormula: "unit_cost * q3_count"
                            },
                            {
                              key: "q4_amount",
                              type: "calculated",
                              label: "Q4 Amount ($)",
                              readonly: true,
                              computationFormula: "unit_cost * q4_count"
                            },
                            {
                              key: "total_budget",
                              type: "calculated",
                              label: "Total Budget ($)",
                              readonly: true,
                              computationFormula: "q1_amount + q2_amount + q3_amount + q4_amount"
                            }
                          ]
                        },
                        {
                          id: "additional_info",
                          title: "Additional Information",
                          fields: [
                            {
                              key: "comments",
                              type: "textarea",
                              label: "Comments",
                              helpText: "Additional notes or comments about this activity",
                              required: false
                            }
                          ]
                        }
                      ],
                      description: "Quarterly budget planning for health facility activities"
                    },
                    metadata: {
                      createdFor: `${projectType}_${facilityType}`,
                      description: `Annual budget planning form for ${projectType} program at ${facilityType} facilities`,
                      lastUpdated: new Date().toISOString()
                    }
                };
                  
                  setSchema(mockSchema);
            } catch (err) {
                setError('Failed to load form schema');
                console.error('Schema fetch error:', err);
            } finally {
                setIsLoading(false);
            }
            };
            
        fetchSchema();
    }, [projectType, facilityType, moduleType]);

    return { schema, isLoading, error };
    };