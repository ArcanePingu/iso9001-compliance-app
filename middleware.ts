import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set(["/", "/login", "/unauthorized", "/healthz"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/_next") || pathname.startsWith("/favicon");
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 }
    );
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
