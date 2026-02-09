import GoogleProvider from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (allowedEmails.includes(email)) {
        return true;
      }
      return false; // Reject sign-in
    },
    async session({ session, token }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
