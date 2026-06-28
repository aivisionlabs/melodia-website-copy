# Server Actions Implementation Guide

## 🎯 Overview

This guide covers the implementation of Server Actions in the Melodia Next.js application, which provides a more efficient and secure approach compared to traditional API routes.

## 🚀 Why Server Actions?

### **Benefits Over API Routes**

| Aspect | API Routes | Server Actions |
|--------|------------|----------------|
| **Performance** | HTTP overhead | Direct function calls |
| **Type Safety** | Manual typing | Automatic inference |
| **Error Handling** | Complex HTTP status | Simple try/catch |
| **Progressive Enhancement** | Requires JavaScript | Works without JS |
| **Bundle Size** | Larger client bundle | Smaller client bundle |
| **Security** | Manual validation | Built-in validation |

### **Architecture Comparison**

```
API Routes:
Client → HTTP Request → API Route → Database
         ↑              ↑
    Extra overhead   Manual handling

Server Actions:
Client → Direct Function Call → Database
         ↑
    No HTTP overhead
```

## 📁 Implementation Structure

### **Server Actions (`src/lib/actions.ts`)**

```typescript
'use server'

import { createServerSupabaseClient } from './supabase'
import { PublicSong } from '@/types'

export async function getSongs(
  search?: string,
  limit: number = 50,
  offset: number = 0,
  ip: string = 'unknown'
): Promise<{
  songs: PublicSong[]
  total: number
  hasMore: boolean
  error?: string
}> {
  // Implementation with rate limiting, validation, etc.
}
```

### **Key Features**

1. **Rate Limiting**: Built-in protection against abuse
2. **Input Validation**: Server-side validation for all parameters
3. **Error Handling**: Structured error responses
4. **Type Safety**: Full TypeScript support
5. **Security**: Database schema protection

## 🔧 Usage Examples

### **1. Server Components (Recommended)**

```typescript
// src/app/songs/page.tsx
async function SongsPageContent({ searchParams }: { searchParams: { search?: string } }) {
  const search = searchParams.search
  const result = await getSongs(search, 50, 0)

  if (result.error) {
    return <ErrorComponent error={result.error} />
  }

  return <SongsList songs={result.songs} />
}
```

### **2. Client Components with useTransition**

```typescript
// src/hooks/use-songs.ts
'use client'

import { useState, useEffect, useTransition } from 'react'
import { getSongs } from '@/lib/actions'

export const useSongs = (search?: string) => {
  const [songs, setSongs] = useState<PublicSong[]>([])
  const [isPending, startTransition] = useTransition()

  const fetchSongs = async () => {
    startTransition(async () => {
      const result = await getSongs(search, 50, 0)
      if (!result.error) {
        setSongs(result.songs)
      }
    })
  }

  return { songs, loading: isPending, refetch: fetchSongs }
}
```

### **3. Form Actions**

```typescript
// Example: Search form
'use client'

import { searchSongs } from '@/lib/actions'

export function SearchForm() {
  async function handleSearch(formData: FormData) {
    const query = formData.get('query') as string
    const result = await searchSongs(query)
    // Handle result
  }

  return (
    <form action={handleSearch}>
      <input name="query" placeholder="Search songs..." />
      <button type="submit">Search</button>
    </form>
  )
}
```

## 🛡️ Security Features

### **1. Rate Limiting**

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }

  userLimit.count++
  return true
}
```

### **2. Input Validation**

```typescript
function validateSongId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^\d+$/.test(id) // Only numeric IDs
}

function sanitizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().slice(0, 50) // Limit length
}
```

### **3. Field Filtering**

```typescript
// Only select public fields
const { data, error } = await supabase
  .from('songs')
  .select('id, title, lyrics, timestamp_lyrics, music_style, service_provider, song_url, duration')
  .eq('id', id)
  .single()
