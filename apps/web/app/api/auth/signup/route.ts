import { NextResponse } from "next/server";
import { db } from "@gmq/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1).max(30),
  age: z.number().int().min(8).max(14),
  parentEmail: z.string().email().optional(),
  classCode: z.string().optional(),
  locale: z.enum(["en", "zh"]).default("en"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    // Check if username already taken
    const existing = await db.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Validate auth method
    if (!data.parentEmail && !data.classCode) {
      return NextResponse.json(
        { error: "Either parent email or class code is required" },
        { status: 400 }
      );
    }

    // If class code provided, verify it exists
    let classroomId: string | undefined;
    if (data.classCode) {
      const classroom = await db.classroom.findUnique({
        where: { classCode: data.classCode },
      });
      if (!classroom || !classroom.isActive) {
        return NextResponse.json(
          { error: "Invalid or inactive class code" },
          { status: 400 }
        );
      }
      classroomId = classroom.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        displayName: data.displayName,
        age: data.age,
        parentEmail: data.parentEmail,
        authMethod: data.classCode ? "CLASS_CODE" : "PARENT_EMAIL",
        locale: data.locale,
        classroomId,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
