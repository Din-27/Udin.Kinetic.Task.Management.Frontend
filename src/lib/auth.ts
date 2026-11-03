import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDefaultAvatar } from "@/lib/utils";

const providers: NextAuthOptions["providers"] = [];

// 1. Google OAuth Provider Asli
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
}

// 2. Development Mock Provider untuk Google
providers.push(
  CredentialsProvider({
    id: "google-mock",
    name: "Google Dev Mock",
    credentials: {
      email: { label: "Email", type: "text" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      const name = credentials?.name || "Budi Pratama (Google Dev)";
      const email = credentials?.email || "budi.pratama@gmail.com";
      const id = "usr-google-mock-1";
      const image = getDefaultAvatar(name, email);

      return {
        id,
        name,
        email,
        image,
      };
    },
  })
);

// 3. Microsoft Entra ID / Azure AD Provider
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read Mail.Read",
        },
      },
    })
  );
}

// 4. Development Mock Provider untuk Outlook
providers.push(
  CredentialsProvider({
    id: "azure-ad-mock",
    name: "Outlook Dev Mock",
    credentials: {
      email: { label: "Email", type: "text" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      const name = credentials?.name || "Budi Pratama (Outlook Dev)";
      const email = credentials?.email || "budi.pratama@outlook.com";
      const id = "usr-azure-mock-1";
      const image = getDefaultAvatar(name, email);

      return {
        id,
        name,
        email,
        image,
      };
    },
  })
);

// 5. Email / Local Credentials Provider
providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email) return null;
      const email = credentials.email.trim().toLowerCase();
      const name = credentials.name?.trim() || email.split("@")[0] || "User";
      const image = getDefaultAvatar(name, email);

      return {
        id: `usr-${Date.now()}`,
        name,
        email,
        image,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user?.email) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
          await fetch(`${backendUrl}/api/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image,
              role: (user as any).role || "MEMBER",
            }),
          });
        } catch (err) {
          console.warn("[NextAuth signIn] Gagal sinkronisasi user ke backend:", err);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
      }

      if (user) {
        token.id = user.id;
        token.email = user.email || token.email;
        token.name = user.name || token.name;
        token.picture = user.image || token.picture;
      }

      if (!token.provider) {
        const pic = typeof token.picture === "string" ? token.picture : "";
        if (pic.includes("googleusercontent.com")) {
          token.provider = "google";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id as string) || (session.user as any)?.id;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
        (session.user as any).role = (token as any).role || "MEMBER";

        const pic = typeof session.user.image === "string" ? session.user.image : "";
        const detectedProvider =
          (token as any).provider ||
          (pic.includes("googleusercontent.com") ? "google" : "credentials");
        (session.user as any).provider = detectedProvider;
      }

      const pic = typeof session.user?.image === "string" ? session.user.image : "";
      const detectedProvider =
        (token as any).provider ||
        (pic.includes("googleusercontent.com") ? "google" : "credentials");
      (session as any).provider = detectedProvider;

      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "kinetic-dev-secret-key-32-chars",
};

export async function getCurrentUserFromSession() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${backendUrl}/api/auth/session`, {
      cache: "no-store",
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data?.user) return data.user;
    }
    const session = await getServerSession(authOptions).catch(() => null);
    return session?.user || null;
  } catch (error) {
    console.error("[getCurrentUserFromSession] Error fetching user:", error);
    return null;
  }
}
