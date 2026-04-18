# 🎓 Smart Match - Frontend Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the AI-powered Smart Match feature into your frontend application. The feature recommends the best tutors based on a student's learning goal.

---

## Quick Start

### 1. Basic Implementation (React + TypeScript)

```typescript
import { useState } from 'react';

interface Tutor {
  id: string;
  name: string;
  bio: string;
  categories: string[];
  rating: number;
  pricePerHr: number;
  image?: string;
}

interface Match {
  tutorId: string;
  matchScore: number;
  reason: string;
  tutor: Tutor;
}

function SmartMatchSearch() {
  const [goal, setGoal] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!goal.trim()) {
      setError('Please enter a learning goal');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/v1/smart-match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ goal }),
        }
      );

      if (!response.ok) throw new Error('Failed to find matches');

      const data = await response.json();
      setMatches(data.data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="smart-match-container">
      <h1>🎯 Find Your Perfect Tutor</h1>

      <div className="search-section">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., Learn TypeScript for backend development"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Finding tutors...' : 'Search'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {matches.length > 0 && (
        <div className="matches-list">
          <h2>Top {matches.length} Matches</h2>
          {matches.map((match) => (
            <div key={match.tutorId} className="match-card">
              <div className="match-header">
                <img
                  src={match.tutor.image}
                  alt={match.tutor.name}
                  className="tutor-avatar"
                />
                <div className="tutor-info">
                  <h3>{match.tutor.name}</h3>
                  <p className="bio">{match.tutor.bio}</p>
                </div>
                <div className="match-score">{match.matchScore}% Match</div>
              </div>

              <p className="reason">
                <strong>Why:</strong> {match.reason}
              </p>

              <div className="tutor-stats">
                <span className="rating">
                  ⭐ {match.tutor.rating}/5
                </span>
                <span className="price">
                  ${match.tutor.pricePerHr}/hr
                </span>
                {match.tutor.isVerified && (
                  <span className="verified">✓ Verified</span>
                )}
              </div>

              <div className="categories">
                {match.tutor.categories.map((cat) => (
                  <span key={cat} className="category-badge">
                    {cat}
                  </span>
                ))}
              </div>

              <button className="book-btn">Book Session</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SmartMatchSearch;
```

---

## 2. Centralized API Client Setup

Create a dedicated API client service:

**File**: `src/services/api.ts`

```typescript
import axios, { AxiosInstance } from "axios";

interface SmartMatchRequest {
  goal: string;
  limit?: number;
}

interface SmartMatchResponse {
  success: boolean;
  data: {
    studentGoal: string;
    timestamp: string;
    recommendations: Array<{
      tutorId: string;
      matchScore: number;
      reason: string;
      tutor: {
        id: string;
        name: string;
        bio: string;
        categories: string[];
        rating: number;
        pricePerHr: number;
        image?: string;
        isVerified: boolean;
      };
    }>;
  };
  warning?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      withCredentials: true, // CRITICAL: Send cookies with requests
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add token to every request if available
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 (redirect to login)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear auth data and redirect to login
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  async findSmartMatches(
    request: SmartMatchRequest,
  ): Promise<SmartMatchResponse> {
    const response = await this.client.post("/api/v1/smart-match", request);
    return response.data;
  }

  async getDetailedMatches(
    request: SmartMatchRequest,
  ): Promise<SmartMatchResponse> {
    const response = await this.client.post(
      "/api/v1/smart-match/detailed",
      request,
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

---

## 3. Custom Hook for Smart Match

**File**: `src/hooks/useSmartMatch.ts`

```typescript
import { useState, useCallback } from "react";
import { apiClient } from "../services/api";

interface Match {
  tutorId: string;
  matchScore: number;
  reason: string;
  tutor: any;
}

