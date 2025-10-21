import { Spinner } from '@nextui-org/react';

const Loader = ({ 
  size = 'lg', 
  label = 'Loading...', 
  color = 'primary',
  fullScreen = false,
  className = '' 
}) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={size} color={color} />
          {label && (
            <p className="text-default-500 text-sm font-medium">{label}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <Spinner size={size} color={color} />
      {label && (
        <p className="text-default-500 text-sm font-medium">{label}</p>
      )}
    </div>
  );
};

// Page-level loader
export const PageLoader = ({ label = 'Loading page...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader size="lg" label={label} />
    </div>
  );
};

// Card-level loader
export const CardLoader = ({ label = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader size="md" label={label} />
    </div>
  );
};

// Inline loader (small)
export const InlineLoader = ({ label }) => {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" color="primary" />
      {label && <span className="text-xs text-default-500">{label}</span>}
    </div>
  );
};

// Processing loader with animation
export const ProcessingLoader = ({ 
  stage = 'Processing', 
  progress 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 bg-content1 rounded-lg shadow-lg max-w-md w-full mx-4">
        <Spinner size="lg" color="primary" />
        
        <div className="text-center space-y-2 w-full">
          <h3 className="text-xl font-semibold">{stage}</h3>
          <p className="text-sm text-default-500">
            Please wait while we process your meeting...
          </p>
          
          {progress !== undefined && (
            <div className="mt-4">
              <div className="w-full bg-default-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-default-500 mt-2">{progress}%</p>
            </div>
          )}
        </div>

        <p className="text-xs text-default-400 text-center">
          This may take a few moments. Don't close this window.
        </p>
      </div>
    </div>
  );
};

// Skeleton loader for list items
export const SkeletonLoader = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="p-4 border border-divider rounded-lg animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-default-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-default-200 rounded w-3/4" />
              <div className="h-3 bg-default-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Loader;