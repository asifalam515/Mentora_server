# 🎓 Smart Match Feature Documentation

## Overview

**Smart Match** is an AI-powered tutor recommendation system that analyzes a student's learning goal and suggests the best-matched tutors based on:

- **Category Relevance**: Tutor's expertise areas match the student's learning goal
- **Experience & Rating**: Past performance and student satisfaction metrics
- **Review Quality**: Detailed feedback from previous students
- **Profile Analysis**: Bio and teaching style indicators
- **Verification Status**: Credibility indicators (verified badges, featured status)

The system uses **Google Gemma 2 9B** via **Open Router API** for intelligent matching, with automatic fallback to keyword-based matching if the AI service is unavailable.

---

## Technology Stack

- **AI Model**: Google Gemma 2 9B (free tier via Open Router)
- **API Provider**: Open Router (https://openrouter.ai)
- **Language Model Features**:
  - Free tier available ($0 cost)
  - Fast inference (Gemma is optimized for speed)
  - Context-aware understanding
  - JSON-formatted responses

---

## API Endpoints

### 1. POST `/api/v1/smart-match`

**AI-Powered Tutor Matching** (Recommended)

Finds the best tutor matches using AI analysis.

**Request**:

```json
{
  "goal": "I want to learn TypeScript for backend development"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "studentGoal": "I want to learn TypeScript for backend development",
    "timestamp": "2026-04-12T10:30:00.000Z",
    "recommendations": [
      {
        "tutorId": "uuid-1",
        "matchScore": 92,
        "reason": "Expert in backend TypeScript with Node.js and Express. 4.8/5 rating with 12 completed students",
        "keywords": ["TypeScript", "Node.js", "Backend", "REST APIs"],
        "tutor": {
          "id": "uuid-1",
          "name": "John Backend",
          "bio": "Full-stack developer with 7 years of experience...",
          "email": "john@example.com",
          "image": "https://...",
          "categories": ["TypeScript", "Node.js", "Express", "REST APIs"],
          "experience": 7,
          "pricePerHr": 45,
          "rating": 4.8,
          "isVerified": true,
          "isFeatured": true,
          "reviewCount": 12
        }
      },
      {
        "tutorId": "uuid-2",
        "matchScore": 87,
        "reason": "Strong backend fundamentals with JavaScript/TypeScript focus. Beginner-friendly approach",
        "keywords": ["TypeScript", "JavaScript", "Backend Basics"],
        "tutor": { ... }
      }
    ],
    "alternativeRecommendations": "Consider also exploring tutors with Node.js specialization for deeper backend knowledge.",
    "totalTutorsAnalyzed": 24
  }
}
```

**Query Examples**:

- "I want to learn TypeScript for backend"
- "Help me master React and Next.js"
- "I need to learn Python for data science"
- "I'm starting web development from scratch"
- "I want to improve my database design skills"

---

### 2. POST `/api/v1/smart-match/detailed`

**Category-Wise Recommendations**

Returns tutor recommendations grouped by skill category.

**Request**:

```json
{
  "goal": "React and web development",
  "limit": 3
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "goal": "React and web development",
    "timestamp": "2026-04-12T10:30:00.000Z",
    "byCategory": [
      {
        "category": "React",
        "topTutors": [
          {
            "id": "uuid-1",
            "name": "Sarah Frontend",
            "bio": "React specialist with 5 years experience...",
            "rating": 4.9,
            "experience": 5,
            "pricePerHr": 50,
            "reviewCount": 18
          }
        ]
      },
      {
        "category": "JavaScript",
        "topTutors": [...]
      }
    ],
    "totalTutors": 24
  }
}
```

---

## How It Works

### Architecture Flow

```
┌─────────────┐
│   Student   │
│  Goal: "I   │
│  want to    │
│  learn TS"  │
└──────┬──────┘
       │ POST /api/v1/smart-match
       ▼
┌─────────────────────────────────┐
│   Smart Match Controller        │
│  (Request validation)           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Fetch All Active Tutors       │
│   (+ bio, categories, reviews)  │
│                                 │
│   Prisma Query:                 │
│   - TutorProfile                │
│   - Join: User, Categories      │
│   - Include: Last 5 reviews     │
│   - Filter: Active users        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Open Router API Call           │
│  Model: Google Gemma 2 9B       │
│                                 │
│  Prompt includes:               │
│  - Student goal                 │
│  - All tutor data               │
│  - Evaluation criteria          │
│                                 │
│  Returns JSON with:             │
│  - Top 3 matches                │
│  - Match scores                 │
│  - Reasoning                    │
└──────┬──────────────────────────┘
       │
       ├─ Success ──────────────────┐
       │                            │
       │                            ▼
       │         ┌──────────────────────┐
       │         │ Enrich with full     │
       │         │ tutor data           │
       │         │ (image, contacts)    │
       │         └──────┬───────────────┘
       │                │
       │                ▼
       │         ┌────────────────┐
       └────────►│   JSON         │
    Fallback     │  Response      │
 (if AI fails)   │   (Top 3)      │
       │         └────────────────┘
       │
       ├─ Failure ──────┐
       │                │
       ▼                ▼
   Keyword       Return Simple
   Matching      Matches
   (Category +   (Score-based)
    Rating +
    Experience)
```

### AI Analysis Process

The Gemma 2 model evaluates each tutor against:

1. **Relevance Score** (40%)
   - Exact category matches
   - Keywords in bio and reviews
   - Teaching style fit

2. **Quality Score** (35%)
   - Average rating from reviews
   - Recent review sentiment
   - Verification status

3. **Experience Score** (20%)
   - Years of teaching experience
   - Number and depth of reviews
   - Featured/verified badges

4. **Fit Score** (5%)
   - Price tier appropriateness
   - Schedule indicators (if available)
   - Specialty matches

---

## Implementation Details

### Environment Setup

Add to `.env`:

```bash
# Open Router API (https://openrouter.ai)
# Free tier: $0/query for select models
OPENROUTER_API=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
```

**Getting an API Key**:

1. Visit https://openrouter.ai
2. Sign up (free)
3. Go to Settings → Keys
4. Create new API key
5. Copy and add to `.env`

### Data Flow

**Step 1: Fetch Tutors**

```typescript
// From prisma/schema.prisma:
- TutorProfile (bio, rating, experience)
  - User (name, email, image)
  - Categories (teaching areas)
  - Reviews (last 5, with student feedback)
```

**Step 2: Build AI Prompt**

```typescript
// Construct rich context for Gemma:
STUDENT GOAL: "I want to learn TypeScript for backend"

Available Tutors:
TUTOR: John Backend
BIO: Full-stack developer...
CATEGORIES: TypeScript, Node.js, Express
EXPERIENCE: 7 years
RATING: 4.8/5
VERIFIED: Yes
REVIEWS:
  Alice: 5/5 - Great teacher, very patient
  Bob: 4/5 - Excellent backend knowledge
```

**Step 3: AI Inference**

- Model: `google/gemma-2-9b-it:free`
- Temperature: 0.7 (balanced creativity)
- Max tokens: 1000
- Response format: JSON with match details

**Step 4: Response Enrichment**

- Attach full tutor profile data
- Include contact information
- Add recommendation reasoning

---

## Fallback Strategy

If Open Router API fails (network error, rate limit, service down):

```
Primary Path: AI Matching (Google Gemma)
    ↓
    [Error occurs]
    ↓
Fallback Path: Keyword Matching
    ├─ Category relevance: +30 points
    ├─ Rating: +10 × (rating value) points
    ├─ Experience: +2 × (years) points
    ├─ Verified badge: +15 points
    └─ Sort by score, return top 3
```

**Example Fallback**:

```json
{
  "studentGoal": "Learn TypeScript",
  "recommendations": [
    {
      "tutorId": "uuid-1",
      "matchScore": 82,
      "reason": "Category relevance: TypeScript, Node.js | Rating: 4.8/5 | Experience: 7y",
      "tutor": { ... }
    }
  ],
  "method": "fallback",
  "warning": "AI matching unavailable, using keyword-based fallback"
}
```

---

## Database Schema

### Relevant Tables:

**TutorProfile**

```sql
id            UUID PRIMARY KEY
userId        UUID (FOREIGN KEY → User)
bio           STRING (teaching description)
pricePerHr    FLOAT
rating        FLOAT (auto-calculated from reviews)
experience    INT (years)
isVerified    BOOLEAN
isFeatured    BOOLEAN
```

**TutorCategory** (junction table)

```sql
tutorId       UUID (FOREIGN KEY → TutorProfile)
categoryId    UUID (FOREIGN KEY → Category)
```

**Category**

```sql
id            UUID PRIMARY KEY
name          STRING (e.g., "TypeScript", "React")
```

**Review**

```sql
id            UUID PRIMARY KEY
tutorId       UUID (FOREIGN KEY → TutorProfile)
studentId     UUID (FOREIGN KEY → User)
rating        INT (1-5)
comment       STRING
```

---

## Performance Considerations

### Query Optimization

- Indexing on `tutorProfile.userId`, `review.tutorId`
- Limiting reviews to last 5 per tutor (reduces payload)
- Filtering banned/inactive users at DB level

### API Rate Limiting

- Open Router free tier: ~10 requests/minute
- Implement client-side debouncing (500ms)
- Cache results for identical goals (if needed)

### Response Times

- Tutor fetch: ~100-500ms
- AI inference (Gemma): ~2-5 seconds
- Total endpoint: ~3-6 seconds
- Fallback (if AI fails): ~200-700ms

---

## Error Handling

### 400 Bad Request

- Empty/missing goal
- Goal too short (<5 characters)

### 500 Server Error

- No tutors available
- API key configuration missing
- Network/service error (with fallback attempt)

**Error Responses**:

```json
{
  "success": false,
  "message": "Student goal must be at least 5 characters long"
}
```

---

## Frontend Integration

### React Example (TypeScript)

```typescript
interface SmartMatchRequest {
  goal: string;
}

interface Tutor {
  id: string;
  name: string;
  bio: string;
  categories: string[];
  rating: number;
  pricePerHr: number;
  isVerified: boolean;
}

interface SmartMatchResponse {
  success: boolean;
  data: {
    studentGoal: string;
    recommendations: Array<{
      tutorId: string;
      matchScore: number;
      reason: string;
      tutor: Tutor;
    }>;
  };
}

async function findSmartMatches(goal: string): Promise<SmartMatchResponse> {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/api/v1/smart-match`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ goal }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to get tutor matches");
  }

  return response.json();
}

