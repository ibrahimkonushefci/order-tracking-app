'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import { getAuth } from './auth';

export type LoginState = { error?: 'invalid' | 'required'; email?: string };

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const parsed = loginSchema.safeParse({ email, password: form.get('password') });
  if (!parsed.success) return { error: 'required', email };
  const auth = await getAuth();
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) return { error: 'invalid', email };
    throw e;
  }
  redirect('/');
}

export async function logout() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect('/login');
}
