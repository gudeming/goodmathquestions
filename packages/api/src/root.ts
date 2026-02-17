import { createTRPCRouter } from "./trpc";
import { questionRouter } from "./routers/question";
import { userRouter } from "./routers/user";
import { commentRouter } from "./routers/comment";
import { adminRouter } from "./routers/admin";
import { masteryRouter } from "./routers/mastery";

export const appRouter = createTRPCRouter({
  question: questionRouter,
  user: userRouter,
  comment: commentRouter,
  admin: adminRouter,
  mastery: masteryRouter,
});

export type AppRouter = typeof appRouter;
