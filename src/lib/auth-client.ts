import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // baseURL optional if same domain
});

export const {
    signIn,
    signOut,
    signUp,
    useSession
} = authClient;