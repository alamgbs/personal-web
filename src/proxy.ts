import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth proxy — protects /mission-control/* routes.
 * Uses @supabase/ssr when env vars are configured.
 * Gracefully passes through if Supabase is not yet configured.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply auth logic to mission-control routes and /login
  const isMissionControl = pathname.startsWith('/mission-control')
  const isLogin = pathname === '/login'

  if (!isMissionControl && !isLogin) {
    return NextResponse.next()
  }

  // If Supabase is not configured yet, pass through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // No auth configured — allow access (dev mode)
    return NextResponse.next()
  }

  // Supabase is configured — enforce auth
  try {
    const { createServerClient } = await import('@supabase/ssr')
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect unauthenticated users away from protected routes
    if (isMissionControl && !user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect authenticated users away from /login
    if (isLogin && user) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/mission-control'
      dashboardUrl.searchParams.delete('next')
      return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
  } catch (err) {
    console.error('[proxy] Auth error:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
}
