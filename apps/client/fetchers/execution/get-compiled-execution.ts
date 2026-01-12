import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type GetCompiledExecutionRequest = InferRequestType<
    (typeof client)["execution"]["compiled"]["$get"]
>["query"];

// Type inference for response data
export type GetCompiledExecutionResponse = InferResponseType<
    (typeof client)["execution"]["compiled"]["$get"]
>;

export async function getCompiledExecution(query: GetCompiledExecutionRequest) {
    const response = await (client as any).execution.compiled.$get({
        query,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }

    const data = await response.json();
    return data as GetCompiledExecutionResponse;
}