// Usage
async function handleSearch(studentGoal: string) {
  try {
    const result = await findSmartMatches(studentGoal);
    // Display result.data.recommendations to user
  } catch (error) {
    console.error(error);
  }
}
```

---

## Testing the Feature

### Via cURL

**Basic AI Matching**:

```bash
curl -X POST http://localhost:5000/api/v1/smart-match \
  -H "Content-Type: application/json" \
  -d '{"goal": "I want to learn TypeScript for backend development"}'
```

**Detailed Recommendations**:

```bash
curl -X POST http://localhost:5000/api/v1/smart-match/detailed \
  -H "Content-Type: application/json" \
  -d '{"goal": "React and Next.js", "limit": 3}'
```

### Via Postman

1. **Method**: POST
2. **URL**: `http://localhost:5000/api/v1/smart-match`
3. **Headers**: `Content-Type: application/json`
4. **Body** (JSON):
   ```json
   {
     "goal": "Learn Python for data science and machine learning"
   }
   ```

---

## Future Enhancements

### Phase 2:

- [ ] Student learning level detection (beginner/intermediate/advanced)
- [ ] Schedule preference matching
- [ ] Budget/price filtering
- [ ] Language preference support
- [ ] Time zone consideration

### Phase 3:

- [ ] Persistent match history for students
- [ ] Recommendation feedback loop (did student book? rating?)
- [ ] Personalized matching based on learning style
- [ ] Similar student discovery

