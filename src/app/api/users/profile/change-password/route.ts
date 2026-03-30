import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as z from "zod";

const passwordProtocol = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string()
    .min(8, "Command level security requires 8+ characters")
    .regex(/[A-Z]/, "Uppercase missing")
    .regex(/[a-z]/, "Lowercase missing")
    .regex(/[0-9]/, "Number missing")
    .regex(/[^A-Za-z0-9]/, "Special character required"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Confirmation mismatch",
  path: ["confirmPassword"]
});

/**
 * POST: Change the current user's password (requires current password).
 */
export async function POST(req: Request) {
// ...
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = passwordProtocol.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = result.data;

    // 🔥 Better-auth changePassword logic
    // This will verify the current password using our custom bcryptjs logic
    // which we already configured in auth.ts.
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword
      },
      headers: await headers()
    });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error: any) {
    console.error("[PROFILE_CHANGE_PASSWORD]", error.message);
    // Better Auth errors might contain 'Invalid password' etc.
    const message = error.message.includes("Invalid password") 
      ? "The current password you provided is incorrect."
      : "Failed to change password. Please try again.";
      
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
