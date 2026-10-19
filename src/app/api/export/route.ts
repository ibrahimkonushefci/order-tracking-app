import { getCurrentUser } from '@/auth/session';
import { ForbiddenError } from '@/auth/permissions';
import { getDb } from '@/db/client';
import { appToday } from '@/server/today';
import { buildExport } from '@/services/export';

/** "Eksporto të dhënat": Pronari only (checked here and in the service), .xlsx or the complete .json. */
export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u?.companyId) return new Response('Unauthorized', { status: 401 });
  const format = new URL(req.url).searchParams.get('format') === 'json' ? 'json' : 'xlsx';
  try {
    const x = await buildExport(await getDb(), { id: u.id, role: u.role, companyId: u.companyId, firstName: u.firstName }, await appToday());
    const headers = (type: string, ext: string) => ({
      'content-type': type,
      'content-disposition': `attachment; filename="${x.base}.${ext}"`,
      'cache-control': 'no-store',
    });
    return format === 'json'
      ? new Response(JSON.stringify(x.json, null, 2), { headers: headers('application/json; charset=utf-8', 'json') })
      : new Response(new Uint8Array(x.xlsx), { headers: headers('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx') });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response('Forbidden', { status: 403 });
    throw e;
  }
}
