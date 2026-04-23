import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  isValid
} from 'date-fns';
import { LuCalendar, LuChevronLeft, LuChevronRight } from 'react-icons/lu';

const EtherealDatePicker = ({ value, onChange, placeholder = "Select date..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [placement, setPlacement] = useState('bottom');

  const selectedDate = value ? (typeof value === 'string' ? parseISO(value) : value) : null;
  const displayValue = selectedDate && isValid(selectedDate) ? format(selectedDate, 'MMM dd, yyyy') : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const shouldFlip = spaceBelow < 400 && spaceAbove > spaceBelow;

      setPlacement(shouldFlip ? 'top' : 'bottom');
      setCoords({
        top: shouldFlip 
          ? rect.top + window.scrollY - 8 
          : rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const togglePicker = () => {
    if (!isOpen) {
      updateCoords();
      if (selectedDate && isValid(selectedDate)) {
        setCurrentMonth(selectedDate);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };


  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const pickerContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[200] w-[320px]"
          style={{ 
            top: coords.top, 
            left: Math.min(Math.max(20, coords.left), window.innerWidth - 340),
            transform: placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: placement === 'bottom' ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'bottom' ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full overflow-hidden rounded-xl bg-[#0c1324]/90 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08] backdrop-blur-2xl max-h-[calc(100vh-60px)] overflow-y-auto scrollbar-hide"
          >
            {/* Header */}
          <div className="mb-4 flex items-center justify-between px-1">
            <h3 className="font-['Plus_Jakarta_Sans'] text-[15px] font-bold text-[#f8fafc]">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-[#f8fafc]"
              >
                <LuChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-lg p-1.5 text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-[#f8fafc]"
              >
                <LuChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="mb-2 grid grid-cols-7">
            {weekDays.map((day) => (
              <div 
                key={day} 
                className="text-center font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-tighter text-[#64748b]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => handleDateSelect(day)}
                  className={`group relative flex aspect-square items-center justify-center rounded-lg font-['JetBrains_Mono'] text-xs transition-all duration-200
                    ${!isCurrentMonth ? 'text-[#334155] hover:text-[#475569]' : 'text-[#94a3b8] hover:text-[#f8fafc]'}
                    ${isSelected ? 'text-[#f8fafc] !text-white' : ''}
                    hover:bg-white/5
                  `}
                >
                  {/* Selection Glow */}
                  {isSelected && (
                    <motion.div 
                      layoutId="selectedDay"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#bdc2ff]/20 to-[#818cf8]/20 ring-1 ring-[#818cf8]/50 shadow-[0_0_15px_rgba(129,140,248,0.3)]"
                    />
                  )}
                  
                  {/* Today Indicator */}
                  {isTodayDate && !isSelected && (
                    <div className="absolute bottom-1.5 size-1 rounded-full bg-[#818cf8]/50" />
                  )}

                  <span className="relative z-10">{format(day, 'd')}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={togglePicker}
        className={`flex h-12 w-full items-center justify-between rounded-input bg-[#151b2d] px-4 font-['JetBrains_Mono'] text-[13px] ring-1 transition-all hover:ring-white/[0.12] focus:outline-none
          ${isOpen ? 'ring-[#818cf8]/50 bg-[#1e253c]' : 'ring-white/[0.06]'}
          ${displayValue ? 'text-[#f8fafc]' : 'text-[#64748b]'}
        `}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <LuCalendar size={16} className={`shrink-0 transition-colors ${isOpen ? 'text-[#818cf8]' : 'text-[#64748b]'}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(pickerContent, document.body)}
    </div>
  );
};

export default EtherealDatePicker;
