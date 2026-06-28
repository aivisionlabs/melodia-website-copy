/**
 * NextAuth.js Configuration
 * Handles user authentication with Email/Password and Google OAuth
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import {
  usersTable,
  accountTable,
  sessionTable,
  verificationTokenTable,
  songRequestsTable,
  paymentsTable,
  anonymousUsersTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: usersTable as any,
    accountsTable: accountTable as any,
    sessionsTable: sessionTable as any,
    verificationTokensTable: verificationTokenTable as any,
  }),

  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        anonymousId: { label: 'Anonymous ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        try {
          // Find user by email
          const users = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, credentials.email))
            .limit(1);

          const user = users[0];

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Verify email is verified
          if (!user.email_verified) {
            throw new Error('Please verify your email before logging in');
          }

          // Verify password
          if (!user.password_hash) {
            throw new Error('Invalid login method. Please use social login.');
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            throw new Error('Invalid email or password');
          }

          // Handle anonymous user data merge (credentials path)
          // Priority: 1) anonymousId from credentials (if provided), 2) anonymousId from cookie
          const { getAnonymousCookie, deleteAnonymousCookie } = await import('@/lib/auth/cookies');
          const anonymousIdFromCookie = await getAnonymousCookie();
          const anonymousId = credentials.anonymousId || anonymousIdFromCookie;

          if (anonymousId) {
            try {
              const userId = user.id;

              await db
                .update(songRequestsTable)
                .set({
                  user_id: userId,
                  anonymous_user_id: null,
                })
                .where(eq(songRequestsTable.anonymous_user_id, anonymousId));

              await db
                .update(paymentsTable)
                .set({
                  user_id: userId,
                  anonymous_user_id: null,
                })
                .where(eq(paymentsTable.anonymous_user_id, anonymousId));

              await db
                .delete(anonymousUsersTable)
                .where(eq(anonymousUsersTable.id, anonymousId));

              // Clear anonymous cookie
              await deleteAnonymousCookie();
            } catch (mergeError) {
              console.error('Failed to merge anonymous user data:', mergeError);
            }
          }

          // Return user object (password_hash excluded)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.profile_picture,
            emailVerified: user.email_verified,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/login',
    signOut: '/profile/logout',
    error: '/login',
    verifyRequest: '/signup/verify',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        // Convert emailVerified to boolean if it exists (handles Date, boolean, or null)
        token.emailVerified = user.emailVerified != null ? !!user.emailVerified : undefined;
      }

      // Google OAuth - auto-verify email
      if (account?.provider === 'google') {
        token.emailVerified = true;

        // Update user's email_verified status in database
        if (token.email) {
          await db
            .update(usersTable)
            .set({ email_verified: true })
            .where(eq(usersTable.email, token.email));
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string;
        session.user.emailVerified = token.emailVerified as boolean;
      }

      return session;
    },

    async signIn({ user, account, profile }) {
      // Handle OAuth account linking for existing users (safer than allowDangerousEmailAccountLinking)
      // This runs BEFORE the adapter, so we can link accounts and set user.id correctly
      if (account?.provider === 'google' && profile?.email && account.providerAccountId) {
        try {
          // First, check if OAuth account is already linked to any user
          const existingAccounts = await db
            .select()
            .from(accountTable)
            .where(
              eq(accountTable.providerAccountId, account.providerAccountId)
            )
            .limit(1);

          if (existingAccounts.length > 0) {
            // Account already linked - update user.id to match linked user
            const linkedAccount = existingAccounts[0];
            const linkedUser = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.id, linkedAccount.userId))
              .limit(1);

            if (linkedUser.length > 0) {
              (user as any).id = linkedAccount.userId.toString();
              console.log(`✅ Google OAuth account already linked to user ID: ${linkedAccount.userId}`);
              // Continue to anonymous merge below
            }
          } else {
            // Account not linked - check if user with this email exists
            const existingUsers = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.email, profile.email))
              .limit(1);

            if (existingUsers.length > 0) {
              const existingUser = existingUsers[0];

              // Link OAuth account to existing user
              await db.insert(accountTable).values({
                userId: existingUser.id,
                type: account.type || 'oauth',
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token || null,
                access_token: account.access_token || null,
                expires_at: account.expires_at || null,
                token_type: account.token_type || null,
                scope: account.scope || null,
                id_token: account.id_token || null,
                session_state: account.session_state || null,
              });

              // Update user profile with OAuth data
              await db
                .update(usersTable)
                .set({
                  email_verified: true,
                  profile_picture: (profile as any).picture || existingUser.profile_picture,
                  name: profile.name || existingUser.name,
                })
                .where(eq(usersTable.id, existingUser.id));

              // Update user.id to point to existing user so adapter uses correct ID
              (user as any).id = existingUser.id.toString();

              console.log(`✅ Linked Google OAuth account to existing user: ${profile.email} (ID: ${existingUser.id})`);
            } else {
              // User doesn't exist - create user and link account ourselves
              // (Adapter can't create user because date_of_birth is required but has no default)
              const newUsers = await db.insert(usersTable).values({
                email: profile.email,
                name: profile.name || profile.email.split('@')[0],
                email_verified: true,
                profile_picture: (profile as any).picture || null,
                date_of_birth: '1990-01-01', // Default date since we don't have it from Google
              }).returning();

              if (newUsers.length > 0) {
                const newUser = newUsers[0];

                // Link OAuth account to newly created user
                await db.insert(accountTable).values({
                  userId: newUser.id,
                  type: account.type || 'oauth',
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token || null,
                  access_token: account.access_token || null,
                  expires_at: account.expires_at || null,
                  token_type: account.token_type || null,
                  scope: account.scope || null,
                  id_token: account.id_token || null,
                  session_state: account.session_state || null,
                });

                // Update user.id to point to newly created user so adapter uses correct ID
                (user as any).id = newUser.id.toString();

                console.log(`✅ Created new user and linked Google OAuth account: ${profile.email} (ID: ${newUser.id})`);
              }
            }
          }
        } catch (error) {
          console.error('Error linking OAuth account:', error);
          // Don't block sign-in if linking fails - adapter will handle it
        }
      }

      // Merge anonymous data for any successful sign-in (OAuth path)
      try {
        const { getAnonymousCookie, deleteAnonymousCookie } = await import('@/lib/auth/cookies');
        const anonymousId = await getAnonymousCookie();
        if (anonymousId && user?.id) {
          // Validate user.id - it should be a database ID (small integer), not Google account ID
          let userId: number;
          const parsedId = parseInt(user.id as string, 10);

          // Check if user.id is a valid database ID (PostgreSQL integer range: -2147483648 to 2147483647)
          if (!isNaN(parsedId) && parsedId > 0 && parsedId < 2147483647) {
            userId = parsedId;
          } else {
            // user.id is not a valid database ID (probably Google account ID)
            // Fetch the correct user ID from database using email
            if (account?.provider === 'google' && profile?.email) {
              const users = await db
                .select({ id: usersTable.id })
                .from(usersTable)
                .where(eq(usersTable.email, profile.email))
                .limit(1);

              if (users.length > 0) {
                userId = users[0].id;
                // Update user.id to correct database ID
                (user as any).id = userId.toString();
              } else {
                console.warn('Cannot merge anonymous data: User not found in database');
                return true; // Don't block sign-in
              }
            } else {
              console.warn('Cannot merge anonymous data: Invalid user ID and no email available');
              return true; // Don't block sign-in
            }
          }

          await db
            .update(songRequestsTable)
            .set({ user_id: userId, anonymous_user_id: null })
            .where(eq(songRequestsTable.anonymous_user_id, anonymousId));

          await db
            .update(paymentsTable)
            .set({ user_id: userId, anonymous_user_id: null })
            .where(eq(paymentsTable.anonymous_user_id, anonymousId));

          await db
            .delete(anonymousUsersTable)
            .where(eq(anonymousUsersTable.id, anonymousId));

          // Clear the cookie after use
          await deleteAnonymousCookie();
        }
      } catch (mergeError) {
        console.error('Failed to merge anonymous user data (OAuth):', mergeError);
        // Non-blocking - don't prevent sign-in if merge fails
      }

      return true;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
      }
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token.email}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

