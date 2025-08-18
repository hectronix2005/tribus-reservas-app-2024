import React from 'react';
import { Calendar, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInBogota } from '../utils/dateUtils';

export function Dashboard() {
  const { state, getDailyCapacity } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const dailyCapacity = getDailyCapacity(today);

  const totalCapacity = state.areas.reduce((sum, area) => sum + area.capacity, 0);
  const totalReserved = dailyCapacity.reduce((sum, area) => sum + area.reservedSeats, 0);
  const totalAvailable = totalCapacity - totalReserved;
  const utilizationRate = totalCapacity > 0 ? (totalReserved / totalCapacity) * 100 : 0;

  const recentReservations = state.reservations
    .filter(reservation => reservation.status === 'confirmed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusColor = (utilization: number) => {
    if (utilization >= 90) return 'text-danger-600';
    if (utilization >= 70) return 'text-warning-600';
    return 'text-success-600';
  };

  const getStatusIcon = (utilization: number) => {
    if (utilization >= 90) return <AlertCircle className="w-5 h-5" />;
    if (utilization >= 70) return <Clock className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Resumen de reservas para {formatDateInBogota(today, 'EEEE, d \'de\' MMMM')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Última actualización</p>
          <p className="text-sm font-medium text-gray-900">
            {formatDateInBogota(new Date(), 'HH:mm')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Capacidad Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalCapacity}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-success-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Reservado Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{totalReserved}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disponible</p>
              <p className="text-2xl font-bold text-gray-900">{totalAvailable}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                utilizationRate >= 90 ? 'bg-danger-100' : 
                utilizationRate >= 70 ? 'bg-warning-100' : 'bg-success-100'
              }`}>
                {getStatusIcon(utilizationRate)}
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Utilización</p>
              <p className={`text-2xl font-bold ${getStatusColor(utilizationRate)}`}>
                {utilizationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Areas Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Áreas</h3>
          <div className="space-y-4">
            {dailyCapacity.map((area) => {
              const utilization = (area.reservedSeats / area.totalCapacity) * 100;
              return (
                <div key={area.areaId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: state.areas.find(a => a.id === area.areaId)?.color }}
                    />
                                         <div>
                       <p className="text-sm font-medium text-gray-900">{area.areaName}</p>
                       <p className="text-xs text-gray-500">
                         {area.reservedSeats}/{area.totalCapacity} {state.areas.find(a => a.id === area.areaId)?.isMeetingRoom ? 'personas' : 'puestos'}
                       </p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(utilization)}`}>
                      {utilization.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {area.availableSeats} disponibles
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas Recientes</h3>
          <div className="space-y-3">
            {recentReservations.length > 0 ? (
              recentReservations.map((reservation) => (
                                 <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                   <div>
                     <p className="text-sm font-medium text-gray-900">{reservation.groupName}</p>
                     <p className="text-xs text-gray-500">{reservation.areaName}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm text-gray-900">
                       {state.areas.find(a => a.id === reservation.areaId)?.isMeetingRoom 
                         ? `${reservation.requestedSeats} personas`
                         : `${reservation.requestedSeats} puestos`
                       }
                     </p>
                     <p className="text-xs text-gray-500">
                       {reservation.time} - {(() => {
                         const [hours, minutes] = reservation.time.split(':').map(Number);
                         const totalMinutes = hours * 60 + minutes + reservation.duration;
                         const endHours = Math.floor(totalMinutes / 60);
                         const endMinutes = totalMinutes % 60;
                         return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                       })()}
                     </p>
                   </div>
                 </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay reservas recientes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
