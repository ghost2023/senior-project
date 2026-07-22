import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

import { roles } from "./auth-roles";

export const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient({ roles })],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * The sign-up form only collects a username + password. Better Auth's core
 * `signUp.email` endpoint still requires an `email`, so we derive a unique,
 * unreachable placeholder — no real mailbox is ever used or validated.
 */
export function signUpWithUsername(input: {
  username: string;
  password: string;
}) {
  return signUp.email({
    email: `${input.username}@users.noreply.local`,
    name: input.username,
    username: input.username,
    password: input.password,
  });
}
