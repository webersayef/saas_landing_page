import { NextResponse } from 'next/server';
import { isSuperAuthed, publicUser } from '@/lib/auth-server';
import {
  listAllUsers, listAllPages, listAllOrders, listAllDeposits, countPagesByUser,
} from '@/lib/store';
import { getSubscriptionStatus } from '@/lib/billing';

export async function GET() {
  if (!(await isSuperAuthed())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const users = listAllUsers();
  const deposits = listAllDeposits();
  return NextResponse.json({
    stats: {
      users: users.length,
      pages: listAllPages().length,
      orders: listAllOrders().length,
      walletTotal: users.reduce((s, u) => s + u.walletBalance, 0),
      pendingDeposits: deposits.filter((d) => d.status === 'pending').length,
    },
    users: users.map((u) => ({
      ...publicUser(u),
      pageCount: countPagesByUser(u.id),
      status: getSubscriptionStatus(u),
    })),
    deposits: deposits.map((d) => ({
      ...d,
      userEmail: users.find((u) => u.id === d.userId)?.email || '',
    })),
  });
}
