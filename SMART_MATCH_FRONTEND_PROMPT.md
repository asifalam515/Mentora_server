# 🎯 Smart Match Feature - Frontend Implementation Prompt for Next.js

**Give this prompt to your frontend team/AI agent to implement Smart Match in your Next.js app**

---

## 📋 Project Brief

You need to integrate an **AI-Powered Smart Match feature** into a Next.js tutoring platform. This feature helps students find the best tutors based on their learning goals using AI recommendations.

---

## 🎯 Feature Overview

**What to Build:**

- Search interface where students enter their learning goal
- Backend API calls to get AI-powered tutor recommendations
- Display top 3-5 tutor matches with AI reasoning and match scores
- Mobile-responsive UI with professional styling

**Backend API Already Ready:**

- Live production endpoint: `https://skill-bridge-4216-server.vercel.app/api/v1/smart-match`
- No authentication required (public endpoint)
- Supports cookies for future auth integration

---

## 🔌 API Endpoints (Backend Already Built)

### Endpoint 1: Find Best Tutor Matches (AI-Powered)

```
POST https://skill-bridge-4216-server.vercel.app/api/v1/smart-match

Request Body:
{
  "goal": "I want to learn TypeScript for backend development"
}

Response:
{
  "success": true,
  "data": {
    "studentGoal": "I want to learn TypeScript for backend development",
    "timestamp": "2026-04-12T10:30:00.000Z",
    "recommendations": [
      {
        "tutorId": "uuid-string",
        "matchScore": 92,
        "reason": "Expert in backend TypeScript with Node.js and Express...",
        "keywords": ["TypeScript", "Node.js", "Backend"],
        "tutor": {
          "id": "uuid-string",
          "name": "John Doe",
          "bio": "Full-stack developer with 7 years experience",
          "email": "john@example.com",
          "image": "https://example.com/image.jpg",
          "categories": ["TypeScript", "Node.js", "Express"],
          "experience": 7,
          "pricePerHr": 45,
          "rating": 4.8,
          "isVerified": true,
          "isFeatured": true,
          "reviewCount": 12
        }
      }
      // ... 2-4 more matches
    ],
    "alternativeRecommendations": "Consider...",
    "totalTutorsAnalyzed": 24
  }
}

Response Time: 2-6 seconds (includes AI analysis)
Status Codes:
- 200: Success
- 400: Bad request (invalid goal)
- 500: Server error
```

### Endpoint 2: Get Category-Wise Recommendations

```
POST https://skill-bridge-4216-server.vercel.app/api/v1/smart-match/detailed

Request Body:
{
  "goal": "Learn React and Next.js",
  "limit": 3
}

Response:
{
  "success": true,
  "data": {
    "goal": "Learn React and Next.js",
    "timestamp": "2026-04-12T10:30:00.000Z",
    "byCategory": [
      {
        "category": "React",
        "topTutors": [
          {
            "id": "uuid",
            "name": "Sarah Frontend",
            "bio": "React specialist",
            "rating": 4.9,
            "experience": 5,
            "pricePerHr": 50,
            "reviewCount": 18
          }
        ]
      }
      // ... more categories
    ],
    "totalTutors": 24
  }
}

Response Time: <1 second
```

---

## 🛠️ Implementation Steps

### Step 1: Setup Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://skill-bridge-4216-server.vercel.app
# For local development:
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 2: Create API Service Client

Create `src/services/smartMatch.ts`:

