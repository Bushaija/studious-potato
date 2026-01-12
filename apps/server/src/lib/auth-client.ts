import { createAuthClient } from "better-auth/client"
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"
// import { auth } from "./auth"

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields({
            user: {
                role: {
                    type: "string",
                    required: false
                }
            }
        }),
        adminClient(),
    ],
    fetchOptions: {
        credentials: "include",
    },
})