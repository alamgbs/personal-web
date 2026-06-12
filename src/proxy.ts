import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth proxy — protects /mission-control/* routes.
 *
 * NOTE: In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`.
 * The exported function must be named `proxy` (not `middleware`).
 *
 * This proxy:
 *  1. Refreshes the Supabase session on every request (keeps tokens fresh).
 *  2. Redirects unauthenticated users away from /mission-control/* to /login.
 *  3. Redirects already-authenticated users away from /login to /mission-control.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to the request (for downstream handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Write cookies to the response (for the browser)
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — IMPORTANT: do not add logic between createServerClient
  // and getUser(); it breaks session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  if (pathname.startsWith('/mission-control') && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login
  if (pathname === '/login' && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/mission-control'
    dashboardUrl.searchParams.delete('next')
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Run proxy on all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets (*.svg, *.png, *.jpg, *.webp, *.ico)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
}
