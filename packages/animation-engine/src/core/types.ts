export type SceneType =
  | "pizza_slice"
  | "balance_scale"
  | "number_journey"
  | "triangle_angles"
  | "staircase"
  | "candy_jar"
  | "magic_square"
  | "number_combine";

export interface AnimationConfig {
  type: SceneType;
  [key: string]: any;
}

export interface AnimationObject {
  id: string;
  type: "number" | "shape" | "character" | "text" | "line";
  position: { x: number; y: number };
  properties: Record<string, any>;
  animations: AnimationStep[];
}

export interface AnimationStep {
  property: string;
  from: any;
  to: any;
  duration: number;
  delay?: number;
  easing?: string;
}

export interface AnimationScene {
  type: SceneType;
  width: number;
  height: number;
  backgroundColor: string;
  objects: AnimationObject[];
  duration: number;
  interactive: boolean;
}

export interface InteractiveElement {
  objectId: string;
  action: "drag" | "click" | "input";
  validRange?: { min: number; max: number };
  correctValue?: any;
  feedback: {
    correct: string;
    incorrect: string;
  };
}
