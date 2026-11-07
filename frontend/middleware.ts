import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/", "/login", "/register", "/pending-approval"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccessToken = Boolean(request.cookies.get("access_token")?.value);
  if (!isPublic && !hasAccessToken) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if ((pathname === "/login" || pathname === "/register") && hasAccessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
