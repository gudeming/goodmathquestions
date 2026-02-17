import { createTRPCRouter } from "./trpc";
import { questionRouter } from "./routers/question";
import { userRouter } from "./routers/user";
import { commentRouter } from "./routers/comment";

export const appRouter = createTRPCRouter({
  question: questionRouter,
  user: userRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
