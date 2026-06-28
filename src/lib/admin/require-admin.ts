import { cookies } from 'next/headers';

export async function requireAdmin(logger: {
  warn: (msg: string, ...args: unknown[]) => void;
}): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value === 'true') return true;
  logger.warn('Unauthorized admin access');
  return false;
}
