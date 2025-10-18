"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "./ui/button";

// Authentication button component that shows different states based on user login status
export function AuthButton() {
  return (
    <>
      {/* Show user profile button when user is signed in */}
      <SignedIn>
        <div className="flex items-center gap-4">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8", // Set avatar size to 32x32 pixels
              },
            }}
          />
        </div>
      </SignedIn>

      {/* Show sign in/up buttons when user is not authenticated */}
      <SignedOut>
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <Button size="sm" variant="outline">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm" variant="default">
              Sign up
            </Button>
          </SignUpButton>
        </div>
      </SignedOut>
    </>
  );
}
