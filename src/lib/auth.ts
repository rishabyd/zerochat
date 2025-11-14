import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log(
            `New user created: ${user.email}. Creating settings row...`
          );

          if (!user.id) {
            console.error(
              "User created but ID is missing. Cannot create settings row."
            );
            return;
          }

          try {
            await prisma.userSettings.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id },
            });
            console.log(
              `Successfully created settings row for user ${user.id}`
            );
          } catch (error) {
            console.error(
              "Failed to create settings row for new user:",
              error instanceof Error ? error.stack ?? error : error
            );
          }
        },
      },
    },
  },

  redirectTo: {
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/sign-in",
  },
});

export async function getServerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function getServerUserId() {
  const session = await getServerSession();
  return session?.user.id ?? null;
}
