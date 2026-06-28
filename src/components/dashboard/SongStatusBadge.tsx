import React from 'react'
import { SongStatusIndicator } from '@/components/song/SongStatusIndicator'

interface SongStatusBadgeProps {
  status: 'loading' | 'ready' | 'processing' | 'failed' | 'pending'
  className?: string
}

export function SongStatusBadge({ status, className = '' }: SongStatusBadgeProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <SongStatusIndicator 
        status={status} 
        size="sm" 
        showText={false}
      />
      <span className="ml-1 text-xs font-medium">
        {status === 'ready' && 'Ready'}
        {status === 'processing' && 'Processing'}
        {status === 'failed' && 'Failed'}
        {status === 'pending' && 'Pending'}
        {status === 'loading' && 'Loading'}
      </span>
    </div>
  )
}
