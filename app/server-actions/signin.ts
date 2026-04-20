"use server";
import { auth } from "@/app/firebase-admin";
import { cookies } from "next/headers";

export async function signin(jwt: string) {
  try {
    const expiresIn = 3600 * 1000 * 24 * 5;
    const cookiesObj = await cookies();

    const cookie = await auth.createSessionCookie(jwt, { expiresIn });
    cookiesObj.set("session", cookie, {
      httpOnly: true,
      maxAge: expiresIn,
      secure: true,
      sameSite: "none",
    });
  } catch (error) {
    console.log({ signInServerActionError: error });
  } finally {
    return null;
  }
}
