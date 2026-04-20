import { NextRequest, NextResponse } from "next/server";
import { auth } from "./app/firebase-admin";

const handlers: Record<string, (req: NextRequest) => Promise<NextResponse>> = {
  "/student": async (req: NextRequest) => {
    const user = await getUser(req);
    console.log({ ProxyUser: user });
    if (!user || user?.role !== "student") {
      console.log("Redirecting to login");
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  "/admin": async (req: NextRequest) => {
    const user = await getUser(req);
    console.log({ ProxyUser: user });
    if (!user || user?.role !== "admin") {
      console.log("Redirecting to login");
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
};
export default async function proxy(req: NextRequest) {
  if (handlers[req.nextUrl.pathname]) {
    return handlers[req.nextUrl.pathname](req);
  }
  return NextResponse.next();
}
async function getUser(req: NextRequest) {
  const JWT = req.cookies.get("session");
  try {
    const user = await auth.verifySessionCookie(JWT?.value || "");
    return user;
  } catch (error) {
    console.log({ getUserError: error });
    return null;
  }
}

