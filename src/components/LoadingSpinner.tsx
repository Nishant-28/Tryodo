import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  timeout?: number;
  showRetry?: boolean;
  onTimeout?: () => void;
  showProgress?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  size = 'md',
  fullScreen = false,
  timeout,
  showRetry = false,
  onTimeout,
  showProgress = false
}) => {
  const [timeLeft, setTimeLeft] = useState(timeout ? Math.floor(timeout / 1000) : 0);
  const [progress, setProgress] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  useEffect(() => {
    if (timeout) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, timeout - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        
        setTimeLeft(remainingSeconds);
        
        if (showProgress) {
          setProgress((elapsed / timeout) * 100);
        }
        
        if (remaining <= 0) {
          clearInterval(interval);
          if (onTimeout) {
            onTimeout();
          }
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [timeout, onTimeout, showProgress]);

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        {showProgress && timeout && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs font-mono text-blue-600">
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-gray-600 text-sm">{text}</p>
        
        {timeout && timeLeft > 0 && (
          <p className="text-xs text-gray-400">
            {timeLeft}s remaining
          </p>
        )}
        
        {showRetry && timeout && timeLeft <= 0 && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg border">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};

export default LoadingSpinner; 