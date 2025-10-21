import { Chip } from '@heroui/react';
import { 
  FiDollarSign, 
  FiCalendar, 
  FiUsers, 
  FiMessageCircle, 
  FiGrid 
} from 'react-icons/fi';

const CATEGORIES = [
  { value: 'ALL', label: 'All Meetings', icon: FiGrid, color: 'default' },
  { value: 'SALES', label: 'Sales', icon: FiDollarSign, color: 'success' },
  { value: 'PLANNING', label: 'Planning', icon: FiCalendar, color: 'primary' },
  { value: 'STANDUP', label: 'Stand-up', icon: FiUsers, color: 'secondary' },
  { value: 'ONE_ON_ONE', label: 'One-on-One', icon: FiMessageCircle, color: 'warning' },
  { value: 'OTHER', label: 'Other', icon: FiGrid, color: 'default' },
];

const CategoryFilter = ({ 
  selectedCategory = 'ALL', 
  onCategoryChange,
  showCount = false,
  counts = {}
}) => {
  const handleCategoryClick = (value) => {
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.value;
        const count = counts[category.value] || 0;

        return (
          <Chip
            key={category.value}
            color={isSelected ? category.color : 'default'}
            variant={isSelected ? 'solid' : 'flat'}
            startContent={<Icon size={16} />}
            onPress={() => handleCategoryClick(category.value)}
            className="cursor-pointer transition-all hover:scale-105"
            size="md"
          >
            {category.label}
            {showCount && category.value !== 'ALL' && (
              <span className="ml-1.5 text-xs opacity-80">
                ({count})
              </span>
            )}
          </Chip>
        );
      })}
    </div>
  );
};

// Compact version for mobile
export const CompactCategoryFilter = ({ 
  selectedCategory = 'ALL', 
  onCategoryChange 
}) => {
  const handleChange = (e) => {
    if (onCategoryChange) {
      onCategoryChange(e.target.value);
    }
  };

  return (
    <select
      value={selectedCategory}
      onChange={handleChange}
      className="w-full px-4 py-2 rounded-lg border border-divider bg-content1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {CATEGORIES.map((category) => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
    </select>
  );
};

// Badge component for displaying category
export const CategoryBadge = ({ category, size = 'md' }) => {
  const categoryData = CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = categoryData.icon;

  return (
    <Chip
      color={categoryData.color}
      variant="flat"
      startContent={<Icon size={14} />}
      size={size}
    >
      {categoryData.label}
    </Chip>
  );
};

// Get category data by value
export const getCategoryData = (value) => {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
};

export default CategoryFilter;