import React from 'react';
import { Calendar, Users, Clock, TrendingUp, AlertCircle, BarChart3, Activity, Zap, Target, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInBogota } from '../utils/dateUtils';
import { TribusLogo } from './TribusLogo';

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

  const getStatusGradient = (utilization: number) => {
    if (utilization >= 90) return 'from-danger-500 to-danger-600';
    if (utilization >= 70) return 'from-warning-500 to-warning-600';
    return 'from-success-500 to-success-600';
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-8 text-white shadow-large">
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <TribusLogo size="lg" showText={false} />
              <div>
                <h1 className="text-4xl font-bold mb-2">¡Bienvenido a TRIBUS!</h1>
                <p className="text-primary-100 text-lg">
                  Resumen de reservas para {formatDateInBogota(today, 'EEEE, d \'de\' MMMM')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-primary-100 text-sm">Última actualización</p>
                <p className="text-white text-xl font-bold">
                  {formatDateInBogota(new Date(), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-hover group">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Capacidad Total</p>
              <p className="text-3xl font-bold text-slate-900">{totalCapacity}</p>
              <p className="text-xs text-slate-500">puestos disponibles</p>
            </div>
          </div>
        </div>

        <div className="card-hover group">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center shadow-glow-success group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Reservado Hoy</p>
              <p className="text-3xl font-bold text-slate-900">{totalReserved}</p>
              <p className="text-xs text-slate-500">puestos ocupados</p>
            </div>
          </div>
        </div>

        <div className="card-hover group">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Disponible</p>
              <p className="text-3xl font-bold text-slate-900">{totalAvailable}</p>
              <p className="text-xs text-slate-500">puestos libres</p>
            </div>
          </div>
        </div>

        <div className="card-hover group">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 bg-gradient-to-br ${getStatusGradient(utilizationRate)} rounded-2xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300`}>
                {getStatusIcon(utilizationRate)}
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Utilización</p>
              <p className={`text-3xl font-bold ${getStatusColor(utilizationRate)}`}>
                {utilizationRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">del total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Utilización General</h3>
          <span className={`text-sm font-medium ${getStatusColor(utilizationRate)}`}>
            {utilizationRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getStatusGradient(utilizationRate)} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${utilizationRate}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Areas Overview and Recent Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Estado de Áreas</h3>
            <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-600" />
            </div>
          </div>
          <div className="space-y-4">
            {dailyCapacity.map((area, index) => {
              const utilization = (area.reservedSeats / area.totalCapacity) * 100;
              return (
                <div 
                  key={area.areaId} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors duration-200 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: state.areas.find(a => a.id === area.areaId)?.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {area.areaName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {area.reservedSeats}/{area.totalCapacity} {state.areas.find(a => a.id === area.areaId)?.isMeetingRoom ? 'personas' : 'puestos'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${getStatusColor(utilization)}`}>
                      {utilization.toFixed(0)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {area.availableSeats} disponibles
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Reservas Recientes</h3>
            <div className="w-8 h-8 bg-success-100 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-success-600" />
            </div>
          </div>
          <div className="space-y-4">
            {recentReservations.length > 0 ? (
              recentReservations.map((reservation, index) => (
                <div 
                  key={reservation.id} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 hover:shadow-soft transition-all duration-200 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {reservation.groupName || 'Sin grupo'}
                      </p>
                      <p className="text-xs text-slate-500">{reservation.areaName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {state.areas.find(a => a.id === reservation.areaId)?.isMeetingRoom 
                        ? `${reservation.requestedSeats} personas`
                        : `${reservation.requestedSeats} puestos`
                      }
                    </p>
                    <p className="text-xs text-slate-500">
                      {reservation.time} - {(() => {
                        if (!reservation.time) return 'N/A';
                        try {
                          const [hours, minutes] = reservation.time.split(':').map(Number);
                          const totalMinutes = hours * 60 + minutes + (reservation.duration || 0);
                          const endHours = Math.floor(totalMinutes / 60);
                          const endMinutes = totalMinutes % 60;
                          return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                        } catch (error) {
                          return 'Error';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No hay reservas recientes</p>
                <p className="text-slate-400 text-sm mt-1">Las reservas aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl hover:from-primary-100 hover:to-primary-200 transition-all duration-200 group">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">Nueva Reserva</p>
              <p className="text-xs text-slate-600">Crear reserva rápida</p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-2xl hover:from-success-100 hover:to-success-200 transition-all duration-200 group">
            <div className="w-10 h-10 bg-gradient-success rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">Ver Disponibilidad</p>
              <p className="text-xs text-slate-600">Estado en tiempo real</p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-gradient-to-r from-accent-50 to-accent-100 rounded-2xl hover:from-accent-100 hover:to-accent-200 transition-all duration-200 group">
            <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">Reportes</p>
              <p className="text-xs text-slate-600">Análisis y estadísticas</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
