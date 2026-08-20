import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import crypto from "crypto";

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "workpulse_session_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  // Store in DB
  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });

  // Set HTTPOnly session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return sessionId;
}

export async function validateSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: true },
    });

    if (!session) {
      // Clear cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Check expiry
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: token } });
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Extend session if half-expired (15 days left)
    const timeRemaining = session.expiresAt.getTime() - Date.now();
    if (timeRemaining < SESSION_EXPIRY_MS / 2) {
      const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
      await prisma.session.update({
        where: { id: token },
        data: { expiresAt: newExpiresAt },
      });
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: newExpiresAt,
      });
    }

    return {
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;

  try {
    await prisma.session.deleteMany({
      where: { id: token },
    });
  } catch (error) {
    console.error("Failed to delete session from database:", error);
  } finally {
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
