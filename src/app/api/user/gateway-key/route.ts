import { getServerUserId } from '@/lib/auth';
import {
  deleteUserGatewayKey,
  getUserGatewayKeyMetadata,
  replaceUserGatewayKey,
} from '@/lib/services/user-gateway';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET() {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(await getUserGatewayKeyMetadata(userId));
  } catch {
    console.error('Failed to get gateway key metadata');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const gatewayKey = isRecord(body) ? body.gatewayKey : undefined;

    if (typeof gatewayKey !== 'string' || !gatewayKey.trim()) {
      return NextResponse.json({ error: 'Gateway key required' }, { status: 400 });
    }

    if (!gatewayKey.trim().startsWith('vck_')) {
      return NextResponse.json(
        { error: 'Invalid key format. Must start with vck_' },
        { status: 400 }
      );
    }

    await replaceUserGatewayKey(userId, gatewayKey);
    return NextResponse.json({
      hasKey: true,
      masked: (await getUserGatewayKeyMetadata(userId)).masked,
    });
  } catch {
    console.error('Failed to replace gateway key');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Keep the existing save method working for older clients while PUT remains the explicit replace operation.
export async function POST(request: Request) {
  return PUT(request);
}

export async function DELETE() {
  try {
    const userId = await getServerUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteUserGatewayKey(userId);
    return NextResponse.json({ hasKey: false, masked: null });
  } catch {
    console.error('Failed to delete gateway key');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
