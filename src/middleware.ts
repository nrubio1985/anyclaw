import { NextRequest, NextResponse } from "next/server";

// Internal access hash — all routes require ?k=<hash> or cookie
const ACCESS_HASH = process.env.ACCESS_HASH || "ac7f2e";

export function middleware(req: NextRequest) {
  // Allow Next.js internals and static assets
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for access hash in URL param, cookie, or referer
  const urlHash = req.nextUrl.searchParams.get("k");
  const cookieHash = req.cookies.get("anyclaw_access")?.value;

  if (urlHash === ACCESS_HASH) {
    // Set cookie so they don't need ?k= on every page
    const response = NextResponse.next();
    response.cookies.set("anyclaw_access", ACCESS_HASH, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });
    return response;
  }

  if (cookieHash === ACCESS_HASH) {
    return NextResponse.next();
  }

  // Block access
  return new NextResponse("🦀", { status: 403 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
