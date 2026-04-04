import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LuSearch as Search, LuX as X } from 'react-icons/lu';

const SearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search meetings...',
  debounceMs = 300,
  className = '',
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) onChange(localValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  const handleClear = () => {
    setLocalValue('');
    if (onChange) onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="input-echo w-full py-2.5 !pl-12 !pr-10 text-sm"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  debounceMs: PropTypes.number,
  className: PropTypes.string,
};

// Compact search bar
export const CompactSearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      className="input-echo w-full !py-2 !pl-10 !pr-3 text-xs"
    />
  </div>
);

CompactSearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

export default SearchBar;
