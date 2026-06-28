import React from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SongErrorDisplayProps {
  error: string
  onRetry?: () => void
  showHomeButton?: boolean
  showBackButton?: boolean
  className?: string
}

export function SongErrorDisplay({ 
  error, 
  onRetry,
  showHomeButton = true,
  showBackButton = true,
  className = '' 
}: SongErrorDisplayProps) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Oops! Something went wrong
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 text-center mb-6">
          {error}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          )}

          {showHomeButton && (
            <Link
              href="/"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </Link>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            If this problem persists, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  )
}