```typescript
interface SmartMatchRequest {
  goal: string;
  limit?: number;
}

interface TutorData {
  id: string;
  name: string;
  bio: string;
  email: string;
  image?: string;
  categories: string[];
  experience: number;
  pricePerHr: number;
  rating: number;
  isVerified: boolean;
  isFeatured: boolean;
  reviewCount: number;
}

interface MatchedTutor {
  tutorId: string;
  matchScore: number;
  reason: string;
  keywords?: string[];
  tutor: TutorData;
}

interface SmartMatchResponse {
  success: boolean;
  data: {
    studentGoal: string;
    timestamp: string;
    recommendations: MatchedTutor[];
    alternativeRecommendations?: string;
    totalTutorsAnalyzed: number;
  };
  warning?: string;
}

class SmartMatchService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  }

  async findMatches(goal: string): Promise<SmartMatchResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/smart-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for cookie auth
      body: JSON.stringify({ goal }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to find matches");
    }

    return response.json();
  }

  async getDetailedMatches(
    goal: string,
    limit?: number,
  ): Promise<SmartMatchResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/smart-match/detailed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ goal, limit }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get matches");
    }

    return response.json();
  }
}

export const smartMatchService = new SmartMatchService();
```

### Step 3: Create Custom Hook

Create `src/hooks/useSmartMatch.ts`:

```typescript
import { useState, useCallback } from "react";
import { smartMatchService } from "@/services/smartMatch";
import type { MatchedTutor, SmartMatchResponse } from "@/services/smartMatch";

export function useSmartMatch() {
  const [matches, setMatches] = useState<MatchedTutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (goal: string) => {
    if (!goal.trim() || goal.trim().length < 5) {
      setError("Learning goal must be at least 5 characters");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await smartMatchService.findMatches(goal);
      setMatches(result.data.recommendations);
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to find matches";
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMatches = useCallback(() => {
    setMatches([]);
    setError(null);
  }, []);

  return {
    matches,
    loading,
    error,
    findMatches,
    clearMatches,
  };
}
```

### Step 4: Create Main Component

Create `src/components/SmartMatch.tsx`:

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useSmartMatch } from '@/hooks/useSmartMatch';
import './SmartMatch.css';

