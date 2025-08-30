import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Reservations } from './components/Reservations';
import { Areas } from './components/Areas';
import { Admin } from './components/Admin';
import { Templates } from './components/Templates';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Availability } from './components/Availability';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState(() => {
    // Si es admin, mostrar dashboard; si es usuario regular, mostrar disponibilidad
    return state.auth.currentUser?.role === 'admin' ? 'dashboard' : 'availability';
  });

  // Actualizar la vista cuando cambie el usuario autenticado
  useEffect(() => {
    if (state.auth.isAuthenticated) {
      const defaultView = state.auth.currentUser?.role === 'admin' ? 'dashboard' : 'availability';
      setCurrentView(defaultView);
    }
  }, [state.auth.currentUser?.role, state.auth.isAuthenticated]);

  // Manejar clic en horario desde la vista de disponibilidad
  const handleAvailabilityHourClick = (area: any, date: string, hour: string) => {
    console.log('🚀 Navegando desde disponibilidad a reservaciones:', { area: area.name, date, hour });
    
    // Cambiar a la vista de reservaciones
    setCurrentView('reservations');
    
    // Usar setTimeout para asegurar que la navegación se complete antes de disparar el evento
    setTimeout(() => {
      // Emitir un evento personalizado para que Reservations.tsx pueda escucharlo
      const event = new CustomEvent('availabilityHourClick', {
        detail: { area, date, hour }
      });
      window.dispatchEvent(event);
      
      console.log('📡 Evento availabilityHourClick disparado');
    }, 200);
  };

  // Si no está autenticado, mostrar login
  if (!state.auth.isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return state.auth.currentUser?.role === 'admin' ? <Dashboard /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo administradores.</div>
        </div>;
      case 'reservations':
        return <Reservations />;
      case 'availability':
        return <Availability onHourClick={handleAvailabilityHourClick} />;
      case 'areas':
        return state.auth.currentUser?.role === 'admin' ? <Areas /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo administradores.</div>
        </div>;
      case 'templates':
        return state.auth.currentUser?.role === 'admin' ? <Templates /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo administradores.</div>
        </div>;
      case 'users':
        return state.auth.currentUser?.role === 'admin' ? <UserManagement /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo administradores.</div>
        </div>;
      case 'admin':
        return state.auth.currentUser?.role === 'admin' ? <Admin /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo administradores.</div>
        </div>;
      default:
        return state.auth.currentUser?.role === 'admin' ? <Dashboard /> : <Availability onHourClick={handleAvailabilityHourClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
