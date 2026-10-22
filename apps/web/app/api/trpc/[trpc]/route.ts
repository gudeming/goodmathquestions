import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@gmq/api";
import { ANON_ID_HEADER, createTRPCContext } from "@gmq/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await getServerSession(authOptions);
      return createTRPCContext({ session, anonId: req.headers.get(ANON_ID_HEADER) });
    },
  });

export { handler as GET, handler as POST };
