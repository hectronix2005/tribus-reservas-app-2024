// Configuración para Google Sheets
const GOOGLE_SHEETS_CONFIG = {
  // En producción, estos valores deberían venir de variables de entorno
  SPREADSHEET_ID: process.env.REACT_APP_GOOGLE_SHEETS_ID || '',
  API_KEY: process.env.REACT_APP_GOOGLE_API_KEY || '',
  SHEET_NAME: 'Reservas_TRIBUS'
};

export interface GoogleSheetsReservation {
  id: string;
  fecha: string;
  hora: string;
  duracion: string;
  area: string;
  grupo: string;
  asientos: string;
  contacto: string;
  email: string;
  telefono: string;
  estado: string;
  notas: string;
  fechaCreacion: string;
}

// Función para convertir una reserva a formato de Google Sheets
export const formatReservationForSheets = (reservation: any): GoogleSheetsReservation => {
  const durationHours = Math.floor(reservation.duration / 60);
  const durationMinutes = reservation.duration % 60;
  const durationText = durationHours > 0 
    ? `${durationHours}h ${durationMinutes > 0 ? `${durationMinutes}min` : ''}`.trim()
    : `${durationMinutes}min`;

  return {
    id: reservation.id,
    fecha: reservation.date,
    hora: reservation.time,
    duracion: durationText,
    area: reservation.areaName,
    grupo: reservation.groupName,
    asientos: reservation.requestedSeats.toString(),
    contacto: reservation.contactPerson,
    email: reservation.contactEmail,
    telefono: reservation.contactPhone,
    estado: reservation.status,
    notas: reservation.notes || '',
    fechaCreacion: reservation.createdAt
  };
};

// Función para guardar una reserva en Google Sheets
export const saveReservationToGoogleSheets = async (reservation: any): Promise<boolean> => {
  try {
    // Verificar configuración
    if (!GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID || !GOOGLE_SHEETS_CONFIG.API_KEY) {
      console.warn('Google Sheets no configurado. Saltando respaldo.');
      return false;
    }

    const formattedReservation = formatReservationForSheets(reservation);
    
    // Preparar datos para Google Sheets
    const rowData = [
      formattedReservation.id,
      formattedReservation.fecha,
      formattedReservation.hora,
      formattedReservation.duracion,
      formattedReservation.area,
      formattedReservation.grupo,
      formattedReservation.asientos,
      formattedReservation.contacto,
      formattedReservation.email,
      formattedReservation.telefono,
      formattedReservation.estado,
      formattedReservation.notas,
      formattedReservation.fechaCreacion
    ];

    // URL de la API de Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.SHEET_NAME}!A:append?valueInputOption=RAW&key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      })
    });

    if (response.ok) {
      console.log('✅ Reserva guardada en Google Sheets:', formattedReservation.id);
      return true;
    } else {
      console.error('❌ Error al guardar en Google Sheets:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al conectar con Google Sheets:', error);
    return false;
  }
};

// Función para crear la estructura inicial de la hoja
export const initializeGoogleSheets = async (): Promise<boolean> => {
  try {
    if (!GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID || !GOOGLE_SHEETS_CONFIG.API_KEY) {
      console.warn('Google Sheets no configurado.');
      return false;
    }

    // Headers de la hoja
    const headers = [
      'ID',
      'Fecha',
      'Hora',
      'Duración',
      'Área',
      'Grupo',
      'Asientos',
      'Contacto',
      'Email',
      'Teléfono',
      'Estado',
      'Notas',
      'Fecha Creación'
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.SHEET_NAME}!A1:M1?valueInputOption=RAW&key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers]
      })
    });

    if (response.ok) {
      console.log('✅ Google Sheets inicializado correctamente');
      return true;
    } else {
      console.error('❌ Error al inicializar Google Sheets:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al conectar con Google Sheets:', error);
    return false;
  }
};

// Función para verificar si Google Sheets está configurado
export const isGoogleSheetsConfigured = (): boolean => {
  return !!(GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID && GOOGLE_SHEETS_CONFIG.API_KEY);
};

// Función para obtener el enlace de la hoja
export const getGoogleSheetsUrl = (): string => {
  if (!GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID) {
    return '';
  }
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/edit#gid=0`;
};