export function SmartMatch() {
  const [goal, setGoal] = useState('');
  const { matches, loading, error, findMatches } = useSmartMatch();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await findMatches(goal);
  };

  const handleBooking = (tutorId: string, tutorName: string) => {
    // Navigate to booking page or open booking modal
    console.log(`Booking session with ${tutorName} (${tutorId})`);
    // Example: window.location.href = `/booking?tutorId=${tutorId}`;
  };

  return (
    <div className="smart-match-container">
      <div className="smart-match-hero">
        <h1>🎓 Find Your Perfect Tutor</h1>
        <p>Tell us what you want to learn, and our AI will recommend the best tutors</p>
      </div>

      <form onSubmit={handleSubmit} className="smart-match-form">
        <div className="input-wrapper">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="E.g., I want to learn TypeScript for backend development"
            className="goal-input"
            disabled={loading}
          />
          <button
            type="submit"
            className="search-button"
            disabled={loading || !goal.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Finding tutors...
              </>
            ) : (
              <>🔍 Find Tutors</>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </form>

      {matches.length > 0 && (
        <section className="matches-section">
          <h2>Top Matches for "{goal}"</h2>
          <div className="matches-grid">
            {matches.map((match, index) => (
              <div
                key={match.tutorId}
                className={`tutor-card rank-${index + 1}`}
              >
                <div className="card-header">
                  <span className="rank">#{index + 1}</span>
                  <span className="match-score">{match.matchScore}% Match</span>
                </div>

                <div className="tutor-profile">
                  {match.tutor.image && (
                    <img
                      src={match.tutor.image}
                      alt={match.tutor.name}
                      className="tutor-image"
                    />
                  )}
                  <div className="tutor-info">
                    <h3>{match.tutor.name}</h3>
                    {match.tutor.isVerified && (
                      <span className="verified-badge">✓ Verified</span>
                    )}
                  </div>
                </div>

                <p className="tutor-bio">{match.tutor.bio}</p>

                <div className="reason-box">
                  <strong>Why this match:</strong>
                  <p>{match.reason}</p>
                </div>

                <div className="skills">
                  {match.tutor.categories.map((cat) => (
                    <span key={cat} className="skill-badge">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="stats">
                  <div className="stat">
                    <span className="label">Rating</span>
                    <span className="value">⭐ {match.tutor.rating}/5</span>
                  </div>
                  <div className="stat">
                    <span className="label">Experience</span>
                    <span className="value">{match.tutor.experience}y</span>
                  </div>
                  <div className="stat">
                    <span className="label">Price</span>
                    <span className="value">${match.tutor.pricePerHr}/hr</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleBooking(match.tutor.id, match.tutor.name)
                  }
                  className="book-button"
                >
                  📅 Book Trial Session
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && matches.length === 0 && goal && !error && (
        <div className="no-results">
          <p>No matches found. Try adjusting your search goal.</p>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Add Styling

Create `src/components/SmartMatch.css`:

```css
.smart-match-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.smart-match-hero {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.smart-match-hero h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  font-weight: 700;
}

.smart-match-hero p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.smart-match-form {
  margin-bottom: 40px;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

@media (max-width: 768px) {
  .input-wrapper {
    flex-direction: column;
  }
}

.goal-input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.goal-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.search-button {
  padding: 14px 32px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.search-button:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
}

.search-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.matches-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
}

.matches-section h2 {
  color: #333;
  margin-bottom: 30px;
  font-size: 1.8rem;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.tutor-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tutor-card:hover {
  border-color: #10b981;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.tutor-card.rank-1 {
  border: 2px solid #fbbf24;
  background: linear-gradient(135deg, #fef3c7 0%, #fff 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  background: #dbeafe;
  padding: 8px 12px;
  border-radius: 6px;
}

.rank {
  font-weight: 600;
  color: #1e40af;
  font-size: 1.2rem;
}

.match-score {
  background: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.tutor-profile {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.tutor-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e5e7eb;
}

.tutor-info h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.verified-badge {
  display: inline-block;
  background: #d1fae5;
  color: #065f46;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 4px;
}

.tutor-bio {
  color: #6b7280;
  margin: 0 0 15px 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.reason-box {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.reason-box strong {
  color: #1f2937;
  display: block;
  margin-bottom: 6px;
}

.reason-box p {
  color: #4b5563;
  margin: 0;
  line-height: 1.4;
}

.skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.skill-badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  color: #9ca3af;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.stat .value {
  display: block;
  color: #1f2937;
  font-weight: 600;
  font-size: 0.95rem;
}

.book-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.book-button:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.no-results {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  color: #6b7280;
}

@media (max-width: 768px) {
  .smart-match-container {
    padding: 20px 16px;
  }

  .smart-match-hero h1 {
    font-size: 1.8rem;
  }

  .matches-grid {
    grid-template-columns: 1fr;
  }

  .stats {
    grid-template-columns: 1fr;
  }
}
```

### Step 6: Add to Page/Route

Create or modify page: `src/app/smart-match/page.tsx`:

```typescript
import { SmartMatch } from '@/components/SmartMatch';

export const metadata = {
  title: 'Smart Match - Find Your Perfect Tutor',
  description: 'AI-powered tutor recommendations based on your learning goals',
};

export default function SmartMatchPage() {
  return <SmartMatch />;
}
```

### Step 7: Add Navigation Link

Update your navigation component to include:

```tsx
<Link href="/smart-match" className="nav-link">
  🎯 Smart Match
</Link>
```

---

## 📝 Testing Guide

### Manual Testing

1. **Test Goal Input:**
   - Empty goal → Should show error "Learning goal must be at least 5 characters"
   - Short goal (< 5 chars) → Should show error
   - Valid goal → Should fetch matches

2. **Test API Call:**

   ```bash
   curl -X POST https://skill-bridge-4216-server.vercel.app/api/v1/smart-match \
     -H "Content-Type: application/json" \
     -d '{"goal": "Learn TypeScript for backend development"}'
   ```

3. **Test Goals to Try:**
   - "I want to learn Python for data science"
   - "Help me master React and Next.js"
   - "I need to improve my English skills"
   - "Teach me JavaScript fundamentals"
   - "I want to learn web development from scratch"

### Example Search Goals for Demo:

```
✓ "I want to learn TypeScript for backend development"
✓ "Help me master React and Next.js for full-stack development"
✓ "I'm starting web development from scratch"
✓ "Teach me Python for data science and AI"
✓ "I want to improve my English communication skills"
```

---

## 🚀 Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy
# or
vercel --prod
```

### Environment Variables to Set in Vercel:

```
NEXT_PUBLIC_API_URL=https://skill-bridge-4216-server.vercel.app
```

---

## 🎨 Design Customization

The component uses the following color scheme (easy to customize):

- Primary: `#667eea` to `#764ba2` (gradient)
- Success: `#10b981` (green)
- Warning: `#fbbf24` (yellow)
- Info: `#dbeafe` (light blue)

Edit `SmartMatch.css` to change colors, fonts, or spacing.

---

## 🔄 Common Customizations

### 1. Change Booking Destination

```typescript
const handleBooking = (tutorId: string, tutorName: string) => {
  // Option 1: Navigate to booking page
  router.push(`/booking?tutorId=${tutorId}`);

  // Option 2: Open booking modal
  setSelectedTutor(tutorId);
  setShowBookingModal(true);

  // Option 3: Direct URL
  window.location.href = `/tutors/${tutorId}`;
};
```

### 2. Add Analytics Tracking

```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  // Track event
  gtag.event("smart_match_search", {
    goal_length: goal.length,
    timestamp: new Date().toISOString(),
  });

  await findMatches(goal);
};
```

### 3. Add to Homepage Hero

Integrate the search form into your homepage hero section:

```typescript
<section className="hero">
  <h1>Find Your Perfect Tutor</h1>
  <SearchForm />
</section>
```

---

## ⚠️ Important Notes

1. **API Key:** No authentication needed (public endpoint)
2. **CORS:** Already configured on backend
3. **Response Time:** AI analysis takes 2-6 seconds (normal)
4. **Fallback:** If AI unavailable, falls back to keyword matching (still works)
5. **Mobile:** Fully responsive design included

---

## 🛠️ Troubleshooting

| Issue                | Solution                                                             |
| -------------------- | -------------------------------------------------------------------- |
| "Failed to fetch"    | Check NEXT_PUBLIC_API_URL environment variable                       |
| No matches returned  | Backend currently has limited tutors; works perfectly with more data |
| Slow response (>10s) | AI inference can take 2-6s, which is normal                          |
| CORS errors          | Backend already configured; check browser console for actual error   |
| 400 error            | Goal must be 5+ characters                                           |

---

## 📚 Additional Resources

**Backend Documentation:**

- API Details: `SMART_MATCH_DOCUMENTATION.md`
- Implementation Summary: `SMART_MATCH_IMPLEMENTATION_SUMMARY.md`

**What the Backend Does:**

- Uses Google Gemma 2 9B AI model (free)
- Analyzes 40+ tutor matching criteria
- Returns JSON with scores and reasoning
- Automatic fallback to keyword matching

---

## 🎯 Success Criteria

After implementation, verify:

- ✅ Form accepts text input
- ✅ Search button disabled when input empty
- ✅ Loading state shown while fetching (2-6s)
- ✅ Results display with match scores
- ✅ Top result highlighted (#1)
- ✅ Book button navigates correctly
- ✅ Mobile responsive on all device sizes
- ✅ Error handling works for invalid input
- ✅ Styling matches your brand

---

## 📞 Quick Support

**Need Help?**

1. Check API endpoint is returning data: Test with cURL command above
2. Check environment variables are set correctly
3. Check console for JavaScript errors
4. Verify response structure matches expected types
5. Check network tab for failed requests

---

**Ready? Start with Step 1 and follow through Step 7. Happy coding! 🚀**
