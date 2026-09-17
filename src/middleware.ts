import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/registrieren", "/passwort-vergessen", "/passwort-zuruecksetzen", "/setup", "/impressum", "/datenschutz", "/api/health", "/api/cron", "/api/branding"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isAzubi = session.role === "AZUBI";
  const mode = (process.env.PORTAL_MODE ?? "both").toLowerCase();

  if (pathname === "/") {
    return NextResponse.redirect(new URL(isAzubi ? "/azubi" : "/admin", req.url));
  }
  if (pathname.startsWith("/admin") && isAzubi) {
    return NextResponse.redirect(new URL("/azubi", req.url));
  }
  if (pathname.startsWith("/azubi") && !isAzubi) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  // Portal-Modus: Dieses Deployment bedient nur ein Portal.
  if (mode === "azubi" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login?portal=azubi", req.url));
  }
  if (mode === "admin" && pathname.startsWith("/azubi")) {
    return NextResponse.redirect(new URL("/login?portal=admin", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
