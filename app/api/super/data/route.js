import { NextResponse } from 'next/server';
import { isSuperAuthed, publicUser } from '@/lib/auth-server';
import {
  listAllUsers, listAllPages, listAllOrders, listAllDeposits, countPagesByUser,
} from '@/lib/store';
import { getSubscriptionStatus } from '@/lib/billing';

export async function GET() {
  if (!(await isSuperAuthed())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const users = await listAllUsers();
  const deposits = await listAllDeposits();
  return NextResponse.json({
    stats: {
      users: users.length,
      pages: (await listAllPages()).length,
      orders: (await listAllOrders()).length,
      walletTotal: users.reduce((s, u) => s + u.walletBalance, 0),
      pendingDeposits: deposits.filter((d) => d.status === 'pending').length,
    },
    users: await Promise.all(users.map(async (u) => ({
      ...publicUser(u),
      pageCount: await countPagesByUser(u.id),
      status: getSubscriptionStatus(u),
    }))),
    deposits: deposits.map((d) => ({
      ...d,
      userEmail: users.find((u) => u.id === d.userId)?.email || '',
    })),
  });
}
