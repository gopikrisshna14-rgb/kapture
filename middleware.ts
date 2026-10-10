import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PREFIXES = ["/welcome", "/signup", "/c/", "/auth/", "/api/", "/plans-public", "/offline"];

const isPublic = (path: string) => path === "/" || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  let signedIn: boolean;

  if (url && anon) {
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    signedIn = Boolean(data.user);
  } else {
    signedIn = req.cookies.has("catch_demo_session");
  }

  const path = req.nextUrl.pathname;
  if (!signedIn && !isPublic(path)) {
    const to = req.nextUrl.clone();
    to.pathname = "/welcome";
    to.search = "";
    if (path === "/share") to.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|svg|jpg|webp)$).*)"],
};
