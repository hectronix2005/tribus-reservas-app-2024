import React, { useState, useEffect, useRef } from 'react';
import { Building2, Users, Settings, Calendar, Home, FileText, LogOut, User, Eye, ChevronDown, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { state, logout } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
  };

  // Cerrar menú de administración cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };

    if (isAdminMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminMenuOpen]);

  const navigationItems = [
    ...(state.auth.currentUser?.role === 'admin' ? [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
    ] : []),
    { id: 'reservations', label: 'Reservas', icon: Calendar },
    { id: 'availability', label: 'Disponibilidad', icon: Eye },
  ];

  const userItems = [
    { id: 'profile', label: 'Mi Perfil', icon: UserCheck },
    { id: 'userTemplates', label: 'Mis Plantillas', icon: FileText },
  ];

  const adminItems = [
    { id: 'admin', label: 'Administración', icon: Settings },
    { id: 'areas', label: 'Áreas', icon: Building2 },
    { id: 'templates', label: 'Plantillas', icon: FileText },
    { id: 'users', label: 'Usuarios', icon: Users },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <img 
                    src="/images/tribus-logo.svg" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center hidden">
                    <span className="text-white font-bold text-lg">T</span>
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Reservas</h1>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentView === item.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {/* Admin Dropdown Menu */}
            {state.auth.currentUser?.role === 'admin' && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    ['admin', 'areas', 'templates', 'users'].includes(currentView)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Administración</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isAdminMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {adminItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id}>
                          <button
                            onClick={() => {
                              onViewChange(item.id);
                              setIsAdminMenuOpen(false);
                            }}
                            className={`flex items-center space-x-3 w-full px-4 py-2 text-sm text-left transition-colors duration-200 ${
                              currentView === item.id
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                          {index === 0 && (
                            <div className="border-t border-gray-200 mx-2"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* User Menu for Regular Users */}
            {state.auth.currentUser?.role === 'user' && (
              <>
                {userItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                        currentView === item.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <User className="w-4 h-4" />
              <span>{state.auth.currentUser?.name}</span>
              <span className={`badge ${state.auth.currentUser?.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                {state.auth.currentUser?.role === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      currentView === item.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              {/* Admin Menu for Mobile */}
              {state.auth.currentUser?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                      Administración
                    </div>
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                            currentView === item.id
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* User Menu for Mobile */}
              {state.auth.currentUser?.role === 'user' && (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                      Mi Cuenta
                    </div>
                    {userItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                            currentView === item.id
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
