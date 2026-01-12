import { honoClient as client } from "@/api-client/index";
import { baseFetch } from "@/types/api";
import { Update } from "drizzle-orm";
import { useDeprecatedAnimatedState } from "framer-motion";
import type { InferRequestType, InferResponseType } from "hono";

export type CreateFormDataParams = {
    schemaId: number;
    entityType: string;
    projectId: number;
    facilityId: number;
    reportingPeriodId?: number;
    formData: Record<string, any>;
    metadata?: Record<string, any>;
};

export type UpdateFormDataParams = CreateFormDataParams & {
    id: number;
};

export type GetFormDataParams = {
    schemaId?: number;
    entityType?: string;
    projectId?: number;
    facilityId?: number;
    reportingPeriodId?: number;
    page?: number;
    limit?: number;
};

export async function createFormData(params: CreateFormDataParams) {
    return baseFetch(() =>
        client.activities.$post({ json: params})
    );
};

export async function updateFormData(params: UpdateFormDataParams) {
    const { id, ...updateData } = params;
    return baseFetch(() =>
        client.activities.$patch({
            param: { id: id.toString() },
            json: updateData
        })
    );
};

export async function getFormData(params: GetFormDataParams = {}) {
    return baseFetch(() =>
      client.activities.$get({ query: params })
    );
  }
  
export async function getFormDataById(id: number) {
    return baseFetch(() =>
        client.activities[':id'].$get({
        param: { id: id.toString() }
        })
    );
}