```

## 📊 Available Server Actions

### **1. getSongs()**
Retrieve a list of songs with pagination and search.

```typescript
const result = await getSongs(search, limit, offset, ip)
// Returns: { songs: PublicSong[], total: number, hasMore: boolean, error?: string }
```

### **2. getSong(id)**
Retrieve a specific song by ID.

```typescript
const result = await getSong(id, ip)
// Returns: { song: PublicSong | null, error?: string }
```

### **3. searchSongs(query)**
Search songs by title.

```typescript
const result = await searchSongs(query, ip)
// Returns: { songs: PublicSong[], error?: string }
```

### **4. getSongStats()**
Get song statistics.

```typescript
const result = await getSongStats()
// Returns: { totalSongs: number, totalDuration: number, popularStyles: string[], error?: string }
```

## 🔄 Migration from API Routes

### **Before (API Routes)**

```typescript
// Client
const response = await fetch('/api/songs')
const data = await response.json()

// Server
export async function GET(request: NextRequest) {
  // Complex HTTP handling
}
```

### **After (Server Actions)**

```typescript
// Client
const result = await getSongs()

// Server
export async function getSongs() {
  // Direct database access
}
```

## 🎨 Progressive Enhancement

Server Actions work even without JavaScript:

```typescript
// This form works without JS
<form action={searchSongs}>
  <input name="query" required />
  <button type="submit">Search</button>
</form>
```

## 🚀 Performance Benefits

### **1. Reduced Bundle Size**
- No need for fetch polyfills
- Smaller client-side code
- Better tree shaking

### **2. Faster Execution**
- No HTTP overhead
- Direct function calls
- Better caching

### **3. Better UX**
- Instant feedback with useTransition
- Optimistic updates
- Progressive enhancement

## 🔧 Best Practices

### **1. Error Handling**

```typescript
export async function getSongs() {
  try {
    // Implementation
    return { songs, total, hasMore }
  } catch (error) {
    console.error('Server action error:', error)
    return { songs: [], total: 0, hasMore: false, error: 'Internal server error' }
  }
}
```

### **2. Type Safety**

```typescript
// Always define return types
export async function getSong(id: string): Promise<{
  song: PublicSong | null
  error?: string
}> {
  // Implementation
}
```

### **3. Validation**

```typescript
// Validate inputs early
if (!validateSongId(id)) {
  return { song: null, error: 'Invalid song ID' }
}
```

### **4. Rate Limiting**

```typescript
// Always implement rate limiting for public actions
if (!checkRateLimit(ip)) {
  return { songs: [], error: 'Too many requests' }
}
```

## 🧪 Testing

### **Unit Testing Server Actions**

```typescript
import { getSongs } from '@/lib/actions'

describe('getSongs', () => {
  it('should return songs when valid parameters provided', async () => {
    const result = await getSongs('test', 10, 0, 'test-ip')
    expect(result.songs).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('should handle rate limiting', async () => {
    // Test rate limiting logic
  })
})
```

## 📈 Monitoring

### **1. Error Tracking**

```typescript
export async function getSongs() {
  try {
    // Implementation
  } catch (error) {
    // Log to monitoring service
    console.error('Server action error:', error)
    return { error: 'Internal server error' }
  }
}
```

### **2. Performance Monitoring**

```typescript
export async function getSongs() {
  const start = Date.now()
  try {
    const result = await // ... implementation
    const duration = Date.now() - start
    console.log(`getSongs took ${duration}ms`)
    return result
  } catch (error) {
    // Handle error
  }
}
```

## 🎯 Next Steps

1. **Add More Actions**: Create actions for user management, analytics, etc.
2. **Optimize Performance**: Implement caching strategies
3. **Add Real-time Features**: Integrate with Supabase real-time
4. **Enhance Security**: Add authentication and authorization
5. **Monitoring**: Set up comprehensive error tracking

## 📚 Resources

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [React useTransition Hook](https://react.dev/reference/react/useTransition)
- [Progressive Enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)