import React from 'react';
import { useApp } from '../context/AppContext';

export function UserDebug() {
  const { state } = useApp();

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-md mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">Debug - Usuarios Disponibles:</h3>
      <div className="space-y-2">
        {state.users.map(user => (
          <div key={user.id} className="text-sm">
            <strong>ID:</strong> {user.id} | 
            <strong>Username:</strong> {user.username} | 
            <strong>Password:</strong> {user.password} | 
            <strong>Role:</strong> {user.role} | 
            <strong>Active:</strong> {user.isActive ? 'Sí' : 'No'}
          </div>
        ))}
      </div>
    </div>
  );
}
