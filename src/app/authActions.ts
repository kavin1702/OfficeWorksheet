"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface AuthResponse {
  success: boolean;
  message: string;
}

export async function signUpAction(formData: FormData): Promise<AuthResponse> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !name) {
    return { success: false, message: "Please fill in all fields." };
  }

  if (password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return { success: false, message: "An account with this email already exists." };
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
      },
    });

    // Create session cookie
    await createSession(user.id);
  } catch (error: any) {
    console.error("Sign up error:", error);
    return { success: false, message: "An error occurred during registration." };
  }

  // Redirect after registration
  redirect("/");
}

export async function loginAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Please enter your email and password." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: "Invalid email or password." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, message: "Invalid email or password." };
    }

    // Create session cookie
    await createSession(user.id);
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, message: "An error occurred during sign in." };
  }

  // Redirect after login
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