### Phase 4:

- [ ] Real-time availability consideration
- [ ] Multi-language support for goals
- [ ] Advanced profile enrichment via web scraping
- [ ] Competitor tutor comparison

---

## Support & Troubleshooting

### Issue: "AI matching unavailable" warning

**Solution**:

1. Verify `OPENROUTER_API` is set in `.env`
2. Check API key validity at https://openrouter.ai/settings
3. Ensure internet connectivity
4. Check API rate limits (free tier: ~10/min)

### Issue: Returns empty recommendations

**Solution**:

1. Ensure tutors exist in database: `SELECT COUNT(*) FROM "tutorProfile"`
2. Verify tutors have categories assigned
3. Check tutor `status` and `banned` fields (should be ACTIVE/false)

### Issue: Slow response time

**Solution**:

1. Gemma typically responds in 2-5s; this is normal
2. Consider implementing frontend loading indicators
3. Cache results for repeated goals
4. Verify OpenRouter service status

---

## API Pricing

- **Open Router Gemma 2 9B**: Free tier available ($0)
- **Enterprise tier**: $0.00038 per 1K input tokens + $0.00057 per 1K output tokens
- **Monthly estimate** (10 matches/day): ~$0-2

---

## File Structure

```
src/modules/smartMatch/
├── smartMatch.service.ts      # Core matching logic
├── smartMatch.controller.ts   # HTTP request handlers
└── smartMatch.router.ts       # Route definitions
```

---

## References

- **Open Router Documentation**: https://openrouter.ai/docs
- **Gemma 2 Model Card**: https://huggingface.co/google/gemma-2-9b-it
- **Prisma Documentation**: https://www.prisma.io/docs
- **Express.js API**: https://expressjs.com/en/4x/api.html

---

**Last Updated**: April 12, 2026
**Status**: ✅ Production Ready
**Version**: 1.0.0
