import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth provider error returned directly in query params
  if (error) {
    const errorMsg = errorDescription || error
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorMsg)}`
    )
  }

  // Handle authorization code exchange
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user && user.email) {
          const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)

          const isAdmin = adminEmails.includes(user.email.toLowerCase())
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split('@')[0] ||
            'Teacher'

          // 1. Ensure profile exists in profiles table
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              email: user.email.toLowerCase(),
              full_name: fullName,
              avatar_url:
                user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
              role: isAdmin ? 'admin' : 'teacher',
            },
            { onConflict: 'id' }
          )

          // 2. If user is a teacher, ensure they exist in teachers table so they appear on Admin Teachers Dashboard!
          if (!isAdmin) {
            const { data: existingTeacher } = await supabase
              .from('teachers')
              .select('id')
              .eq('email', user.email.toLowerCase().trim())
              .maybeSingle()

            if (!existingTeacher) {
              await supabase.from('teachers').insert({
                name: fullName,
                email: user.email.toLowerCase().trim(),
                subject: 'Faculty',
              })
            }
          }
        }
      } catch (syncErr) {
        console.error('Error auto-syncing teacher profile in auth callback:', syncErr)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  // Return to login page if no authorization code was provided
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      'Missing authorization code in OAuth callback'
    )}`
  )
}

