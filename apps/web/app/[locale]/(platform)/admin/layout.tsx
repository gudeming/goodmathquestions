import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@gmq/db";
import { authOptions } from "@/lib/auth";

// Server-side gate for the whole admin console. The tRPC adminProcedure is the
// real enforcement boundary; this only keeps the console shell from rendering
// for non-admins.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect(`/${params.locale}/login`);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect(`/${params.locale}`);
  }

  return <>{children}</>;
}
