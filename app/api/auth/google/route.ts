import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    // Redirect to Google OAuth
    const scopes = ['openid', 'email', 'profile'];
    const redirectUri = `${BASE_URL}/api/auth/google`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_type=code&` +
      `state=${state || 'signup'}`;

    return NextResponse.redirect(authUrl);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/api/auth/google`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${BASE_URL}/login?error=google_auth_failed`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error('User info fetch failed:', googleUser);
      return NextResponse.redirect(`${BASE_URL}/login?error=google_user_fetch_failed`);
    }

    // Check if user exists in our database
    const checkUserResponse = await fetch(`${BASE_URL}/api/auth/check-google-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: googleUser.id,
        email: googleUser.email,
      }),
    });

    const userData = await checkUserResponse.json();

    if (checkUserResponse.ok && userData.user) {
      // User exists, log them in
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          password: '', // Google users don't have passwords
          googleAuth: true,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const response = NextResponse.redirect(`${BASE_URL}/`);
        response.cookies.set('session_token', loginData.token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }
    } else {
      // User doesn't exist, redirect to signup with Google data
      const signupUrl = new URL(`${BASE_URL}/signup`);
      signupUrl.searchParams.set('google_id', googleUser.id);
      signupUrl.searchParams.set('email', googleUser.email);
      signupUrl.searchParams.set('name', googleUser.name);
      signupUrl.searchParams.set('picture', googleUser.picture);
      return NextResponse.redirect(signupUrl);
    }

    return NextResponse.redirect(`${BASE_URL}/login?error=auth_failed`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`);
  }
}