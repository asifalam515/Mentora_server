import { prisma } from "../../../lib/prisma";

export interface TutorWithReviews {
  id: string;
  userId: string;
  bio: string;
  pricePerHr: number;
  rating: number;
  experience: number;
  isVerified: boolean;
  isFeatured: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  categories: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    student: {
      name: string;
    };
  }>;
}

/**
 * Fetch all active tutors with their profiles, categories, and reviews
 */
const getAllTutorsForMatching = async (): Promise<TutorWithReviews[]> => {
  const tutors = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          banned: true,
          status: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      reviews: {
        take: 5, // Get last 5 reviews for context
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    where: {
      user: {
        banned: false,
        status: "ACTIVE",
      },
    },
  });

  return tutors.filter((tutor) => tutor.categories.length > 0);
};

/**
 * Call Groq API (Ultra-fast LLM) to analyze tutors and recommend matches
 * Groq provides 100x faster inference than competitors
 */
const callGroqAPI = async (
  studentGoal: string,
  tutorsData: TutorWithReviews[],
): Promise<any> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable not set");
  }

  const formatTutorForResponse = (tutor: TutorWithReviews) => ({
    id: tutor.id,
    userId: tutor.userId,
    bio: tutor.bio,
    pricePerHr: tutor.pricePerHr,
    rating: tutor.rating,
    experience: tutor.experience,
    isVerified: tutor.isVerified,
    isFeatured: tutor.isFeatured,
    user: tutor.user,
    categories: tutor.categories.map((tc) => tc.category),
    reviews: tutor.reviews,
  });

  const startTime = Date.now();

  // Prepare premium-formatted tutor information
  const tutorInfos = tutorsData
    .map((tutor, index) => {
      const categories = tutor.categories
        .map((tc) => tc.category.name)
        .join(", ");
      const avgRating =
        tutor.reviews.length > 0
          ? (
              tutor.reviews.reduce((sum, r) => sum + r.rating, 0) /
              tutor.reviews.length
            ).toFixed(1)
          : "No ratings";
      const reviewsSummary =
        tutor.reviews.length > 0
          ? tutor.reviews
              .map(
                (r) =>
                  `• ${r.student.name}: ${r.rating}★ - "${r.comment || "Great tutor"}"`,
              )
              .join("\n")
          : "• No reviews yet";

      return `
【 TUTOR #${index + 1} 】
👤 Name: ${tutor.user.name}
📝 Bio: "${tutor.bio}"
🎓 Categories: ${categories}
⏱️  Experience: ${tutor.experience} years
💰 Price: $${tutor.pricePerHr}/hour
⭐ Rating: ${avgRating}/5 (${tutor.reviews.length} reviews)
✓ Verified: ${tutor.isVerified ? "✅ YES" : "❌ NO"}
⭐ Featured: ${tutor.isFeatured ? "🌟 YES" : "NO"}

Student Reviews:
${reviewsSummary}

---`;
    })
    .join("\n");

  const prompt = `You are an ELITE tutor recommendation engine with expertise in learning science and pedagogy.

STUDENT'S LEARNING OBJECTIVE:
"${studentGoal}"

YOUR TASK:
Analyze the following tutor profiles and identify the TOP 3 BEST MATCHES for this student. Prioritize:
1. Direct category/skill relevance to the goal
2. Teaching quality (ratings + review sentiment)
3. Experience depth relevant to the goal complexity
4. Student success indicators (verified badge, reviews)
5. Teaching approach fit

AVAILABLE TUTORS:
${tutorInfos}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown, explanations, or extra text)
- matchScore must be 0-100 (confidence in match)
- reason must be compelling and specific (2-3 sentences max)
- keywords should be 2-3 learning concepts

RESPONSE FORMAT (EXACT JSON):
{
  "matches": [
    {
      "tutorId": "uuid-string-here",
      "matchScore": 90,
      "reason": "Specific reason why this tutor matches the goal perfectly",
      "keywords": ["concept1", "concept2", "concept3"],
      "matchRationale": "One sentence explaining the pedagogical fit"
    }
  ],
  "alternativeRecommendations": "Brief tip for the student on how to maximize learning"
}`;

  try {
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
                "You are an expert tutor matching AI. Respond ONLY with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          top_p: 0.9,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Groq API error:", error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    const responseTime = Date.now() - startTime;

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.responseTime = responseTime;
    return parsed;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
};

/**
 * Main smart matching function
 */
const findSmartMatches = async (studentGoal: string) => {
  // Validate input
  if (!studentGoal || studentGoal.trim().length < 5) {
    throw new Error("Student goal must be at least 5 characters long");
  }

  // Fetch all available tutors
  const tutors = await getAllTutorsForMatching();

  if (tutors.length === 0) {
    throw new Error("No tutors available for matching");
  }

  // Call Groq API for ultra-fast AI analysis
  const aiRecommendations = await callGroqAPI(studentGoal, tutors);

  // Enrich recommendations with full tutor data and premium metadata
  const enrichedMatches = aiRecommendations.matches.map((match: any) => {
    const tutorData = tutors.find((t) => t.id === match.tutorId);
    return {
      ...match,
      tutor: tutorData ? formatTutorForResponse(tutorData) : null,
    };
  });

  return {
    studentGoal,
    timestamp: new Date().toISOString(),
    recommendations: enrichedMatches,
    alternativeRecommendations: aiRecommendations.alternativeRecommendations,
    totalTutorsAnalyzed: tutors.length,
    responseTime: aiRecommendations.responseTime,
    aiProvider: "groq",
  };
};

/**
 * Simple fallback matching if AI service is unavailable
 */
const findSimpleMatches = async (studentGoal: string) => {
  const tutors = await getAllTutorsForMatching();

  if (tutors.length === 0) {
    throw new Error("No tutors available for matching");
  }

  // Simple keyword matching
  const goalKeywords = studentGoal.toLowerCase().split(/\s+/);

  const scoredTutors = tutors.map((tutor) => {
    let score = 0;

    // Category match
    const tutorCategories = tutor.categories
      .map((tc) => tc.category.name.toLowerCase())
      .join(" ");
    goalKeywords.forEach((keyword) => {
      if (tutorCategories.includes(keyword)) score += 30;
    });

    // Rating weight
    score += tutor.rating * 10;

    // Experience weight
    score += Math.min(tutor.experience * 2, 20);

    // Verification bonus
    if (tutor.isVerified) score += 15;

    return {
      tutorId: tutor.id,
      score,
      tutor: {
        ...formatTutorForResponse(tutor),
      },
    };
  });

  // Sort by score and return top 3
  const topMatches = scoredTutors
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, tutor }) => ({
      tutorId: tutor.id,
      matchScore: Math.min(score, 100),
      reason: `Category relevance: ${tutor.categories.join(", ")} | Rating: ${tutor.rating}/5 | Experience: ${tutor.experience}y`,
      tutor,
    }));

  return {
    studentGoal,
    timestamp: new Date().toISOString(),
    recommendations: topMatches,
    alternativeRecommendations:
      "Using keyword-based matching. More detailed AI analysis may be available.",
    totalTutorsAnalyzed: tutors.length,
    method: "fallback",
  };
};

export const smartMatchService = {
  findSmartMatches,
  findSimpleMatches,
  getAllTutorsForMatching,
  callGroqAPI,
};
