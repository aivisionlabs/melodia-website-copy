import React from 'react'
import { CheckCircle, Clock, XCircle, AlertCircle, Music } from 'lucide-react'

interface SongStatusIndicatorProps {
  status: 'loading' | 'ready' | 'processing' | 'failed' | 'pending'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function SongStatusIndicator({ 
  status, 
  size = 'md', 
  showText = true,
  className = '' 
}: SongStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'ready':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          text: 'Ready to Play',
          textColor: 'text-green-700'
        }
      case 'processing':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          text: 'Generating Song',
          textColor: 'text-yellow-700'
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          text: 'Generation Failed',
          textColor: 'text-red-700'
        }
      case 'pending':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          text: 'Waiting to Start',
          textColor: 'text-yellow-700'
        }
      case 'loading':
        return {
          icon: Music,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Loading...',
          textColor: 'text-gray-700'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Unknown Status',
          textColor: 'text-gray-700'
        }
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center justify-center ${config.bgColor} rounded-full p-1`}>
        <IconComponent className={`${config.color} ${sizeClasses[size]}`} />
      </div>
      {showText && (
        <span className={`${config.textColor} ${textSizeClasses[size]} font-medium`}>
          {config.text}
        </span>
      )}
    </div>
  )
}
