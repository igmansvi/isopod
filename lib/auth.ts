/**
 * @file NextAuth v5 configuration for Isopod.
 * @description Configures username/password authentication using the
 * Credentials provider with bcryptjs password verification and
 * JWT-based sessions.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * @description NextAuth instance configured with credentials-based
 * authentication. Exports route handlers, the `auth` helper for
 * reading sessions in server components / API routes, and the
 * `signIn` / `signOut` server actions.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      /**
       * @description Validates the supplied username and password
       * against the database.
       * @param credentials - The form-submitted credentials object.
       * @returns The authenticated user object or `null` on failure.
       */
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return { id: user.id, name: user.username };
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    /**
     * @description Embeds the user's database ID and username into
     * the JWT so downstream code can identify the user without an
     * extra database lookup.
     */
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.username = user.name;
      }
      return token;
    },

    /**
     * @description Surfaces JWT claims on the client-visible session
     * object so components can read `session.user.id` and
     * `session.user.name`.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
});
