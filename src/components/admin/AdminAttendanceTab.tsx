import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload, CheckCircle, XCircle, AlertCircle, Download,
  RefreshCw, FileSpreadsheet, Users, Clock, BarChart3, Info,
  Trash2, Eye, History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { reservationService, userService } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { getAuthToken } from '../../utils/storage';

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportHistoryItem {
  _id: string;
  filename: string;
  period: string;
  uploadedByName: string;
  uploadedAt: string;
  employeeCount: number;
  dateColumns: string[];
}

interface EmployeeClockData {
  employeeId: string;
  name: string;
  department: string;
  shifts: Record<string, number | string>;          // date → shift code
  attendance: Record<string, { events: string[]; checkIn: string; checkOut: string }>;
  stats: {
    horasNormal: string; horasReal: string;
    retardosCant: number; retardosMin: number;
    salidaTempranaCant: number; salidaTempranaMin: number;
    diasAsistidos: string; faltaDias: number; permisoDias: number;
  } | null;
  exceptions: Array<{
    date: string;
    entrada1: string; salida1: string;
    entrada2: string; salida2: string;
    retardosMin: number; salidaTempranaMin: number;
    faltaMin: number; totalMin: number;
  }>;
}

interface ValidationRow {
  date: string;
  employeeId: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  clockEvents: string[];
  reservationArea: string;
  reservationTeam: string;
  reservationRole: string;
  hasReservation: boolean;
  hasClock: boolean;
  status: 'match' | 'attended_no_reservation' | 'reservation_no_attendance';
  horasReal?: string;
  faltaDias?: number;
  retardosMin?: number;
  salidaTempranaMin?: number;
}

interface EmployeeSummary {
  employeeId: string;
  name: string;
  department: string;
  diasProgramados: number;
  diasAsistidosClock: number;
  diasConReserva: number;
  coincidencias: number;
  asistioSinReserva: number;
  reservaSinAsistencia: number;
  horasReal: string;
  faltaDias: number;
  retardosMin: number;
  salidaTempranaMin: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeName = (s: string) =>
  s.toLowerCase().trim()
   .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
   .replace(/\s+/g, ' ');

/** Parse concatenated clock events "07:5509:3217:50" → ["07:55","09:32","17:50"] */
function parseClockEvents(cell: any): string[] {
  const s = String(cell || '').trim();
  const events: string[] = [];
  for (let i = 0; i + 5 <= s.length; i += 5) {
    const t = s.substring(i, i + 5);
    if (/^\d{2}:\d{2}$/.test(t)) events.push(t);
  }
  return events;
}

function extractYearMonth(period: string): string {
  const m = period.match(/(\d{4}-\d{2})-\d{2}/);
  return m ? m[1] : '';
}

const SHIFT_LABELS: Record<string | number, string> = {
  1: 'Normal', 25: 'Permiso', 26: 'Salida temprana', '': 'Vacaciones/Ausente'
};

// ─── Sheet Parsers ────────────────────────────────────────────────────────────

function parseTurnosSheet(ws: XLSX.WorkSheet): {
  period: string;
  dateColumns: string[];
  employees: Map<string, Pick<EmployeeClockData, 'employeeId' | 'name' | 'department' | 'shifts'>>;
} {
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
  const period = String(data[1]?.[1] || '').trim();
  const yearMonth = extractYearMonth(period);
  const headerRow: any[] = data[2] || [];

  const dateCols: Array<{ colIndex: number; date: string }> = [];
  for (let i = 3; i < headerRow.length; i++) {
    const day = headerRow[i];
    if (typeof day !== 'number' || day === 0) break;
    dateCols.push({ colIndex: i, date: `${yearMonth}-${String(day).padStart(2, '0')}` });
  }

  const employees = new Map<string, Pick<EmployeeClockData, 'employeeId' | 'name' | 'department' | 'shifts'>>();
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    const empId = String(row[0] || '').trim();
    if (!empId) continue;
    const shifts: Record<string, number | string> = {};
    dateCols.forEach(({ colIndex, date }) => { shifts[date] = row[colIndex] ?? ''; });
    employees.set(empId, {
      employeeId: empId,
      name: String(row[1] || '').trim(),
      department: String(row[2] || '').trim(),
      shifts,
    });
  }

