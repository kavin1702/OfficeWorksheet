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
  const role = (formData.get("role") as string || "Team Member").trim();
  const color = (formData.get("color") as string || "#3b82f6").trim();

  if (!email || !password || !name) {
    return { success: false, message: "Please fill in all fields." };
  }

  if (password.length < 3) {
    return { success: false, message: "Password must be at least 3 characters." };
  }

  let userCreatedId = "";

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return { success: false, message: "An account with this email already exists." };
    }

    const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const passwordHash = await hashPassword(password);
    const avatar = name.trim().charAt(0).toUpperCase();

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name.trim(),
        username,
        role,
        color,
        avatar,
      },
    });

    userCreatedId = user.id;
  } catch (error: any) {
    console.error("Sign up error:", error);
    return { success: false, message: "An error occurred during registration." };
  }

  if (userCreatedId) {
    await createSession(userCreatedId);
    redirect("/");
  }

  return { success: false, message: "Failed to create account." };
}

export async function loginAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Please enter your email and password." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  let userLoggedInId = "";

  try {
    // 1. Search for user by email OR username (matching the static authManager.js logic)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanEmail }
        ]
      }
    });

    if (!user) {
      // 2. SMART AUTO-REGISTRATION: Seamlessly create account if it doesn't exist
      const generatedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const displayName = generatedName.charAt(0).toUpperCase() + generatedName.slice(1) || 'User';
      const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      
      const passwordHash = await hashPassword(cleanPass);
      const avatar = displayName.charAt(0).toUpperCase();

      const newUser = await prisma.user.create({
        data: {
          email: cleanEmail.includes('@') ? cleanEmail : `${username}@office.com`,
          passwordHash,
          name: displayName,
          username,
          role: "Team Member",
          color: chosenColor,
          avatar
        }
      });

      userLoggedInId = newUser.id;
    } else {
      // 3. Verify Password if user already exists
      const isValid = await verifyPassword(cleanPass, user.passwordHash);
      if (!isValid) {
        return { success: false, message: "Incorrect password. Please verify your password or use Create Account." };
      }
      userLoggedInId = user.id;
    }
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, message: "An error occurred during sign in." };
  }

  if (userLoggedInId) {
    await createSession(userLoggedInId);
    redirect("/");
  }

  return { success: false, message: "Failed to sign in." };
}

export async function switchUserAction(userId: string): Promise<AuthResponse> {
  let switchSuccess = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: "User account not found." };
    }
    
    await createSession(user.id);
    switchSuccess = true;
  } catch (error) {
    console.error("Failed to switch user account:", error);
    return { success: false, message: "Failed to switch user account." };
  }

  if (switchSuccess) {
    redirect("/");
  }

  return { success: false, message: "Switch failed." };
}

export async function addFriendProfileAction(formData: FormData): Promise<AuthResponse> {
  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const role = formData.get("role") as string || "Team Member";
  const color = formData.get("color") as string || "#3b82f6";

  if (!name || !username) {
    return { success: false, message: "Please fill in all fields." };
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  const email = `${cleanUsername}@office.com`;
  const defaultPassword = "password123";
  let userCreatedId = "";

  try {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: cleanUsername }
        ]
      }
    });

    if (existing) {
      // Switch to existing user if it already exists
      userCreatedId = existing.id;
    } else {
      const passwordHash = await hashPassword(defaultPassword);
      const avatar = name.trim().charAt(0).toUpperCase();

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name.trim(),
          username: cleanUsername,
          role: role.trim(),
          color,
          avatar,
        },
      });

      userCreatedId = user.id;
    }
  } catch (error) {
    console.error("Failed to add friend profile:", error);
    return { success: false, message: "An error occurred while creating profile." };
  }

  if (userCreatedId) {
    await createSession(userCreatedId);
    redirect("/");
  }

  return { success: false, message: "Failed to add profile." };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