export function useSmartMatch() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (goal: string) => {
    if (!goal.trim() || goal.trim().length < 5) {
      setError("Learning goal must be at least 5 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.findSmartMatches({ goal });
      setMatches(result.data.recommendations);
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to find matches";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDetailedMatches = useCallback(
    async (goal: string, limit?: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.getDetailedMatches({ goal, limit });
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to get matches";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    matches,
    loading,
    error,
    findMatches,
    getDetailedMatches,
  };
}
```

---

## 4. React Component with Styling

**File**: `src/components/SmartMatchSearch.tsx`

```typescript
import React, { useState } from 'react';
import { useSmartMatch } from '../hooks/useSmartMatch';
import './SmartMatchSearch.css';

export function SmartMatchSearch() {
  const [goal, setGoal] = useState('');
  const { matches, loading, error, findMatches } = useSmartMatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await findMatches(goal);
  };

  const handleBooking = (tutorId: string) => {
    // Navigate to booking or open booking modal
    console.log('Book session with tutor:', tutorId);
  };

  return (
    <div className="smart-match-page">
      <div className="hero-section">
        <h1>🎓 Smart Match: Find Your Perfect Tutor</h1>
        <p className="subtitle">
          Tell us what you want to learn, and our AI will recommend the best tutors
        </p>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="input-group">
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
                Finding best tutors...
              </>
            ) : (
              <>🔍 Find Tutors</>
            )}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </form>

      {matches.length > 0 && (
        <div className="results-section">
          <h2>Top Matches for "{goal}"</h2>
          <div className="matches-grid">
            {matches.map((match, index) => (
              <div
                key={match.tutorId}
                className={`match-card rank-${index + 1}`}
              >
                <div className="card-badge">
                  <span className="rank">#{index + 1}</span>
                  <span className="match-score">{match.matchScore}% Match</span>
                </div>

                <div className="tutor-header">
                  <img
                    src={match.tutor.image}
                    alt={match.tutor.name}
                    className="tutor-image"
                  />
                  <div className="tutor-name-info">
                    <h3>{match.tutor.name}</h3>
                    {match.tutor.isVerified && (
                      <span className="verified-badge">✓ Verified Tutor</span>
                    )}
                  </div>
                </div>

                <p className="tutor-bio">{match.tutor.bio}</p>

                <div className="reason-box">
                  <strong>Why this match:</strong>
                  <p>{match.reason}</p>
                </div>

                <div className="skills">
                  {match.tutor.categories.map((category) => (
                    <span key={category} className="skill-tag">
                      {category}
                    </span>
                  ))}
                </div>

                <div className="stats-row">
                  <div className="stat">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value">
                      ⭐ {match.tutor.rating}/5
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Experience</span>
                    <span className="stat-value">
                      {match.tutor.experience} years
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Price</span>
                    <span className="stat-value">
                      ${match.tutor.pricePerHr}/hr
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBooking(match.tutorId)}
                  className="book-button"
                >
                  📅 Book Trial Session
                </button>
              </div>
            ))}
          </div>
        </div>
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

**File**: `src/components/SmartMatchSearch.css`

```css
.smart-match-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.hero-section {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.hero-section h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  font-weight: 700;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.search-form {
  margin-bottom: 40px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.goal-input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

.error-banner {
  background: #fee;
  color: #c33;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.error-icon {
  font-size: 1.2rem;
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
}

.results-section h2 {
  color: #333;
  margin-bottom: 30px;
  font-size: 1.8rem;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.match-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.match-card:hover {
  border-color: #10b981;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.match-card.rank-1 {
  border: 2px solid #fbbf24;
  background: linear-gradient(135deg, #fef3c7 0%, #fff 100%);
}

.match-card.rank-1 .card-badge {
  background: #fbbf24;
}

.card-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #dbeafe;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-weight: 600;
  color: #1e40af;
}

.rank {
  font-size: 1.2rem;
}

.match-score {
  background: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.tutor-header {
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

.tutor-name-info h3 {
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
  margin-bottom: 15px;
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

.skill-tag {
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
}

.stats-row {
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

.stat-label {
  display: block;
  color: #9ca3af;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.stat-value {
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
  .hero-section h1 {
    font-size: 1.8rem;
  }

  .input-group {
    flex-direction: column;
  }

  .matches-grid {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Integration with Navigation

Add Smart Match to your navigation bar:

```typescript
// In your Header/Navigation component
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <Link to="/smart-match">🎯 Smart Match</Link>
      {/* Other nav items */}
    </nav>
  );
}

// In your Routes/Router
<Route path="/smart-match" element={<SmartMatchSearch />} />
```

---

## 6. Environment Variables

Add to your `.env.local`:

```bash
REACT_APP_API_URL=https://skill-bridge-4216-server.vercel.app
# For local development:
# REACT_APP_API_URL=http://localhost:5000
```

---

## 7. Error Handling Examples

```typescript
import { useSmartMatch } from '../hooks/useSmartMatch';