  return { period, dateColumns: dateCols.map(d => d.date), employees };
}

function parseEstadisticoSheet(ws: XLSX.WorkSheet): Map<string, EmployeeClockData['stats']> {
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
  const map = new Map<string, EmployeeClockData['stats']>();
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    const empId = String(row[0] || '').trim();
    if (!empId) continue;
    map.set(empId, {
      horasNormal: String(row[3] || ''),
      horasReal: String(row[4] || ''),
      retardosCant: Number(row[5] || 0),
      retardosMin: Number(row[6] || 0),
      salidaTempranaCant: Number(row[7] || 0),
      salidaTempranaMin: Number(row[8] || 0),
      diasAsistidos: String(row[11] || ''),
      faltaDias: Number(row[13] || 0),
      permisoDias: Number(row[14] || 0),
    });
  }
  return map;
}

function parseAsistenciaSheet(ws: XLSX.WorkSheet, yearMonth: string): Map<string, EmployeeClockData['attendance']> {
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
  const dateHeaderRow: any[] = data[3] || [];

  const dayPositions: Array<{ colIndex: number; date: string }> = [];
  for (let i = 0; i < dateHeaderRow.length; i++) {
    const day = dateHeaderRow[i];
    if (typeof day === 'number' && day >= 1 && day <= 31) {
      dayPositions.push({ colIndex: i, date: `${yearMonth}-${String(day).padStart(2, '0')}` });
    }
  }

  const map = new Map<string, EmployeeClockData['attendance']>();
  for (let i = 4; i < data.length - 1; i += 2) {
    const hRow = data[i];
    if (String(hRow[0]).trim() !== 'ID:') continue;
    const empId = String(hRow[2] || '').trim();
    if (!empId) continue;

    const eventsRow: any[] = data[i + 1] || [];
    const attendance: EmployeeClockData['attendance'] = {};
    dayPositions.forEach(({ colIndex, date }) => {
      const events = parseClockEvents(eventsRow[colIndex]);
      if (events.length > 0) {
        attendance[date] = { events, checkIn: events[0], checkOut: events[events.length - 1] };
      }
    });
    map.set(empId, attendance);
  }
  return map;
}

function parseExcepcionesSheet(ws: XLSX.WorkSheet): Map<string, EmployeeClockData['exceptions']> {
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true });
  const map = new Map<string, EmployeeClockData['exceptions']>();
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    const empId = String(row[0] || '').trim();
    if (!empId) continue;
    const date = String(row[3] || '').trim();
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
    if (!map.has(empId)) map.set(empId, []);
    map.get(empId)!.push({
      date,
      entrada1: String(row[4] || '').trim(),
      salida1: String(row[5] || '').trim(),
      entrada2: String(row[6] || '').trim(),
      salida2: String(row[7] || '').trim(),
      retardosMin: Number(row[8] || 0),
      salidaTempranaMin: Number(row[9] || 0),
      faltaMin: Number(row[10] || 0),
      totalMin: Number(row[11] || 0),
    });
  }
  return map;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

const RELOJ_SHEETS = ['Reporte de Turnos', 'Reporte Estadístico', 'Reporte de Asistencia', 'Reporte de Excepciones'];

function isRelojChecadorFormat(wb: XLSX.WorkBook): boolean {
  return RELOJ_SHEETS.every(s => wb.SheetNames.includes(s));
}

