import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST: Change the current user's password (requires current password).
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
       return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
       return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

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
