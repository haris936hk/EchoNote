import PropTypes from 'prop-types';
import { categoryColors } from '../../styles/theme';

const CATEGORIES = [
  { value: 'ALL', label: 'All' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'STANDUP', label: 'Stand-up' },
  { value: 'ONE_ON_ONE', label: '1-on-1' },
  { value: 'OTHER', label: 'Other' },
];

const CategoryFilter = ({
  selectedCategory = 'ALL',
  onCategoryChange,
  showCount = false,
  counts = {},
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.value;
        const count =
          category.value === 'ALL'
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : counts[category.value] || 0;

        return (
          <button
            key={category.value}
            onClick={() => onCategoryChange?.(category.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isSelected
                ? 'border border-accent-primary/30 bg-accent-primary/15 text-accent-primary'
                : 'border border-echo-border text-slate-400 hover:border-accent-primary/20 hover:text-white'
            }`}
          >
            {category.label}
            {showCount && (
              <span
                className={`ml-1 font-mono ${isSelected ? 'text-accent-primary/60' : 'text-slate-600'}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

CategoryFilter.propTypes = {
  selectedCategory: PropTypes.string,
  onCategoryChange: PropTypes.func,
  showCount: PropTypes.bool,
  counts: PropTypes.object,
};

export const CategoryBadge = ({ category }) => {
  const catColors = categoryColors[category] || categoryColors.OTHER;
  const categoryData =
    CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColors.chip}`}
    >
      {categoryData.label}
    </span>
  );
};

CategoryBadge.propTypes = {
  category: PropTypes.string.isRequired,
};

export const getCategoryData = (value) => {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
};

export default CategoryFilter;
