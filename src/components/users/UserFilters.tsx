import React from 'react';
import { Search } from 'lucide-react';
import { Department } from '../../types';

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterRole: string;
  setFilterRole: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterDepartment: string;
  setFilterDepartment: (value: string) => void;
  departments: Department[];
  totalUsers: number;
  filteredCount: number;
}

export function UserFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterStatus,
  setFilterStatus,
  filterDepartment,
  setFilterDepartment,
  departments,
  totalUsers,
  filteredCount,
}: UserFiltersProps) {
  return (
    <div className="card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, usuario o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Todos los roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Administrador</option>
          <option value="lider">Líder</option>
          <option value="colaborador">Colaborador</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        {/* Department Filter */}
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Todos los departamentos</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept.name}>{dept.name}</option>
          ))}
        </select>
      </div>

      {/* Results Counter */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredCount} de {totalUsers} usuarios
      </div>
    </div>
  );
}
