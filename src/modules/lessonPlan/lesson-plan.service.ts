import { prisma } from "../../../lib/prisma";

export interface LessonPlanRequest {
  studentGoal: string;
  duration: number; // in weeks
  studentLevel?: "beginner" | "intermediate" | "advanced";
  tutorId?: string;
  studentId?: string;
}

export interface WeekPlan {
  week: number;
  title: string;
  topics: string[];
  exercises: {
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
  }[];
  milestone: string;
  estimatedHours: number;
}

export interface LessonPlanContent {
  weeks: WeekPlan[];
  totalHours: number;
  resources: string[];
  assessmentStrategy: string;
}

/**
 * Call Groq API to generate personalized lesson plan
 * Uses Groq for ultra-fast inference
 */
const callGroqForLessonPlan = async (
  goal: string,
  weeks: number,
  studentLevel: string = "intermediate",
  tutorExpertise?: string,
): Promise<LessonPlanContent> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable not set");
  }

  const prompt = `You are an expert educator creating a personalized ${weeks}-week structured learning curriculum.

STUDENT LEARNING GOAL: "${goal}"
STUDENT LEVEL: ${studentLevel}
${tutorExpertise ? `TUTOR EXPERTISE: ${tutorExpertise}` : ""}

Create a detailed, week-by-week lesson plan with:
1. For each week: Week title, 3-4 core topics, 2-3 practical exercises with difficulty levels
2. Weekly milestones that show progress
3. Estimated hours per week for self-study
4. Recommended resources (books, articles, libraries)
5. Overall assessment strategy to measure progress

IMPORTANT: Respond with ONLY valid JSON in this exact format, no additional text:

{
  "weeks": [
    {
      "week": 1,
      "title": "Week Title Here",
      "topics": ["topic1", "topic2", "topic3"],
      "exercises": [
        {
          "title": "Exercise Title",
          "description": "Description of what to do",
          "difficulty": "easy"
        }
      ],
      "milestone": "What student should achieve by end of week",
      "estimatedHours": 8
    }
  ],
  "totalHours": ${weeks * 8},
  "resources": ["resource1", "resource2"],
  "assessmentStrategy": "How to measure progress throughout course"
}`;

  try {
    const startTime = Date.now();

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are an expert curriculum designer. Respond ONLY with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
          top_p: 0.9,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Groq API error:", error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content || "";
    const responseTime = Date.now() - startTime;

    // Parse JSON response - handle various formatting issues
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON in AI response");
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as LessonPlanContent;
      (parsed as any).responseTime = responseTime;
      return parsed;
    } catch (parseError) {
      // Try to clean the JSON by fixing common issues
      let cleanedJson = jsonMatch[0]
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/\n/g, " ") // Remove newlines
        .replace(/,\s*}/g, "}") // Remove trailing commas in objects
        .replace(/,\s*]/g, "]"); // Remove trailing commas in arrays

      try {
        const parsed = JSON.parse(cleanedJson) as LessonPlanContent;
        (parsed as any).responseTime = responseTime;
        return parsed;
      } catch (cleanError) {
        console.error("Failed to parse JSON even after cleaning:", cleanError);
        console.error(
          "First 500 chars of response:",
          content.substring(0, 500),
        );
        throw new Error("Invalid JSON from AI response");
      }
    }
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
};

/**
 * Generate a personalized lesson plan using Groq AI
 */
const generateLessonPlan = async (request: LessonPlanRequest): Promise<any> => {
  const {
    studentGoal,
    duration,
    studentLevel = "intermediate",
    tutorId,
    studentId,
  } = request;

  // Validate input
  if (!studentGoal || studentGoal.trim().length < 10) {
    throw new Error("Student goal must be at least 10 characters long");
  }

  if (duration < 1 || duration > 52) {
    throw new Error("Duration must be between 1 and 52 weeks");
  }

  // Get tutor expertise if provided
  let tutorExpertise: string | undefined;
  if (tutorId) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (tutor) {
      const categories = tutor.categories.map((tc) => tc.category.name);
      tutorExpertise = `${tutor.user.name} specializes in: ${categories.join(", ")}`;
    }
  }

  // Call Groq API to generate lesson plan
  const lessonPlanContent = await callGroqForLessonPlan(
    studentGoal,
    duration,
    studentLevel,
    tutorExpertise,
  );

  // Save lesson plan to database
  const savedPlan = await prisma.lessonPlan.create({
    data: {
      title: `${studentGoal.substring(0, 50)}...`,
      description: `${duration}-week personalized learning plan for ${studentLevel} level`,
      goal: studentGoal,
      weeks: duration,
      content: lessonPlanContent,
      status: "active",
      studentId: studentId || undefined,
      tutorId: tutorId || undefined,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    data: {
      planId: savedPlan.id,
      goal: savedPlan.goal,
      weeks: savedPlan.weeks,
      content: lessonPlanContent,
      student: savedPlan.student,
      tutor: savedPlan.tutor?.user?.name || null,
      createdAt: savedPlan.createdAt,
      responseTime: (lessonPlanContent as any).responseTime,
    },
  };
};

/**
 * Retrieve a lesson plan by ID
 */
const getLessonPlanById = async (planId: string) => {
  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!plan) {
    throw new Error("Lesson plan not found");
  }

  return plan;
};

/**
 * Get all lesson plans for a student
 */
const getStudentLessonPlans = async (studentId: string) => {
  const plans = await prisma.lessonPlan.findMany({
    where: { studentId },
    include: {
      tutor: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return plans;
};

/**
 * Update lesson plan status
 */
const updateLessonPlanStatus = async (
  planId: string,
  status: "active" | "completed" | "archived",
) => {
  const updated = await prisma.lessonPlan.update({
    where: { id: planId },
    data: { status },
  });

  return updated;
};

/**
 * Delete a lesson plan
 */
const deleteLessonPlan = async (planId: string) => {
  await prisma.lessonPlan.delete({
    where: { id: planId },
  });
};

export const lessonPlanService = {
  generateLessonPlan,
  getLessonPlanById,
  getStudentLessonPlans,
  updateLessonPlanStatus,
  deleteLessonPlan,
  callGroqForLessonPlan,
};
