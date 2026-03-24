import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Download, RefreshCw, FileSpreadsheet, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { reservationService, userService } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClockRecord {
  rawDate: string;
  date: string;          // YYYY-MM-DD normalized
  name: string;
  employeeId: string;
  cedula: string;
  checkIn: string;
  checkOut: string;
}

interface ColumnMap {
  date: string;
  name: string;
  employeeId: string;
  cedula: string;
  checkIn: string;
  checkOut: string;
}

type ValidationStatus = 'match' | 'attended_no_reservation' | 'reservation_no_attendance';

interface ValidationResult {
  date: string;
  name: string;
  employeeId: string;
  cedula: string;
  department: string;
  checkIn: string;
  checkOut: string;
  reservationArea: string;
  reservationTeam: string;
  reservationRole: string;
  status: ValidationStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeName = (s: string) =>
  (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const parseDate = (value: any): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch {}
  return s;
};

const autoDetect = (headers: string[], keywords: string[]): string => {
  const norm = headers.map(h =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  );
  for (const kw of keywords) {
    const idx = norm.findIndex(h => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return '';
};

const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  match: {
    label: 'Asistió y tenía reserva',
    color: 'bg-green-50 text-green-800 border-green-200',
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
  },
  attended_no_reservation: {
    label: 'Asistió sin reserva',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
  },
  reservation_no_attendance: {
    label: 'Reserva sin asistencia',
    color: 'bg-red-50 text-red-800 border-red-200',
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminAttendanceTab() {
  const [step, setStep] = useState<'upload' | 'map' | 'results'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({
    date: '', name: '', employeeId: '', cedula: '', checkIn: '', checkOut: '',
  });
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | 'all'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // ── File parsing ──────────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (json.length === 0) { alert('El archivo está vacío.'); return; }

      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRawRows(json);
      setFileName(file.name);

      // Auto-detect columns
      setColMap({
        date:       autoDetect(hdrs, ['fecha', 'date', 'dia', 'fec']),
        name:       autoDetect(hdrs, ['nombre', 'name', 'empleado', 'trabajador', 'nomempleado']),
        employeeId: autoDetect(hdrs, ['idempleado', 'idtrabajador', 'employeeid', 'numemp', 'numeroempleado', 'noempleado', 'codEmpleado']),
        cedula:     autoDetect(hdrs, ['cedula', 'documento', 'dni', 'cc', 'identificacion']),
        checkIn:    autoDetect(hdrs, ['entrada', 'checkin', 'ingreso', 'horaentrada', 'horaingreso', 'timein']),
        checkOut:   autoDetect(hdrs, ['salida', 'checkout', 'egreso', 'horasalida', 'horaegreso', 'timeout']),
      });

      setStep('map');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  // ── Validation logic ──────────────────────────────────────────────────────

  const validate = async () => {
    if (!colMap.date) { alert('Debes mapear al menos la columna de Fecha.'); return; }
    if (!colMap.name && !colMap.employeeId && !colMap.cedula) {
      alert('Debes mapear al menos una columna de identificación (Nombre, ID Empleado o Cédula).');
      return;
    }

    setIsLoading(true);
    try {
      const [allReservations, allUsers] = await Promise.all([
        reservationService.getAllReservations(),
        userService.getAllUsers(),
      ]);

      // Parse clock records
      const clockRecords: ClockRecord[] = rawRows.map(row => ({
        rawDate:    String(row[colMap.date] || ''),
        date:       parseDate(row[colMap.date]),
        name:       String(row[colMap.name] || '').trim(),
        employeeId: String(row[colMap.employeeId] || '').trim(),
        cedula:     String(row[colMap.cedula] || '').trim(),
        checkIn:    String(row[colMap.checkIn] || '').trim(),
        checkOut:   String(row[colMap.checkOut] || '').trim(),
      })).filter(r => r.date);

      const clockDatesSet = new Set(clockRecords.map(r => r.date));
      const clockDates = Array.from(clockDatesSet);

      // Helper: find user record matching a clock entry
      const findUser = (rec: ClockRecord) => {
        if (rec.employeeId) {
          const u = allUsers.find((u: any) => u.employeeId === rec.employeeId);
          if (u) return u;
        }
        if (rec.cedula) {
          const u = allUsers.find((u: any) => u.cedula === rec.cedula);
          if (u) return u;
        }
        if (rec.name) {
          const normClock = normalizeName(rec.name);
          const u = allUsers.find((u: any) => normalizeName(u.name) === normClock);
          if (u) return u;
          // Partial match
          const p = allUsers.find((u: any) => {
            const nu = normalizeName(u.name);
            return nu.includes(normClock) || normClock.includes(nu);
          });
          if (p) return p;
        }
        return null;
      };

      const validationRows: ValidationResult[] = [];

      for (const date of clockDates) {
        // Reservations for this date (not cancelled)
        const dateReservations = allReservations.filter((r: any) => {
          const d = (r.date || '').split('T')[0];
          return d === date && r.status !== 'cancelled';
        });

        // Build expected attendees from reservations
        interface ExpectedEntry {
          userId: string;
          name: string;
          employeeId: string;
          cedula: string;
          department: string;
          area: string;
          team: string;
          role: string;
        }
        const expectedMap = new Map<string, ExpectedEntry>();

        const addExpected = (userId: string, name: string, area: string, team: string, role: string) => {
          if (!userId && !name) return;
          const user = allUsers.find((u: any) => u._id === userId || u.id === userId);
          const key = user?._id || normalizeName(name);
          if (!expectedMap.has(key)) {
            expectedMap.set(key, {
              userId: user?._id || userId || '',
              name:   user?.name || name,
              employeeId: user?.employeeId || '',
              cedula:     user?.cedula || '',
              department: user?.department || '',
              area, team, role,
            });
          }
        };

        for (const res of dateReservations) {
          // Responsable
          const respId = !res.userId ? '' :
            typeof res.userId === 'string' ? res.userId : res.userId._id;
          addExpected(respId, res.userName || '', res.area, res.teamName, 'Responsable');

          // Colaboradores
          const attendees: string[] = res.attendees || [];
          (res.colaboradores || []).forEach((c: any, idx: number) => {
            const cId = typeof c === 'string' ? c : c._id;
            const cName = (typeof c === 'object' ? c.name : null) || attendees[idx] || '';
            addExpected(cId, cName, res.area, res.teamName, 'Colaborador');
          });
        }

        // Clock records for this date
        const dayClockRecords = clockRecords.filter(r => r.date === date);
        const matchedExpectedKeys = new Set<string>();

        // Process clock records
        for (const rec of dayClockRecords) {
          const user = findUser(rec);
          const userKey = user?._id || normalizeName(rec.name);

          // Find in expected
          let expected: ExpectedEntry | undefined;
          const expectedMapValues = Array.from(expectedMap.values());
          const expectedMapEntries = Array.from(expectedMap.entries());
          if (user) {
            expected = expectedMap.get(user._id || user.id || '');
            if (!expected) {
              // Try by normalized name
              expected = expectedMapValues.find(e =>
                normalizeName(e.name) === normalizeName(user.name)
              );
            }
          }
          if (!expected && rec.name) {
            expected = expectedMapValues.find(e =>
              normalizeName(e.name) === normalizeName(rec.name) ||
              normalizeName(e.name).includes(normalizeName(rec.name)) ||
              normalizeName(rec.name).includes(normalizeName(e.name))
            );
          }

          if (expected) {
            matchedExpectedKeys.add(
              expectedMapEntries.find(([, v]) => v === expected)?.[0] || ''
            );
          }

          validationRows.push({
            date,
            name:            user?.name || rec.name || '(Sin nombre)',
            employeeId:      user?.employeeId || rec.employeeId || '',
            cedula:          user?.cedula || rec.cedula || '',
            department:      user?.department || '',
            checkIn:         rec.checkIn,
            checkOut:        rec.checkOut,
            reservationArea: expected?.area || '',
            reservationTeam: expected?.team || '',
            reservationRole: expected?.role || '',
            status: expected ? 'match' : 'attended_no_reservation',
          });

          if (expected) {
            const expKey = expectedMapEntries.find(([, v]) => v === expected)?.[0] || '';
            if (expKey) matchedExpectedKeys.add(expKey);
          }
        }

        // Collect matched keys properly
        const matchedNames = new Set(
          validationRows
            .filter(r => r.date === date && r.status === 'match')
            .map(r => normalizeName(r.name))
        );

        // Expected with no clock entry
        for (const [, exp] of Array.from(expectedMap)) {
          const normExp = normalizeName(exp.name);
          if (!matchedNames.has(normExp)) {
            validationRows.push({
              date,
              name:            exp.name,
              employeeId:      exp.employeeId,
              cedula:          exp.cedula,
              department:      exp.department,
              checkIn:         '',
              checkOut:        '',
              reservationArea: exp.area,
              reservationTeam: exp.team,
              reservationRole: exp.role,
              status:          'reservation_no_attendance',
            });
          }
        }
      }

      // Sort by date, then status priority, then name
      const statusOrder: Record<ValidationStatus, number> = {
        reservation_no_attendance: 0,
        attended_no_reservation: 1,
        match: 2,
      };
      validationRows.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
        return a.name.localeCompare(b.name);
      });

      setResults(validationRows);
      setStep('results');
    } catch (err: any) {
      alert('Error al validar: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Export results ────────────────────────────────────────────────────────

  const exportResults = () => {
    const rows = [
      ['Fecha', 'Nombre', 'ID Empleado', 'Cédula', 'Departamento',
       'Hora Entrada', 'Hora Salida', 'Área Reservada', 'Equipo', 'Rol en Reserva', 'Estado'],
      ...filtered.map(r => [
        r.date, r.name, r.employeeId, r.cedula, r.department,
        r.checkIn, r.checkOut, r.reservationArea, r.reservationTeam,
        r.reservationRole, STATUS_CONFIG[r.status].label,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      {wch:12},{wch:28},{wch:14},{wch:14},{wch:22},
      {wch:13},{wch:13},{wch:24},{wch:20},{wch:16},{wch:28},
    ];
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = { ref: ws['!ref'] as string };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validación Asistencia');
    XLSX.writeFile(wb, `validacion_asistencia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Filtered results ──────────────────────────────────────────────────────

  const filtered = results.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterDate && r.date !== filterDate) return false;
    return true;
  });

  const counts = {
    match:                      results.filter(r => r.status === 'match').length,
    attended_no_reservation:    results.filter(r => r.status === 'attended_no_reservation').length,
    reservation_no_attendance:  results.filter(r => r.status === 'reservation_no_attendance').length,
  };

  const uniqueDates = Array.from(new Set(results.map(r => r.date))).sort();

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Validación de Asistencia</h3>
        <p className="text-sm text-gray-600">
          Carga el reporte del reloj checador y compara con las reservas registradas en el sistema.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center space-x-4 text-sm">
        {(['upload', 'map', 'results'] as const).map((s, i) => {
          const labels = ['1. Cargar archivo', '2. Mapear columnas', '3. Resultados'];
          const active = step === s;
          const done = (step === 'map' && i === 0) || (step === 'results' && i <= 1);
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className="w-8 h-px bg-gray-300" />}
              <span className={`font-medium ${active ? 'text-primary-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="card">
          <h4 className="font-medium text-gray-900 mb-4">Cargar reporte del reloj checador</h4>
          <p className="text-sm text-gray-500 mb-4">
            Soporta archivos <strong>.xlsx</strong>, <strong>.xls</strong> y <strong>.csv</strong>.
            El archivo debe tener una fila de encabezados con el nombre de cada columna.
          </p>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
            onClick={() => document.getElementById('clock-file-input')?.click()}
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Arrastra el archivo aquí o haz clic para seleccionar</p>
            <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls) o CSV</p>
            <input
              id="clock-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </div>
      )}

      {/* ── STEP 2: Column mapping ── */}
      {step === 'map' && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Mapear columnas</h4>
              <p className="text-sm text-gray-500">
                Archivo: <strong>{fileName}</strong> — {rawRows.length} registros detectados
              </p>
            </div>
            <button onClick={() => setStep('upload')} className="btn-secondary text-sm">
              Cambiar archivo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                { key: 'date',       label: 'Fecha *',           required: true  },
                { key: 'name',       label: 'Nombre empleado',   required: false },
                { key: 'employeeId', label: 'ID de Empleado',    required: false },
                { key: 'cedula',     label: 'Cédula / Documento',required: false },
                { key: 'checkIn',    label: 'Hora de entrada',   required: false },
                { key: 'checkOut',   label: 'Hora de salida',    required: false },
              ] as { key: keyof ColumnMap; label: string; required: boolean }[]
            ).map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={colMap[key]}
                  onChange={e => setColMap(prev => ({ ...prev, [key]: e.target.value }))}
                  className="input-field"
                >
                  <option value="">— No mapear —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Vista previa (primeras 3 filas):</p>
            <div className="overflow-x-auto border border-gray-200 rounded text-xs">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {headers.map(h => (
                        <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={validate}
              disabled={isLoading || !colMap.date}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Validando...</span></>
                : <><CheckCircle className="w-4 h-4" /><span>Validar asistencia</span></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results ── */}
      {step === 'results' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                { key: 'match',                     bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800',  count: counts.match },
                { key: 'attended_no_reservation',   bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-800', count: counts.attended_no_reservation },
                { key: 'reservation_no_attendance', bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',    count: counts.reservation_no_attendance },
              ] as { key: ValidationStatus; bg: string; border: string; text: string; count: number }[]
            ).map(({ key, bg, border, text, count }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${bg} ${border} ${filterStatus === key ? 'ring-2 ring-offset-1 ring-primary-400' : ''}`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {STATUS_CONFIG[key].icon}
                  <span className={`text-2xl font-bold ${text}`}>{count}</span>
                </div>
                <p className={`text-sm font-medium ${text}`}>{STATUS_CONFIG[key].label}</p>
              </button>
            ))}
          </div>

          {/* Filters + actions */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="input-field w-auto"
              >
                <option value="all">Todos los estados ({results.length})</option>
                <option value="match">Asistió y tenía reserva ({counts.match})</option>
                <option value="attended_no_reservation">Asistió sin reserva ({counts.attended_no_reservation})</option>
                <option value="reservation_no_attendance">Reserva sin asistencia ({counts.reservation_no_attendance})</option>
              </select>

              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="input-field w-auto"
              >
                <option value="">Todas las fechas</option>
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <div className="ml-auto flex items-center space-x-2">
                <button
                  onClick={() => { setStep('upload'); setResults([]); setRawRows([]); setFileName(''); }}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Nuevo archivo</span>
                </button>
                <button
                  onClick={exportResults}
                  className="btn-primary flex items-center space-x-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Fecha','Nombre','ID Emp.','Cédula','Departamento','Entrada','Salida','Área Reservada','Equipo','Rol','Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        No hay resultados para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => {
                      const cfg = STATUS_CONFIG[r.status];
                      return (
                        <tr key={i} className={`hover:bg-gray-50 ${r.status === 'reservation_no_attendance' ? 'bg-red-50/30' : r.status === 'attended_no_reservation' ? 'bg-yellow-50/30' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">{r.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.employeeId || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.cedula || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.department || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.checkIn || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.checkOut || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.reservationArea || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.reservationTeam || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.reservationRole || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                              {cfg.icon}
                              <span>{cfg.label}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50">
                Mostrando {filtered.length} de {results.length} registros
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
