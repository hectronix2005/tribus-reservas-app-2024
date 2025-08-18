import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Reservations } from './components/Reservations';
import { Areas } from './components/Areas';
import { Admin } from './components/Admin';
import { Templates } from './components/Templates';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');

  // Si no está autenticado, mostrar login
  if (!state.auth.isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'reservations':
        return <Reservations />;
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
        return <Dashboard />;
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
