import { prisma } from "../../../lib/prisma";

type ResumeTone = "professional" | "friendly" | "premium";

type EnhanceResumePayload = {
  userId: string;
  tone?: ResumeTone;
  achievements?: string[];
  teachingStyle?: string;
  specialties?: string[];
  applyToProfile?: boolean;
};

type ResumeEnhancement = {
  headline: string;
  improvedBio: string;
  expertiseHighlights: string[];
  teachingStrengths: string[];
  suggestedKeywords: string[];
  profileSummary: string;
};

const parseJsonResponse = (content: string): ResumeEnhancement => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  try {
    return JSON.parse(jsonMatch[0]) as ResumeEnhancement;
  } catch {
    const cleanedJson = jsonMatch[0]
      .replace(/\n/g, " ")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    return JSON.parse(cleanedJson) as ResumeEnhancement;
  }
};

const callGroqResumeEnhancer = async (params: {
  name: string;
  currentBio: string;
  categories: string[];
  experience: number;
  rating: number;
  completedSessions: number;
  recentReviewSnippets: string[];
  tone: ResumeTone;
  achievements: string[];
  teachingStyle?: string;
  specialties: string[];
}) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable not set");
  }

  const prompt = `You are an expert profile copywriter for tutor marketplaces.

Create an enhanced tutor resume section based on the following information.

Tutor Name: ${params.name}
Current Bio: ${params.currentBio}
Categories: ${params.categories.join(", ") || "General"}
Experience: ${params.experience} years
Rating: ${params.rating}/5
Completed Sessions: ${params.completedSessions}
Recent Review Snippets: ${params.recentReviewSnippets.join(" | ") || "No recent reviews"}
Preferred Tone: ${params.tone}
Achievements: ${params.achievements.join(" | ") || "Not specified"}
Teaching Style: ${params.teachingStyle || "Not specified"}
Specialties: ${params.specialties.join(" | ") || "Not specified"}

Return ONLY valid JSON in this exact format:
{
  "headline": "One-line impactful headline (max 90 chars)",
  "improvedBio": "Polished marketplace-ready bio (120-220 words)",
  "expertiseHighlights": ["highlight 1", "highlight 2", "highlight 3"],
  "teachingStrengths": ["strength 1", "strength 2", "strength 3"],
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "profileSummary": "One short summary for cards (max 160 chars)"
}`;

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
              "You are a tutoring marketplace resume expert. Respond ONLY with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.45,
        max_tokens: 1200,
        top_p: 0.9,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Groq API error:", error);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content || "";
  return parseJsonResponse(content);
};

const enhanceTutorResume = async (payload: EnhanceResumePayload) => {
  const {
    userId,
    tone = "professional",
    achievements = [],
    teachingStyle,
    specialties = [],
    applyToProfile = false,
  } = payload;

  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          rating: true,
          comment: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: "COMPLETED",
            },
          },
        },
      },
    },
  });

  if (!tutor) {
    throw new Error("Tutor profile not found. Please create profile first.");
  }

  const enhancement = await callGroqResumeEnhancer({
    name: tutor.user.name,
    currentBio: tutor.bio,
    categories: tutor.categories.map((item) => item.category.name),
    experience: tutor.experience,
    rating: tutor.rating,
    completedSessions: tutor._count.bookings,
    recentReviewSnippets: tutor.reviews
      .map((review) => review.comment)
      .filter((comment): comment is string => Boolean(comment)),
    tone,
    achievements,
    teachingStyle,
    specialties,
  });

  if (applyToProfile) {
    await prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: {
        bio: enhancement.improvedBio,
      },
    });
  }

  return {
    tutorId: tutor.id,
    tutorName: tutor.user.name,
    originalBio: tutor.bio,
    enhancement,
    appliedToProfile: applyToProfile,
    generatedAt: new Date().toISOString(),
  };
};

export const resumeBuilderService = {
  enhanceTutorResume,
};
