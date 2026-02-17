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
      case "staircase":
        return SceneBuilder.buildStaircaseScene(config);
      case "magic_square":
        return SceneBuilder.buildMagicSquareScene(config);
      case "number_combine":
        return SceneBuilder.buildNumberCombineScene(config);
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
      interactive: true,
      metadata: {
        totalSlices,
        eatenSlices,
        remainingSlices: totalSlices - eatenSlices,
      },
      interactions: [
        {
          objectId: "pizza-base",
          action: "click",
          feedback: {
            correct: "Great slicing!",
            incorrect: "Try another slice!",
          },
        },
      ],
    };
  }

  private static buildBalanceScene(config: AnimationConfig): AnimationScene {
    const rightValue =
      typeof config?.rightSide?.value === "number" ? config.rightSide.value : null;

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
      metadata: {
        leftExpression: config?.leftSide?.expression ?? "x",
        rightValue,
      },
      interactions: [
        {
          objectId: "beam",
          action: "input",
          correctValue: rightValue,
          feedback: {
            correct: "Balanced!",
            incorrect: "Adjust the value to balance both sides.",
          },
        },
      ],
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
      interactive: true,
      metadata: {
        range,
        highlights,
      },
      interactions: [
        {
          objectId: "number-line",
          action: "drag",
          validRange: { min: range[0], max: range[1] },
          feedback: {
            correct: "Nice jump!",
            incorrect: "Try snapping to a highlighted number.",
          },
        },
      ],
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
      metadata: { angles },
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
      interactive: true,
      metadata: {
        totals: Object.entries(config).reduce<Record<string, number>>((acc, [k, v]) => {
          if (k !== "type" && typeof v === "number") {
            acc[k] = v;
          }
          return acc;
        }, {}),
      },
      interactions: [
        {
          objectId: "candy-red-0",
          action: "click",
          feedback: {
            correct: "Good counting!",
            incorrect: "Count each color carefully.",
          },
        },
      ],
    };
  }

  private static buildStaircaseScene(config: AnimationConfig): AnimationScene {
    const totalStairs = Math.max(1, Number(config.totalStairs ?? 4));
    const stepOptions = Array.isArray(config.stepOptions) ? config.stepOptions : [1, 2];
    const objects: AnimationObject[] = [];

    for (let i = 0; i < totalStairs; i++) {
      objects.push({
        id: `stair-${i + 1}`,
        type: "shape",
        position: { x: 40 + i * 45, y: 170 - i * 25 },
        properties: {
          shape: "rect",
          width: 45,
          height: 25,
          fill: i % 2 === 0 ? "#bfdbfe" : "#93c5fd",
        },
        animations: [
          {
            property: "opacity",
            from: 0.5,
            to: 1,
            duration: 250,
            delay: i * 120,
          },
        ],
      });
    }

    return {
      type: "staircase",
      width: 300,
      height: 200,
      backgroundColor: "transparent",
      objects,
      duration: totalStairs * 120 + 600,
      interactive: true,
      metadata: { totalStairs, stepOptions },
      interactions: [
        {
          objectId: "stair-1",
          action: "click",
          feedback: {
            correct: "Great path!",
            incorrect: "Try another way up the stairs.",
          },
        },
      ],
    };
  }

  private static buildMagicSquareScene(config: AnimationConfig): AnimationScene {
    const size = Math.max(2, Number(config.size ?? 3));
    const targetSum = Number(config.targetSum ?? size * (size * size + 1) / 2);
    const known = (config.known ?? {}) as Record<string, number>;
    const cellSize = 52;
    const objects: AnimationObject[] = [];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const key = `${row},${col}`;
        const value = known[key];
        objects.push({
          id: `cell-${row}-${col}`,
          type: "shape",
          position: { x: 30 + col * cellSize, y: 30 + row * cellSize },
          properties: {
            shape: "rect",
            width: cellSize - 4,
            height: cellSize - 4,
            fill: value != null ? "#d9f99d" : "#f8fafc",
            value,
          },
          animations: [],
        });
      }
    }

    return {
      type: "magic_square",
      width: 30 + size * cellSize,
      height: 30 + size * cellSize,
      backgroundColor: "transparent",
      objects,
      duration: 1000,
      interactive: true,
      metadata: { size, targetSum, known },
      interactions: [
        {
          objectId: "cell-0-0",
          action: "input",
          feedback: {
            correct: "Nice pattern spotting!",
            incorrect: "Check row and column sums.",
          },
        },
      ],
    };
  }

  private static buildNumberCombineScene(config: AnimationConfig): AnimationScene {
    const numbers = Array.isArray(config.numbers) ? config.numbers : [];
    const operation = config.operation ?? "add";
    const objects: AnimationObject[] = numbers.map((value: number, i: number) => ({
      id: `num-${i}`,
      type: "number",
      position: { x: 30 + (i % 4) * 80, y: 40 + Math.floor(i / 4) * 80 },
      properties: {
        value,
        fill: "#1d4ed8",
      },
      animations: [
        {
          property: "scale",
          from: 0.8,
          to: 1.05,
          duration: 400,
          delay: i * 120,
        },
      ],
    }));

    return {
      type: "number_combine",
      width: 360,
      height: 220,
      backgroundColor: "transparent",
      objects,
      duration: numbers.length * 120 + 800,
      interactive: true,
      metadata: { numbers, operation },
      interactions: [
        {
          objectId: "num-0",
          action: "click",
          feedback: {
            correct: "Good combine!",
            incorrect: "Try combining in a different order.",
          },
        },
      ],
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
