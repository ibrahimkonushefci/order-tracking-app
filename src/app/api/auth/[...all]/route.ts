import { getAuth } from '@/auth/auth';

const handle = async (req: Request) => (await getAuth()).handler(req);

export const GET = handle;
export const POST = handle;
