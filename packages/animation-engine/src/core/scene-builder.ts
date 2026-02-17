import type { AnimationConfig, AnimationScene, AnimationObject } from "./types";

/**
 * SceneBuilder converts structured math question data into renderable animation scenes.
 * This is the core pipeline: QuestionData -> AnimationConfig -> AnimationScene -> React Component
 */
export class SceneBuilder {
  /**
   * Build an animation scene from a question's animation config
   */
  static build(config: AnimationConfig): AnimationScene {
    switch (config.type) {
      case "pizza_slice":
        return SceneBuilder.buildPizzaScene(config);
      case "balance_scale":
        return SceneBuilder.buildBalanceScene(config);
      case "number_journey":
        return SceneBuilder.buildNumberJourneyScene(config);
      case "triangle_angles":
        return SceneBuilder.buildTriangleScene(config);
      case "candy_jar":
        return SceneBuilder.buildCandyJarScene(config);
      default:
        return SceneBuilder.buildDefaultScene(config);
    }
  }

  private static buildPizzaScene(config: AnimationConfig): AnimationScene {
    const totalSlices = config.totalSlices || 8;
    const eatenSlices = config.eatenSlices || 0;
    const objects: AnimationObject[] = [];

    // Create pizza base
    objects.push({
      id: "pizza-base",
      type: "shape",
      position: { x: 100, y: 100 },
      properties: { shape: "circle", radius: 80, fill: "#f5deb3" },
      animations: [],
    });

    // Create slices
    for (let i = 0; i < totalSlices; i++) {
      const isEaten = i < eatenSlices;
      objects.push({
        id: `slice-${i}`,
        type: "shape",
        position: { x: 100, y: 100 },
        properties: {
          shape: "arc",
          startAngle: (i * 360) / totalSlices,
          endAngle: ((i + 1) * 360) / totalSlices,
          radius: 80,
          fill: isEaten ? "transparent" : this.getSliceColor(i),
        },
        animations: isEaten
          ? [
              {
                property: "opacity",
                from: 1,
                to: 0.15,
                duration: 500,
                delay: i * 300,
              },
            ]
          : [],
      });
    }

    return {
      type: "pizza_slice",
      width: 200,
      height: 200,
      backgroundColor: "transparent",
      objects,
      duration: totalSlices * 300 + 1000,
      interactive: false,
    };
  }

  private static buildBalanceScene(config: AnimationConfig): AnimationScene {
    return {
      type: "balance_scale",
      width: 300,
      height: 200,
      backgroundColor: "transparent",
      objects: [
        {
          id: "stand",
          type: "line",
          position: { x: 150, y: 30 },
          properties: { endY: 170, stroke: "#8B7355", strokeWidth: 6 },
          animations: [],
        },
        {
          id: "beam",
          type: "line",
          position: { x: 30, y: 60 },
          properties: { endX: 270, stroke: "#D4A574", strokeWidth: 5 },
          animations: [
            {
              property: "rotate",
              from: -3,
              to: 3,
              duration: 3000,
              easing: "easeInOut",
            },
          ],
        },
      ],
      duration: 3000,
      interactive: true,
    };
  }

  private static buildNumberJourneyScene(
    config: AnimationConfig
  ): AnimationScene {
    const range = config.range || [0, 20];
    const highlights = config.highlights || [];

    const objects: AnimationObject[] = [];

    // Number line
    objects.push({
      id: "number-line",
      type: "line",
      position: { x: 20, y: 50 },
      properties: { endX: 380, stroke: "#ddd", strokeWidth: 3 },
      animations: [],
    });

    // Number marks
    for (let i = range[0]; i <= range[1]; i++) {
      objects.push({
        id: `mark-${i}`,
        type: "text",
        position: { x: 20 + ((i - range[0]) / (range[1] - range[0])) * 360, y: 75 },
        properties: {
          text: String(i),
          fill: highlights.includes(i) ? "#ff6b9d" : "#666",
          fontSize: 10,
          fontWeight: highlights.includes(i) ? "bold" : "normal",
        },
        animations: highlights.includes(i)
          ? [
              {
                property: "scale",
                from: 1,
                to: 1.5,
                duration: 500,
                delay: highlights.indexOf(i) * 200,
              },
            ]
          : [],
      });
    }

    return {
      type: "number_journey",
      width: 400,
      height: 100,
      backgroundColor: "transparent",
      objects,
      duration: highlights.length * 200 + 1000,
      interactive: false,
    };
  }

  private static buildTriangleScene(config: AnimationConfig): AnimationScene {
    const angles = config.angles || [60, 60, 60];

    return {
      type: "triangle_angles",
      width: 200,
      height: 200,
      backgroundColor: "transparent",
      objects: [
        {
          id: "triangle",
          type: "shape",
          position: { x: 100, y: 100 },
          properties: {
            shape: "triangle",
            angles,
            fill: "#bfdbfe",
            stroke: "#3b82f6",
          },
          animations: [
            {
              property: "scale",
              from: 0,
              to: 1,
              duration: 800,
              easing: "spring",
            },
          ],
        },
        ...angles.map((angle, i) => ({
          id: `angle-label-${i}`,
          type: "text" as const,
          position: { x: 50 + i * 50, y: 150 + (i === 1 ? -120 : 0) },
          properties: {
            text: `${angle}°`,
            fill: i === 2 ? "#ff6b9d" : "#3b82f6",
            fontSize: 14,
            fontWeight: "bold",
          },
          animations: [
            {
              property: "opacity",
              from: 0,
              to: 1,
              duration: 500,
              delay: 800 + i * 300,
            },
          ],
        })),
      ],
      duration: 2200,
      interactive: false,
    };
  }

  private static buildCandyJarScene(config: AnimationConfig): AnimationScene {
    const colors: Record<string, string> = {
      red: "#f87171",
      blue: "#60a5fa",
      green: "#4ade80",
    };

    const objects: AnimationObject[] = [];
    let index = 0;

    for (const [color, count] of Object.entries(config)) {
      if (color === "type" || typeof count !== "number") continue;
      for (let i = 0; i < count; i++) {
        objects.push({
          id: `candy-${color}-${i}`,
          type: "shape",
          position: {
            x: 30 + (index % 5) * 30,
            y: 30 + Math.floor(index / 5) * 30,
          },
          properties: {
            shape: "circle",
            radius: 10,
            fill: colors[color] || "#ccc",
          },
          animations: [
            {
              property: "scale",
              from: 0,
              to: 1,
              duration: 300,
              delay: index * 100,
            },
          ],
        });
        index++;
      }
    }

    return {
      type: "candy_jar",
      width: 200,
      height: 150,
      backgroundColor: "transparent",
      objects,
      duration: index * 100 + 500,
      interactive: false,
    };
  }

  private static buildDefaultScene(config: AnimationConfig): AnimationScene {
    return {
      type: config.type as any,
      width: 200,
      height: 200,
      backgroundColor: "transparent",
      objects: [],
      duration: 1000,
      interactive: false,
    };
  }

  private static getSliceColor(index: number): string {
    const colors = [
      "#ff6b9d", "#fbbf24", "#4ade80", "#60a5fa",
      "#c084fc", "#fb923c", "#22d3ee", "#f87171",
    ];
    return colors[index % colors.length];
  }
}
