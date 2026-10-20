'use server';
/**
 * Demo controls (Phase 5): one-tap Pronari/Zyra logins, "Shiko si", "Rivendos demon" and the
 * meeting number. Every action refuses when DEMO_MODE is not "true".
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/auth/session';
import { chosenBrandSlug, getActiveBrand, isDemoMode } from '@/brand/active';
import { DEMO_PHONE_COOKIE, parseDemoPhone, resetDemo, signInDemo } from './demo';

const roleOf = (v: FormDataEntryValue | null) => (v === 'office' ? 'office' : 'owner');

/** Login page: "Hyr si Arben · Pronari" / "Hyr si Teuta · Zyra". */
export async function demoLoginAction(form: FormData) {
  if (!isDemoMode()) redirect('/login');
  await signInDemo(roleOf(form.get('role')), await chosenBrandSlug());
  redirect('/');
}

/** "Shiko si": the same screen as the other role. */
export async function switchRoleAction(form: FormData) {
  if (!isDemoMode() || !(await getCurrentUser())) return;
  const { brand } = await getActiveBrand();
  await signInDemo(roleOf(form.get('role')), brand.slug);
  revalidatePath('/', 'layout');
}

/** "Rivendos demon": all demo data back to the start, today's date, signed in as before. */
export async function resetDemoAction() {
  const u = await getCurrentUser();
  if (!isDemoMode() || !u) redirect('/login');
  const { brand } = await getActiveBrand();
  await resetDemo(brand.slug);
  await signInDemo(u.role, brand.slug);
  redirect('/?reset=1');
}

export type DemoPhoneState = { error?: boolean; saved?: string | null };

/** "Numri i takimit": prepared messages can go to the owner's phone instead (sent by hand). */
export async function setDemoPhoneAction(
  _prev: DemoPhoneState,
  form: FormData,
): Promise<DemoPhoneState> {
  if (!isDemoMode() || !(await getCurrentUser())) return { error: true };
  const jar = await cookies();
  if (form.get('clear')) {
    jar.delete(DEMO_PHONE_COOKIE);
    revalidatePath('/', 'layout');
    return { saved: null };
  }
  const phone = parseDemoPhone(String(form.get('cc') ?? '+383'), String(form.get('phone') ?? ''));
  if (!phone) return { error: true };
  // Kept for this meeting only: it expires after 12 hours.
  jar.set(DEMO_PHONE_COOKIE, phone, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 12,
  });
  revalidatePath('/', 'layout');
  return { saved: phone };
}
