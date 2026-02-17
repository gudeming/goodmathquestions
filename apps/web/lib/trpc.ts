import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@gmq/api";

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
