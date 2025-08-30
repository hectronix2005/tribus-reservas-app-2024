import React from 'react';

interface TribusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function TribusLogo({ size = 'md', showText = true, className = '' }: TribusLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-2xl overflow-hidden shadow-glow`}>
        <img 
          src="/images/tribus-logo.svg" 
          alt="Tribus Logo" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback si la imagen no carga
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className={`w-full h-full bg-gradient-primary flex items-center justify-center hidden`}>
          <span className="text-white font-bold text-xl">T</span>
        </div>
      </div>
      {showText && (
        <div>
          <h1 className={`font-bold text-gradient-primary ${textSizes[size]}`}>TRIBUS</h1>
          {size === 'lg' || size === 'xl' ? (
            <p className="text-xs text-slate-500 font-medium">Sistema de Reservas</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
