import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { mockUsersStore } from "./mock-data";

// TODO: replace with Supabase auth helper
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Invalid credentials");
        }

        const user = mockUsersStore.find(
          (u) => u.email?.toLowerCase() === credentials.email.toLowerCase()
        );

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        }

        // Return a mock user session for new/custom credentials
        return {
          id: `user-${Date.now()}`,
          name: credentials.email.split("@")[0],
          email: credentials.email,
          image: null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "mock-secret-for-development-and-testing",
};
