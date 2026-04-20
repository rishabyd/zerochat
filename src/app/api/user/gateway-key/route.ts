import { NextResponse } from 'next/server';
import { getServerUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { gatewayKey: true },
    });

    if (!settings?.gatewayKey) {
      return NextResponse.json({ hasKey: false, masked: null });
    }

    const masked = `${settings.gatewayKey.slice(0, 8)}...${settings.gatewayKey.slice(-4)}`;
    return NextResponse.json({ hasKey: true, masked });
  } catch (error) {
    console.error('Failed to get gateway key:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gatewayKey } = body;

    if (!gatewayKey || typeof gatewayKey !== 'string') {
      return NextResponse.json({ error: 'Gateway key required' }, { status: 400 });
    }

    const trimmedKey = gatewayKey.trim();
    if (!trimmedKey.startsWith('vck_')) {
      return NextResponse.json(
        { error: 'Invalid key format. Must start with vck_' },
        { status: 400 }
      );
    }

    await prisma.userSettings.upsert({
      where: { userId },
      update: { gatewayKey: trimmedKey },
      create: { userId, gatewayKey: trimmedKey },
    });

    const masked = `${trimmedKey.slice(0, 8)}...${trimmedKey.slice(-4)}`;
    return NextResponse.json({ success: true, masked });
  } catch (error) {
    console.error('Failed to save gateway key:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