function parseRelojChecador(wb: XLSX.WorkBook): {
  period: string;
  dateColumns: string[];
  employees: EmployeeClockData[];
} {
  const turnos = parseTurnosSheet(wb.Sheets['Reporte de Turnos']);
  const yearMonth = extractYearMonth(turnos.period);
  const statsMap = parseEstadisticoSheet(wb.Sheets['Reporte Estadístico']);
  const attendanceMap = parseAsistenciaSheet(wb.Sheets['Reporte de Asistencia'], yearMonth);
  const excMap = parseExcepcionesSheet(wb.Sheets['Reporte de Excepciones']);

  const employees: EmployeeClockData[] = [];
  turnos.employees.forEach((emp, empId) => {
    employees.push({
      ...emp,
      stats: statsMap.get(empId) || null,
      attendance: attendanceMap.get(empId) || {},
      exceptions: excMap.get(empId) || [],
    });
  });
  return { period: turnos.period, dateColumns: turnos.dateColumns, employees };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function buildValidationRows(
  employees: EmployeeClockData[],
  dateColumns: string[],
  allReservations: any[],
  allUsers: any[]
): ValidationRow[] {
  // Build reservation lookup: date → Map<userId, {area, team, role}>
  const resByDate = new Map<string, Map<string, { area: string; team: string; role: string }>>();
  for (const r of allReservations) {
    const date = r.date ? String(r.date).substring(0, 10) : '';
    if (!date) continue;
    if (!resByDate.has(date)) resByDate.set(date, new Map());
    const dayMap = resByDate.get(date)!;
    const area = r.areaName || r.area || '';
    const team = r.teamName || r.team || '';

    const userId = !r.userId ? null : typeof r.userId === 'string' ? r.userId : r.userId?._id;
    if (userId) dayMap.set(userId, { area, team, role: 'Responsable' });

    const collabs: any[] = r.colaboradores || [];
    const attendees: string[] = r.attendees || [];
    collabs.forEach((collab: any, idx: number) => {
      const collabId = typeof collab === 'string' ? collab : collab?._id;
      if (collabId) {
        const collabUser = allUsers.find((u: any) => u._id === collabId || u.id === collabId);
        const collabName = collabUser?.name || attendees[idx] || '';
        dayMap.set(collabId, { area, team, role: 'Colaborador' });
      }
    });
  }

  // Build user lookups
  const userByEmpId = new Map<string, any>();
  const userByName = new Map<string, any>();
  for (const u of allUsers) {
    if (u.employeeId) userByEmpId.set(String(u.employeeId), u);
    userByName.set(normalizeName(u.name || ''), u);
  }

  const matchToUser = (emp: EmployeeClockData): any => {
    if (emp.employeeId && userByEmpId.has(emp.employeeId)) return userByEmpId.get(emp.employeeId);
    const nn = normalizeName(emp.name);
    if (userByName.has(nn)) return userByName.get(nn);
    for (const [normalName, user] of Array.from(userByName.entries())) {
      if (normalName.includes(nn) || nn.includes(normalName)) return user;
    }
    return null;
  };

  const rows: ValidationRow[] = [];

  for (const emp of employees) {
    const tribasUser = matchToUser(emp);
    const tribasUserId = tribasUser?._id || tribasUser?.id;

    for (const date of dateColumns) {
      const hasClock = !!(emp.attendance[date] && emp.attendance[date].events.length > 0);
      const dayMap = resByDate.get(date);
      const reservationInfo = tribasUserId && dayMap ? dayMap.get(tribasUserId) || null : null;
      const hasReservation = !!reservationInfo;

      if (!hasClock && !hasReservation) continue;

      const status: ValidationRow['status'] =
        hasClock && hasReservation ? 'match' :
        hasClock ? 'attended_no_reservation' :
        'reservation_no_attendance';

      rows.push({
        date,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        checkIn: emp.attendance[date]?.checkIn || '',
        checkOut: emp.attendance[date]?.checkOut || '',
        clockEvents: emp.attendance[date]?.events || [],
        reservationArea: reservationInfo?.area || '',
        reservationTeam: reservationInfo?.team || '',
        reservationRole: reservationInfo?.role || '',
        hasReservation,
        hasClock,
        status,
        horasReal: emp.stats?.horasReal,
        faltaDias: emp.stats?.faltaDias,
        retardosMin: emp.stats?.retardosMin,
        salidaTempranaMin: emp.stats?.salidaTempranaMin,
      });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return rows;
}

function buildSummary(employees: EmployeeClockData[], rows: ValidationRow[]): EmployeeSummary[] {
  return employees.map(emp => {
    const empRows = rows.filter(r => r.employeeId === emp.employeeId);
    return {
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      diasProgramados: Object.values(emp.shifts).filter(v => v === 1 || v === '1').length,
      diasAsistidosClock: Object.keys(emp.attendance).length,
      diasConReserva: empRows.filter(r => r.hasReservation).length,
      coincidencias: empRows.filter(r => r.status === 'match').length,
      asistioSinReserva: empRows.filter(r => r.status === 'attended_no_reservation').length,
      reservaSinAsistencia: empRows.filter(r => r.status === 'reservation_no_attendance').length,
      horasReal: emp.stats?.horasReal || '',
      faltaDias: emp.stats?.faltaDias ?? 0,
      retardosMin: emp.stats?.retardosMin ?? 0,
      salidaTempranaMin: emp.stats?.salidaTempranaMin ?? 0,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminAttendanceTab() {
  const { state } = useApp();
  const currentUser = state.auth?.currentUser;
  const isAdminOrSuper = ['admin', 'superadmin'].includes(currentUser?.role || '');

  const [step, setStep] = useState<1 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [period, setPeriod] = useState('');
  const [dateColumns, setDateColumns] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeClockData[]>([]);
  const [results, setResults] = useState<ValidationRow[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [viewMode, setViewMode] = useState<'detail' | 'summary'>('detail');
  const [activeFilter, setActiveFilter] = useState<'all' | ValidationRow['status']>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [currentFilename, setCurrentFilename] = useState('');
  const [saveError, setSaveError] = useState('');
  // pendingSave: set after processing a NEW file (not when loading from history)
  const [pendingSave, setPendingSave] = useState<{
    filename: string; period: string; employeeCount: number;
    dateColumns: string[]; results: ValidationRow[]; summary: EmployeeSummary[];
  } | null>(null);

  // History
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await apiFetch('/attendance-reports');
      setHistory(data);
    } catch {
      // silently ignore — history is optional
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminOrSuper) loadHistory();
  }, [isAdminOrSuper, loadHistory]);

  // Save to history whenever pendingSave is set (after processing a new file)
  useEffect(() => {
    if (!pendingSave) return;
    const data = pendingSave;
    setPendingSave(null);  // clear immediately to avoid double-save on re-render

    const doSave = async () => {
      setSaveError('');
      setIsSaving(true);
      try {
        await apiFetch('/attendance-reports', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        loadHistory();
      } catch (e: any) {
        const msg = e.message || 'Error desconocido';
        console.error('Error guardando reporte en historial:', msg);
        setSaveError(`No se pudo guardar en historial: ${msg}`);
      } finally {
        setIsSaving(false);
      }
    };
    doSave();
  }, [pendingSave, loadHistory]);

  const handleViewFromHistory = async (item: ReportHistoryItem) => {
    setLoadingId(item._id);
    try {
      const report = await apiFetch(`/attendance-reports/${item._id}`);
      setPeriod(report.period);
      setDateColumns(report.dateColumns || []);
      setEmployees([]);
      setResults(report.results || []);
      setSummary(report.summary || []);
      setCurrentFilename(report.filename);
      setStep(3);
      setActiveFilter('all');
      setDateFilter('');
      setDeptFilter('');
    } catch (e: any) {
      alert(`Error cargando reporte: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteFromHistory = async (item: ReportHistoryItem) => {
    if (!window.confirm(`¿Eliminar el reporte "${item.filename}" (${item.period})?`)) return;
    setDeletingId(item._id);
    try {
      await apiFetch(`/attendance-reports/${item._id}`, { method: 'DELETE' });
      setHistory(h => h.filter(r => r._id !== item._id));
    } catch (e: any) {
      alert(`Error eliminando reporte: ${e.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError('');
    setSaveError('');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });

      if (!isRelojChecadorFormat(wb)) {
        setError(
          `Formato no reconocido. Se esperan las pestañas: ${RELOJ_SHEETS.join(', ')}.\n` +
          `El archivo contiene: ${wb.SheetNames.join(', ')}.`
        );
        return;
      }

      const parsed = parseRelojChecador(wb);

      const [allReservations, allUsers] = await Promise.all([
        reservationService.getAllReservations(),
        userService.getAllUsers(),
      ]);

      const validationRows = buildValidationRows(parsed.employees, parsed.dateColumns, allReservations, allUsers);
      const summaryRows = buildSummary(parsed.employees, validationRows);

      setPeriod(parsed.period);
      setDateColumns(parsed.dateColumns);
      setEmployees(parsed.employees);
      setResults(validationRows);
      setSummary(summaryRows);
      setCurrentFilename(file.name);
      setStep(3);

      // Trigger auto-save via useEffect (avoids stale closure)
      setPendingSave({
        filename: file.name,
        period: parsed.period,
        employeeCount: parsed.employees.length,
        dateColumns: parsed.dateColumns,
        results: validationRows,
        summary: summaryRows,
      });
    } catch (e: any) {
      setError(`Error procesando el archivo: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx?|csv)$/i)) {
      setError('Solo se aceptan archivos .xlsx, .xls o .csv');
      return;
    }
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleReset = () => {
    setStep(1);
    setResults([]);
    setSummary([]);
    setEmployees([]);
    setPeriod('');
    setDateColumns([]);
    setError('');
    setSaveError('');
    setPendingSave(null);
    setActiveFilter('all');
    setDateFilter('');
    setDeptFilter('');
  };

  // ── Filtered results ──
  const filteredResults = results.filter(r => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    if (deptFilter && !normalizeName(r.department).includes(normalizeName(deptFilter))) return false;
    return true;
  });

  const filteredSummary = summary.filter(r => {
    if (deptFilter && !normalizeName(r.department).includes(normalizeName(deptFilter))) return false;
    return true;
  });

  const counts = {
    match: results.filter(r => r.status === 'match').length,
    attended_no_reservation: results.filter(r => r.status === 'attended_no_reservation').length,
    reservation_no_attendance: results.filter(r => r.status === 'reservation_no_attendance').length,
  };

  const uniqueDates = Array.from(new Set(results.map(r => r.date))).sort();
  const uniqueDepts = Array.from(new Set(employees.map(e => e.department))).sort();

  // ── Export ──
  const handleExport = () => {
    const wb2 = XLSX.utils.book_new();

    // Sheet 1: Detail
    const detailData = [
      ['Fecha', 'ID Empleado', 'Nombre', 'Departamento', 'Entrada', 'Salida',
       'Eventos Reloj', 'Reserva TRIBUS', 'Área', 'Equipo', 'Rol', 'Estado',
       'Horas Reales', 'Días Falta', 'Retardos (min)', 'Salida Temprana (min)'],
      ...results.map(r => [
        r.date, r.employeeId, r.name, r.department, r.checkIn, r.checkOut,
        r.clockEvents.join(' | '),
        r.hasReservation ? 'Sí' : 'No',
        r.reservationArea, r.reservationTeam, r.reservationRole,
        r.status === 'match' ? 'Coincidencia' :
        r.status === 'attended_no_reservation' ? 'Asistió sin reserva' : 'Reserva sin asistencia',
        r.horasReal || '', r.faltaDias ?? '', r.retardosMin ?? '', r.salidaTempranaMin ?? '',
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(detailData);
    ws1['!cols'] = [8,10,22,18,8,8,20,12,16,14,12,22,10,8,12,16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb2, ws1, 'Detalle');

    // Sheet 2: Summary
    const summaryData = [
      ['ID', 'Nombre', 'Departamento', 'Días Programados', 'Días Asistidos (Reloj)',
       'Días con Reserva', 'Coincidencias', 'Asistió sin Reserva', 'Reserva sin Asistencia',
       'Horas Reales', 'Días Falta', 'Retardos (min)', 'Salida Temprana (min)'],
      ...summary.map(r => [
        r.employeeId, r.name, r.department, r.diasProgramados, r.diasAsistidosClock,
        r.diasConReserva, r.coincidencias, r.asistioSinReserva, r.reservaSinAsistencia,
        r.horasReal, r.faltaDias, r.retardosMin, r.salidaTempranaMin,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [8,22,18,14,18,14,12,18,18,10,10,12,16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb2, ws2, 'Resumen');

    const filename = `validacion_asistencia_${period.replace(' ~ ', '_').replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb2, filename);
  };

  // ── Status helpers ──
  const statusBg = (s: ValidationRow['status']) =>
    s === 'match' ? 'bg-green-50' :
    s === 'attended_no_reservation' ? 'bg-yellow-50' : 'bg-red-50';

  const statusBadge = (s: ValidationRow['status']) =>
    s === 'match'
      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Coincidencia</span>
      : s === 'attended_no_reservation'
      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3" />Sin reserva</span>
      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" />Sin asistencia</span>;

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const dow = days[new Date(d).getDay()];
    return `${dow} ${day}/${m}`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1 — Upload
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Validación de Asistencia</h3>
          <p className="text-sm text-gray-600">
            Carga el informe del reloj checador para cruzarlo con las reservas en el sistema.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Formato compatible detectado automáticamente</p>
              <p>Se reconoce el informe con las pestañas:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li><strong>Reporte de Turnos</strong> — asignación de turno por día</li>
                <li><strong>Reporte Estadístico</strong> — resumen de horas, faltas y retardos</li>
                <li><strong>Reporte de Asistencia</strong> — eventos de entrada/salida por día</li>
                <li><strong>Reporte de Excepciones</strong> — detalle de anomalías por día</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-gray-600">Procesando archivo y cruzando datos con el sistema...</p>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('att-file-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <FileSpreadsheet className="w-14 h-14 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-1">
              Arrastra el archivo aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500">Archivos .xlsx, .xls o .csv del reloj checador</p>
            <input
              id="att-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* ── Historial de reportes ── */}
        {isAdminOrSuper && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <History className="w-5 h-5" />
              <h4 className="font-semibold">Historial de reportes cargados</h4>
              {historyLoading && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
            </div>

            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-gray-500 italic">No hay reportes guardados aún.</p>
            )}

            {history.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Archivo', 'Período', 'Empleados', 'Cargado por', 'Fecha', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {history.map(item => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 max-w-[200px] truncate text-gray-900 font-medium" title={item.filename}>
                          {item.filename}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{item.period}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{item.employeeCount}</td>
                        <td className="px-4 py-2.5 text-gray-600">{item.uploadedByName || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(item.uploadedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewFromHistory(item)}
                              disabled={loadingId === item._id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50"
                            >
                              {loadingId === item._id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Eye className="w-3 h-3" />}
                              Ver
                            </button>
                            <button
                              onClick={() => handleDeleteFromHistory(item)}
                              disabled={deletingId === item._id}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingId === item._id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Trash2 className="w-3 h-3" />}
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3 — Results
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Resultado de Validación</h3>
          <p className="text-sm text-gray-500">
            Período: <strong>{period}</strong>
            {employees.length > 0 && ` · ${employees.length} empleados`}
            {` · ${dateColumns.length} días`}
            {currentFilename && <span className="ml-2 text-gray-400">— {currentFilename}</span>}
          </p>
          {isSaving && (
            <p className="text-xs text-primary-600 flex items-center gap-1 mt-0.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Guardando en historial...
            </p>
          )}
          {saveError && (
            <p className="text-xs text-red-600 mt-0.5">⚠ {saveError}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode(viewMode === 'detail' ? 'summary' : 'detail')}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            {viewMode === 'detail' ? <BarChart3 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {viewMode === 'detail' ? 'Ver resumen' : 'Ver detalle'}
          </button>
          <button onClick={handleExport} className="btn btn-primary text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <button onClick={handleReset} className="btn btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Nuevo archivo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'match', label: 'Coincidencias', icon: CheckCircle, color: 'green', desc: 'Asistió y tenía reserva' },
          { key: 'attended_no_reservation', label: 'Sin reserva en TRIBUS', icon: AlertCircle, color: 'yellow', desc: 'Asistió pero sin reserva registrada' },
          { key: 'reservation_no_attendance', label: 'Sin asistencia', icon: XCircle, color: 'red', desc: 'Tenía reserva pero no marcó en reloj' },
        ].map(({ key, label, icon: Icon, color, desc }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(activeFilter === key ? 'all' : key as any)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              activeFilter === key
                ? `border-${color}-400 bg-${color}-50`
                : `border-gray-200 bg-white hover:border-${color}-300`
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <Icon className={`w-5 h-5 text-${color}-600`} />
              <span className={`text-2xl font-bold text-${color}-700`}>
                {counts[key as keyof typeof counts]}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {viewMode === 'detail' && (
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option value="">Todos los días</option>
            {uniqueDates.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Filtrar por departamento..."
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 min-w-[200px]"
        />
        {(activeFilter !== 'all' || dateFilter || deptFilter) && (
          <button
            onClick={() => { setActiveFilter('all'); setDateFilter(''); setDeptFilter(''); }}
            className="text-sm text-primary-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── SUMMARY VIEW ── */}
      {viewMode === 'summary' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Nombre', 'Departamento', 'Programados', 'Asistidos (reloj)', 'Con reserva',
                  'Coincidencias', 'Sin reserva', 'Sin asistencia',
                  'Horas reales', 'Faltas', 'Retardos', 'Salida temp.'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSummary.map(r => (
                <tr key={r.employeeId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{r.employeeId}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.department}</td>
                  <td className="px-3 py-2 text-center">{r.diasProgramados}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={r.diasAsistidosClock > 0 ? 'text-green-700 font-medium' : 'text-red-600'}>
                      {r.diasAsistidosClock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{r.diasConReserva}</td>
                  <td className="px-3 py-2 text-center">
                    {r.coincidencias > 0
                      ? <span className="text-green-700 font-medium">{r.coincidencias}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.asistioSinReserva > 0
                      ? <span className="text-yellow-700 font-medium">{r.asistioSinReserva}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.reservaSinAsistencia > 0
                      ? <span className="text-red-700 font-medium">{r.reservaSinAsistencia}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs">{r.horasReal || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {r.faltaDias > 0
                      ? <span className="text-red-600 font-medium">{r.faltaDias}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.retardosMin > 0
                      ? <span className="text-yellow-700">{r.retardosMin} min</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.salidaTempranaMin > 0
                      ? <span className="text-yellow-700">{r.salidaTempranaMin} min</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSummary.length === 0 && (
            <div className="text-center py-10 text-gray-500">No hay empleados para mostrar</div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {viewMode === 'detail' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'ID', 'Nombre', 'Departamento', 'Entrada', 'Salida',
                  'Eventos reloj', 'Reserva TRIBUS', 'Área / Equipo', 'Estado'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((r, i) => (
                <tr key={i} className={`hover:brightness-95 ${statusBg(r.status)}`}>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-3 py-2 text-gray-500">{r.employeeId}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.department}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {r.checkIn || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {r.checkOut || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 max-w-[140px] truncate" title={r.clockEvents.join(' · ')}>
                    {r.clockEvents.length > 0
                      ? r.clockEvents.join(' · ')
                      : <span className="text-gray-400">Sin eventos</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.hasReservation
                      ? <span className="text-green-700 font-medium">Sí</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {r.reservationArea && (
                      <span>{r.reservationArea}{r.reservationTeam ? ` · ${r.reservationTeam}` : ''}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredResults.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              {results.length === 0
                ? 'No se encontraron registros para cruzar'
                : 'No hay registros con los filtros seleccionados'}
            </div>
          )}
          {filteredResults.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
              Mostrando {filteredResults.length} de {results.length} registros
            </div>
          )}
        </div>
      )}
    </div>
  );
}
