import PropTypes from 'prop-types';

const Loader = ({ size = 'lg', label = 'Loading...', fullScreen = false, className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';

  const spinner = (
    <div
      className={`${sizeClass} animate-spin rounded-full border-2 border-accent-primary border-t-transparent`}
    ></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-echo-base/80 backdrop-blur-sm">
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

Loader.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  label: PropTypes.string,
  fullScreen: PropTypes.bool,
  className: PropTypes.string,
};

// Page-level loader
export const PageLoader = ({ label = 'Loading page...' }) => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader size="lg" label={label} />
  </div>
);

PageLoader.propTypes = {
  label: PropTypes.string,
};

// Card-level loader
export const CardLoader = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <Loader size="md" label={label} />
  </div>
);

CardLoader.propTypes = {
  label: PropTypes.string,
};

// Inline loader
export const InlineLoader = ({ label }) => (
  <div className="flex items-center gap-2">
    <div className="size-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent"></div>
    {label && <span className="text-xs text-slate-500">{label}</span>}
  </div>
);

InlineLoader.propTypes = {
  label: PropTypes.string,
};


export const SkeletonLoader = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse rounded-card border border-echo-border bg-echo-surface p-5"
      >
        <div className="flex items-start gap-4">
          <div className="size-10 rounded-lg bg-echo-surface-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-echo-surface-hover" />
            <div className="h-3 w-1/2 rounded bg-echo-surface-hover" />
          </div>
        </div>
      </div>
    ))}
  </>
);

SkeletonLoader.propTypes = {
  count: PropTypes.number,
};

export default Loader;
