import { Input, Button } from '@heroui/react';
import { FiSearch, FiX } from 'react-icons/fi';
import { useState, useEffect } from 'react';

const SearchBar = ({ 
  value = '', 
  onChange, 
  placeholder = 'Search meetings...', 
  debounceMs = 300,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  const handleClear = () => {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
  };

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      startContent={<FiSearch className="text-default-400" size={20} />}
      endContent={
        localValue && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={handleClear}
            aria-label="Clear search"
          >
            <FiX size={18} />
          </Button>
        )
      }
      classNames={{
        base: className,
        input: "text-sm",
        inputWrapper: "h-12 bg-default-100 data-[hover=true]:bg-default-200"
      }}
      isClearable={false}
      size="lg"
    />
  );
};

// Compact search bar
export const CompactSearchBar = ({ value, onChange, placeholder }) => {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      startContent={<FiSearch className="text-default-400" size={16} />}
      classNames={{
        input: "text-sm",
        inputWrapper: "h-10"
      }}
      size="sm"
    />
  );
};

// Search bar with suggestions
export const SearchBarWithSuggestions = ({ 
  value, 
  onChange, 
  suggestions = [],
  onSuggestionClick 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setShowSuggestions(newValue.length > 0);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setLocalValue(suggestion);
    setShowSuggestions(false);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
    if (onChange) {
      onChange(suggestion);
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(localValue.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        value={localValue}
        onChange={handleInputChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onFocus={() => localValue && setShowSuggestions(true)}
        placeholder="Search meetings..."
        startContent={<FiSearch className="text-default-400" size={20} />}
        classNames={{
          input: "text-sm",
          inputWrapper: "h-12 bg-default-100"
        }}
        size="lg"
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-content1 border border-divider rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-default-100 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <FiSearch size={14} className="text-default-400" />
                <span>{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;