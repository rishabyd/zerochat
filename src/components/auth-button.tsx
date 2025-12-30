"use client";

import { signIn, signOut, useSession } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function AuthButton() {
  const { data } = useSession();
  const isSignedIn = !!data?.session?.id;

  return (
    <>
      {isSignedIn ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => signIn.social({ provider: "google" })}
          >
            Sign in with Google
          </Button>
        </div>
      )}
    </>
  );
}
