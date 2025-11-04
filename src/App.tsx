import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Reservations } from './components/Reservations';
import { Areas } from './components/Areas';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { UserManagement } from './components/UserManagement';
import { Availability } from './components/Availability';
import { UserProfile } from './components/UserProfile';
import { ColaboradorView } from './components/ColaboradorView';
import { CoworkingManagement } from './components/CoworkingManagement';
import { BlogManagement } from './components/BlogManagement';
import { ContactForm } from './components/ContactForm';
import { ErrorBoundary } from './components/ErrorBoundary';

// Componente para la página Home pública
function HomePage() {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <Home onLoginClick={() => navigate('/login')} onContactClick={() => setShowContact(true)} />
      {showContact && <ContactForm onClose={() => setShowContact(false)} />}
    </>
  );
}

// Componente para la página de Login
function LoginPage() {
  const navigate = useNavigate();
  const { state } = useApp();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (state.auth.isAuthenticated) {
      if (state.auth.currentUser?.role === 'colaborador') {
        navigate('/app/colaborador');
      } else {
        navigate('/app/reservations');
      }
    }
  }, [state.auth.isAuthenticated, state.auth.currentUser?.role, navigate]);

  return <Login onBackClick={() => navigate('/home')} />;
}

// Componente para rutas protegidas (requiere autenticación)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const location = useLocation();

  if (!state.auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Contenido principal de la aplicación autenticada
function AppContent() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState(() => {
    // Extraer la vista desde la ruta actual
    const path = location.pathname.split('/')[2] || 'reservations';
    return path;
  });

  // Sincronizar currentView con la ruta
  useEffect(() => {
    const path = location.pathname.split('/')[2] || 'reservations';
    setCurrentView(path);
  }, [location.pathname]);

  // Manejar cambio de vista desde el Header
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    navigate(`/app/${view}`);
  };

  // Manejar clic en horario desde la vista de disponibilidad
  const handleAvailabilityHourClick = (area: any, date: string, hour: string) => {
    console.log('🚀 Navegando desde disponibilidad a reservaciones:', { area: area.name, date, hour });

    // Cambiar a la vista de reservaciones
    navigate('/app/reservations');

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
    navigate('/app/reservations');

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
    navigate('/app/reservations');

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
      case 'coworking':
        return state.auth.currentUser?.role === 'superadmin' ? (
          <ErrorBoundary fallbackMessage="Error en Gestión de Coworking">
            <CoworkingManagement />
          </ErrorBoundary>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">Acceso restringido. Solo super administradores.</div>
          </div>
        );
      case 'blog':
        return state.auth.currentUser?.role === 'superadmin' ? (
          <ErrorBoundary fallbackMessage="Error en Gestión de Blog">
            <BlogManagement />
          </ErrorBoundary>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">Acceso restringido. Solo super administradores.</div>
          </div>
        );
      default:
        if (state.auth.currentUser?.role === 'colaborador') return <ColaboradorView />;
        return <Availability onHourClick={handleAvailabilityHourClick} onNewReservation={handleNewReservationClick} onAreaClick={handleAreaClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Ruta raíz redirige a /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Ruta pública para Home */}
          <Route path="/home" element={<HomePage />} />

          {/* Ruta pública para Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas de la aplicación */}
          <Route path="/app/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />

          {/* Ruta por defecto: redirigir a /home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
