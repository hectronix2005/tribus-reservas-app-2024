import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  placeholder = "Seleccionar fecha",
  className = "",
  error = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatear fecha para mostrar
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonth = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevMonth,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      // Usar formato YYYY-MM-DD directamente para evitar problemas de zona horaria
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const isToday = dateString === todayString;
      const isSelected = dateString === value;
      const isDisabled = isDateDisabled(dateString);

      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled
      });
    }

    // Completar con días del siguiente mes
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = new Date(year, month + 1, day);
      days.push({
        date: nextMonth,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true
      });
    }

    return days;
  };

  // Verificar si una fecha está deshabilitada
  const isDateDisabled = (dateString: string) => {
    // Verificar fecha mínima
    if (minDate && dateString < minDate) return true;
    
    // Verificar fecha máxima
    if (maxDate && dateString > maxDate) return true;
    
    // Verificar fechas deshabilitadas
    if (disabledDates.includes(dateString)) return true;
    
    return false;
  };

  // Manejar selección de fecha
  const handleDateSelect = (date: Date) => {
    // Usar formato YYYY-MM-DD directamente para evitar problemas de zona horaria
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    if (!isDateDisabled(dateString)) {
      onChange(dateString);
      setIsOpen(false);
    }
  };

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Nombres de los días de la semana
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Nombres de los meses
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
          error 
            ? 'border-red-500 bg-red-50 text-red-900' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className={`w-5 h-5 ${error ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {formatDisplayDate(value)}
            </span>
          </div>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header del calendario */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDateSelect(day.date)}
                disabled={day.isDisabled}
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${day.isToday ? 'bg-primary-100 text-primary-700 font-semibold' : ''}
                  ${day.isSelected ? 'bg-primary-600 text-white font-semibold' : ''}
                  ${day.isDisabled 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'hover:bg-gray-100 cursor-pointer'
                  }
                  ${!day.isCurrentMonth ? 'cursor-not-allowed' : ''}
                `}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          {/* Footer con fecha actual */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayString = `${year}-${month}-${day}`;
                if (!isDateDisabled(todayString)) {
                  onChange(todayString);
                  setIsOpen(false);
                }
              }}
              className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Seleccionar hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