function SmartMatchWithErrorHandling() {
  const { matches, loading, error, findMatches } = useSmartMatch();
  const [userMessage, setUserMessage] = useState('');

  const handleSearch = async () => {
    try {
      await findMatches(userMessage);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          setUserMessage('Please log in to continue');
        } else if (err.message.includes('Network')) {
          setUserMessage('Network error. Please check your connection');
        } else {
          setUserMessage(err.message);
        }
      }
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

---

## 8. Performance Optimization

### Debounce Search Input

```typescript
import { useCallback } from 'react';

function useDebounce<T extends any[]>(
  callback: (...args: T) => void,
  delay: number = 500
) {
  const timeoutRef = useCallback(
    ((...args: T) => {
      const timeout = setTimeout(() => callback(...args), delay);
      return timeout;
    }) as any,
    [callback, delay]
  );

  return timeoutRef;
}

// Usage in component
const debouncedSearch = useDebounce((goal: string) => {
  findMatches(goal);
}, 500);

// In input onChange
onChange={(e) => {
  setGoal(e.target.value);
  debouncedSearch(e.target.value);
}}
```

### Cache Results

```typescript
function useCachedSmartMatch() {
  const [cache, setCache] = useState<Record<string, any>>({});
  const { findMatches } = useSmartMatch();

  const findMatchesWithCache = useCallback(
    async (goal: string) => {
      const cacheKey = goal.toLowerCase();
      if (cache[cacheKey]) {
        return cache[cacheKey];
      }

      const result = await findMatches(goal);
      setCache((prev) => ({
        ...prev,
        [cacheKey]: result,
      }));
      return result;
    },
    [cache, findMatches],
  );

  return { findMatches: findMatchesWithCache };
}
```

---

## 9. Tracking & Analytics

```typescript
function trackSmartMatchEvent(goalLength: number, matchCount: number) {
  // Google Analytics
  gtag.event("smart_match_search", {
    goal_length: goalLength,
    match_count: matchCount,
    timestamp: new Date().toISOString(),
  });

  // Mixpanel
  mixpanel.track("Smart Match Search", {
    goalLength,
    matchCount,
  });
}

// Call after receiving matches
const handleSearch = async (goal: string) => {
  const result = await findMatches(goal);
  trackSmartMatchEvent(goal.length, result.data.recommendations.length);
};
```

---

## 10. Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartMatchSearch } from './SmartMatchSearch';

// Mock the API
jest.mock('../services/api', () => ({
  apiClient: {
    findSmartMatches: jest.fn(),
  },
}));

describe('SmartMatchSearch', () => {
  it('should display tutor matches', async () => {
    const mockMatches = [
      {
        tutorId: '1',
        matchScore: 90,
        reason: 'Perfect match',
        tutor: {
          id: '1',
          name: 'John Doe',
          bio: 'Expert',
          categories: ['React'],
          rating: 4.8,
          pricePerHr: 50,
          isVerified: true,
        },
      },
    ];

    apiClient.findSmartMatches.mockResolvedValue({
      success: true,
      data: { recommendations: mockMatches },
    });

    render(<SmartMatchSearch />);

    const input = screen.getByPlaceholderText(/learning goal/i);
    fireEvent.change(input, { target: { value: 'Learn React' } });
    fireEvent.click(screen.getByText(/Find Tutors/i));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

---

## 11. Mobile Responsive Design

The provided CSS includes responsive breakpoints. Key mobile optimizations:

- Single column layout on mobile
- Full-width input fields
- Touch-friendly button sizes (44px minimum)
- Simplified card layouts
- Bottom sheet modal should replace inline results on very small screens

---

## Live Examples

### Search Goal Ideas:

- "I want to learn TypeScript for backend development"
- "Help me master React and Next.js"
- "I'm starting web development from scratch"
- "I need Python for data science"
- "Teach me advanced JavaScript concepts"

---

## API Endpoints Reference

### POST `/api/v1/smart-match`

- **Purpose**: Find best tutor matches using AI
- **Response Time**: 2-6 seconds (includes AI inference)
- **Returns**: Top 3-5 matches with scores and reasoning

### POST `/api/v1/smart-match/detailed`

- **Purpose**: Get category-wise recommendations
- **Response Time**: <1 second (no AI inference)
- **Returns**: Tutors grouped by category with top performers per category

---

## Troubleshooting

| Issue                             | Solution                                                     |
| --------------------------------- | ------------------------------------------------------------ |
| "AI matching unavailable" warning | Normal fallback behavior; keyword-based matching still works |
| Slow response (>10s)              | Check internet; Open Router API might be overloaded          |
| No matches returned               | No tutors in database or none match the goal                 |
| 401 Unauthorized                  | Ensure `credentials: 'include'` is set in fetch/axios        |
| CORS errors                       | Add frontend domain to allowed origins in backend            |

---

## Support

For issues or questions:

1. Check [SMART_MATCH_DOCUMENTATION.md](../SMART_MATCH_DOCUMENTATION.md) for backend details
2. Verify environment variables are set correctly
3. Check browser console for error messages
4. Review API response structure in Network tab

---

**Last Updated**: April 12, 2026
**Status**: ✅ Ready for Development
