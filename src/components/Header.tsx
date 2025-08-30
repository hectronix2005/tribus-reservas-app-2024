import React, { useState, useEffect, useRef } from 'react';
import { Building2, Users, Settings, Calendar, Home, FileText, LogOut, User, Eye, ChevronDown, UserCheck, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TribusLogo } from './TribusLogo';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { state, logout } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isUserConfigMenuOpen, setIsUserConfigMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const userConfigMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
  };

  // Cerrar menús cuando se hace clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
      if (userConfigMenuRef.current && !userConfigMenuRef.current.contains(event.target as Node)) {
        setIsUserConfigMenuOpen(false);
      }
    };

    if (isAdminMenuOpen || isUserConfigMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminMenuOpen, isUserConfigMenuOpen]);

  const navigationItems = [
    ...(state.auth.currentUser?.role === 'admin' ? [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
    ] : []),
    { id: 'reservations', label: 'Reservas', icon: Calendar },
    { id: 'availability', label: 'Disponibilidad', icon: Eye },
  ];

  const userConfigItems = [
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
    <header className="bg-white/80 backdrop-blur-md shadow-soft border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TribusLogo size="md" showText={true} />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''} group relative`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'animate-bounce-soft' : ''}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                  )}
                </button>
              );
            })}
            
            {/* Admin Dropdown Menu */}
            {state.auth.currentUser?.role === 'admin' && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className={`nav-link ${['admin', 'areas', 'templates', 'users'].includes(currentView) ? 'nav-link-active' : ''} group`}
                >
                  <Settings className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
                  <span>Administración</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isAdminMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-large border border-white/20 animate-fade-in-down">
                    <div className="p-2">
                      {adminItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onViewChange(item.id);
                              setIsAdminMenuOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-50 group ${
                              isActive ? 'bg-primary-50 text-primary-700 shadow-soft' : 'text-slate-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                            <span>{item.label}</span>
                            {isActive && (
                              <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Configuration Dropdown Menu */}
            {state.auth.currentUser?.role === 'user' && (
              <div className="relative" ref={userConfigMenuRef}>
                <button
                  onClick={() => setIsUserConfigMenuOpen(!isUserConfigMenuOpen)}
                  className={`nav-link ${['profile', 'userTemplates'].includes(currentView) ? 'nav-link-active' : ''} group`}
                >
                  <Settings className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
                  <span>Configuración</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isUserConfigMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isUserConfigMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-large border border-white/20 animate-fade-in-down">
                    <div className="p-2">
                      {userConfigItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onViewChange(item.id);
                              setIsUserConfigMenuOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-slate-50 group ${
                              isActive ? 'bg-primary-50 text-primary-700 shadow-soft' : 'text-slate-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                            <span>{item.label}</span>
                            {isActive && (
                              <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-soft border border-white/20">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">{state.auth.currentUser?.name}</span>
                  <span className={`text-xs font-medium ${
                    state.auth.currentUser?.role === 'admin' 
                      ? 'text-warning-600' 
                      : 'text-primary-600'
                  }`}>
                    {state.auth.currentUser?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 hover:scale-105 focus-ring"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all duration-200 hover:scale-105 focus-ring"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-6 border-t border-white/20 animate-fade-in-down">
            <div className="space-y-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive 
                        ? 'bg-gradient-primary text-white shadow-glow' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'animate-bounce-soft' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              {/* Admin Menu for Mobile */}
              {state.auth.currentUser?.role === 'admin' && (
                <>
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2">
                      Administración
                    </div>
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                            isActive 
                              ? 'bg-gradient-primary text-white shadow-glow' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'animate-bounce-soft' : ''}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* User Configuration Menu for Mobile */}
              {state.auth.currentUser?.role === 'user' && (
                <>
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2">
                      Configuración
                    </div>
                    {userConfigItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                            isActive 
                              ? 'bg-gradient-primary text-white shadow-glow' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'animate-bounce-soft' : ''}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Mobile User Info and Logout */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">{state.auth.currentUser?.name}</div>
                    <div className={`text-xs font-medium ${
                      state.auth.currentUser?.role === 'admin' 
                        ? 'text-warning-600' 
                        : 'text-primary-600'
                    }`}>
                      {state.auth.currentUser?.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 mt-3 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
