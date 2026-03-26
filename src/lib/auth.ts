import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

// Fixed key for session signing (do not change after deployment, or existing sessions will invalidate)
const encodedKey = new TextEncoder().encode('bizyair2gemini-session-secret-key-2024')

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(encodedKey)
}

export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return decrypt(token)
}

export async function setSession(data: any) {
  const cookieStore = await cookies()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  cookieStore.set('session', await encrypt(data), {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
