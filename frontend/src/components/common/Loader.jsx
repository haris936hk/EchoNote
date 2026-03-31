const Loader = ({ size = 'lg', label = 'Loading...', fullScreen = false, className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';

  const spinner = (
    <div
      className={`${sizeClass} border-accent-primary animate-spin rounded-full border-2 border-t-transparent`}
    ></div>
  );

  if (fullScreen) {
    return (
      <div className="bg-echo-base/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          {label && <p className="text-sm text-slate-400">{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {spinner}
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
};

// Page-level loader
export const PageLoader = ({ label = 'Loading page...' }) => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader size="lg" label={label} />
  </div>
);

// Card-level loader
export const CardLoader = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <Loader size="md" label={label} />
  </div>
);

// Inline loader
export const InlineLoader = ({ label }) => (
  <div className="flex items-center gap-2">
    <div className="border-accent-primary size-4 animate-spin rounded-full border-2 border-t-transparent"></div>
    {label && <span className="text-xs text-slate-500">{label}</span>}
  </div>
);

// Skeleton loader for list items
export const SkeletonLoader = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="bg-echo-surface border-echo-border animate-pulse rounded-[16px] border p-5"
      >
        <div className="flex items-start gap-4">
          <div className="bg-echo-surface-hover size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="bg-echo-surface-hover h-4 w-3/4 rounded" />
            <div className="bg-echo-surface-hover h-3 w-1/2 rounded" />
          </div>
        </div>
      </div>
    ))}
  </>
);

export default Loader;
