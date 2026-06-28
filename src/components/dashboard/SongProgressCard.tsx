import React from 'react'
import { SongProgressBar } from '@/components/song/SongProgressBar'
import { SongStatusIndicator } from '@/components/song/SongStatusIndicator'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface SongProgressCardProps {
  songId: number
  title: string
  estimatedCompletion?: Date
  onRefresh?: () => void
  className?: string
}

export function SongProgressCard({ 
  title, 
  estimatedCompletion, 
  onRefresh,
  className = '' 
}: SongProgressCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <SongStatusIndicator status="processing" size="sm" showText={false} />
          <h3 className="font-medium text-gray-900 text-sm truncate">
            {title}
          </h3>
        </div>
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <SongProgressBar 
        estimatedCompletion={estimatedCompletion}
        onRefresh={onRefresh}
      />
    </div>
  )
}
