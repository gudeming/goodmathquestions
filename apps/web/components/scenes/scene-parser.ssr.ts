import { parseSceneConfig } from "@gmq/animation-engine";
import type { SceneParser } from "./scene-parser";

/**
 * Server render and tests: the scene schemas are available synchronously, so SSR
 * output is exactly what it was before the schemas were split out of the client.
 * The client build replaces this module with `scene-parser.ssr.client.ts`
 * (NormalModuleReplacementPlugin in next.config.js).
 */
export const SSR_SCENE_PARSER: SceneParser | null = parseSceneConfig;
