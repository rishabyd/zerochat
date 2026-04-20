import { getSessions } from '@/lib/services/user-sessions';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user.id;
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sessions = await getSessions(userId);

    return Response.json(sessions);
  } catch (error: unknown) {
    console.error('Failed to retrieve sessions:', error);
    return Response.json({ error: 'Failed to retrieve sessions' }, { status: 500 });
  }
}
