import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Reservations } from './components/Reservations';
import { Areas } from './components/Areas';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Availability } from './components/Availability';
import { UserProfile } from './components/UserProfile';
import { ColaboradorView } from './components/ColaboradorView';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState(() => {
    // Todos los usuarios (incluyendo admin) ven reservas por defecto; solo colaboradores ven su vista específica
    if (state.auth.currentUser?.role === 'colaborador') return 'colaborador';
    return 'reservations';
  });

  // Actualizar la vista cuando cambie el usuario autenticado
  useEffect(() => {
    if (state.auth.isAuthenticated) {
      let defaultView = 'reservations';
      if (state.auth.currentUser?.role === 'colaborador') defaultView = 'colaborador';
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

  // Manejar clic en "Nueva Reserva" desde la vista de disponibilidad
  const handleNewReservationClick = () => {
    console.log('🚀 Navegando desde disponibilidad a nueva reservación');
    
    // Cambiar a la vista de reservaciones
    setCurrentView('reservations');
    
    // Usar setTimeout para asegurar que la navegación se complete antes de disparar el evento
    setTimeout(() => {
      // Emitir un evento personalizado para que Reservations.tsx pueda abrir el formulario
      const event = new CustomEvent('newReservationClick');
      window.dispatchEvent(event);
      
      console.log('📡 Evento newReservationClick disparado');
    }, 200);
  };

  // Manejar clic en área desde la vista de disponibilidad
  const handleAreaClick = (area: any, date: string) => {
    console.log('🚀 Navegando desde disponibilidad a nueva reserva con área preseleccionada:', { area: area.name, date });
    
    // Cambiar a la vista de reservaciones
    setCurrentView('reservations');
    
    // Usar setTimeout para asegurar que la navegación se complete antes de disparar el evento
    setTimeout(() => {
      // Emitir un evento personalizado para que Reservations.tsx pueda escucharlo
      const event = new CustomEvent('areaClick', {
        detail: { area, date }
      });
      window.dispatchEvent(event);
      
      console.log('📡 Evento areaClick disparado');
    }, 200);
  };

  // Si no está autenticado, mostrar login
  if (!state.auth.isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'reservations':
        return <Reservations />;
      case 'availability':
        return <Availability onHourClick={handleAvailabilityHourClick} onNewReservation={handleNewReservationClick} onAreaClick={handleAreaClick} />;
      case 'areas':
        return state.auth.currentUser?.role === 'admin' ? <Areas /> : <div className="text-center py-12">
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
      case 'profile':
        return <UserProfile />;
      case 'colaborador':
        return state.auth.currentUser?.role === 'colaborador' ? <ColaboradorView /> : <div className="text-center py-12">
          <div className="text-gray-500">Acceso restringido. Solo colaboradores.</div>
        </div>;
      default:
        if (state.auth.currentUser?.role === 'colaborador') return <ColaboradorView />;
        return <Availability onHourClick={handleAvailabilityHourClick} onNewReservation={handleNewReservationClick} onAreaClick={handleAreaClick} />;
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
