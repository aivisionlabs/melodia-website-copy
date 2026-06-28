/**
 * useAnonymousUser Hook
 * Manages anonymous user sessions
 */

'use client';

import { useState, useEffect } from 'react';

export function useAnonymousUser() {
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function getOrCreateAnonymousUser() {
      try {
        setIsLoading(true);

        const response = await fetch('/api/users/anonymous');

        if (!response.ok) {
          throw new Error('Failed to get anonymous user');
        }

        const data = await response.json();

        if (isMounted) {
          setAnonymousUserId(data.anonymousUserId);
          setError(null);
        }
      } catch (err) {
        console.error('Anonymous user error:', err);
        if (isMounted) {
          setError('Failed to create session');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getOrCreateAnonymousUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    anonymousUserId,
    isLoading,
    error,
  };
}

