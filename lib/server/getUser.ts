"use server";
import { auth } from "@/app/firebase-admin";
import { cookies } from "next/headers";

export default async function getUser() {
  try {
    const cookiesStore = await cookies();
    const JWT = cookiesStore.get("session");
    if (!JWT?.value) return null;

    const user = await auth.verifySessionCookie(JWT.value);

    return user;
  } catch (error) {
    console.log({ getUserError: error });
    return null;
  }
}
