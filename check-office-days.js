const mongoose = require('mongoose');

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI);

const adminSettingsSchema = new mongoose.Schema({
  maxReservationDays: Number,
  allowSameDayReservations: Boolean,
  requireApproval: Boolean,
  businessHours: {
    start: String,
    end: String
  },
  officeDays: {
    monday: Boolean,
    tuesday: Boolean,
    wednesday: Boolean,
    thursday: Boolean,
    friday: Boolean,
    saturday: Boolean,
    sunday: Boolean
  },
  officeHours: {
    start: String,
    end: String
  }
});

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

async function checkOfficeDays() {
  try {
    console.log('🏢 VERIFICANDO CONFIGURACIÓN DE DÍAS DE OFICINA');
    console.log('===============================================\n');

    const settings = await AdminSettings.findOne({});
    
    if (!settings) {
      console.log('❌ No se encontró configuración de días de oficina');
      console.log('💡 Creando configuración por defecto...\n');
      
      const defaultSettings = new AdminSettings({
        maxReservationDays: 30,
        allowSameDayReservations: true,
        requireApproval: false,
        businessHours: {
          start: '07:00',
          end: '18:00'
        },
        officeDays: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        officeHours: {
          start: '08:00',
          end: '18:00'
        }
      });
      
      await defaultSettings.save();
      console.log('✅ Configuración por defecto creada');
      return;
    }

    console.log('📋 Configuración actual de días de oficina:');
    console.log('==========================================');
    console.log(`📅 Lunes: ${settings.officeDays.monday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Martes: ${settings.officeDays.tuesday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Miércoles: ${settings.officeDays.wednesday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Jueves: ${settings.officeDays.thursday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Viernes: ${settings.officeDays.friday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Sábado: ${settings.officeDays.saturday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log(`📅 Domingo: ${settings.officeDays.sunday ? '✅ Laboral' : '❌ No laboral'}`);
    console.log('');

    console.log('🕐 Horarios de oficina:');
    console.log('======================');
    console.log(`⏰ Inicio: ${settings.officeHours.start}`);
    console.log(`⏰ Fin: ${settings.officeHours.end}`);
    console.log('');

    // Verificar específicamente el lunes 15 de septiembre
    const testDate = new Date('2025-09-15');
    const dayOfWeek = testDate.getDay(); // 1 = lunes
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    console.log('🔍 Verificación específica para lunes 15 de septiembre:');
    console.log('=====================================================');
    console.log(`📅 Fecha: ${testDate.toDateString()}`);
    console.log(`📅 Día de la semana: ${dayNames[dayOfWeek]} (${dayOfWeek})`);
    console.log(`📅 Es día laboral: ${settings.officeDays.monday ? '✅ SÍ' : '❌ NO'}`);
    
    if (!settings.officeDays.monday) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('El lunes está marcado como NO laboral en la configuración');
      console.log('Esto explica por qué el sistema rechaza el lunes 15 de septiembre');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

checkOfficeDays();
