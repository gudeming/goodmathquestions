import { createTRPCRouter } from "./trpc";
import { questionRouter } from "./routers/question";
import { userRouter } from "./routers/user";
import { commentRouter } from "./routers/comment";
import { adminRouter } from "./routers/admin";
import { masteryRouter } from "./routers/mastery";
import { battleRouter } from "./routers/battle";
import { guessRouter } from "./routers/guess";
import { collectionRouter } from "./routers/collection";
import { dailyRouter } from "./routers/daily";
import { eventRouter } from "./routers/event";

export const appRouter = createTRPCRouter({
  question: questionRouter,
  user: userRouter,
  comment: commentRouter,
  admin: adminRouter,
  mastery: masteryRouter,
  battle: battleRouter,
  guess: guessRouter,
  collection: collectionRouter,
  daily: dailyRouter,
  event: eventRouter,
});

export type AppRouter = typeof appRouter;
