import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getNotifications, getUnreadMessageCount } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);

    const [items, unreadMessages] = await Promise.all([
      getNotifications(user),
      getUnreadMessageCount(user.id),
    ]);

    return NextResponse.json({ items, unreadMessages });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
