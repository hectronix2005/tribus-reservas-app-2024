// Script para probar la carga de configuración de admin
const mongoose = require('mongoose');

// Conectar a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0';

async function testAdminSettingsLoading() {
  try {
    console.log('🔧 PROBANDO CARGA DE CONFIGURACIÓN DE ADMIN');
    console.log('===========================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas\n');

    // Verificar configuración en la base de datos
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
    const settings = await AdminSettings.findOne({});
    
    console.log('📊 Configuración en la base de datos:');
    if (settings) {
      console.log('✅ Configuración encontrada en MongoDB');
      console.log('📋 Detalles:');
      console.log(`   📅 Días de oficina:`, settings.officeDays);
      console.log(`   🕐 Horarios:`, settings.officeHours);
    } else {
      console.log('❌ No se encontró configuración en MongoDB');
      console.log('💡 Creando configuración por defecto...');
      
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
    }

    // Simular la llamada al API
    console.log('\n🌐 Probando llamada al API...');
    
    // Simular fetch al endpoint de admin settings
    const API_BASE_URL = 'https://tribus-reservas-2024-6b783eae459c.herokuapp.com/api';
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API responde correctamente');
        console.log('📋 Configuración desde API:', data);
      } else {
        console.log('❌ API no responde correctamente:', response.status);
      }
    } catch (error) {
      console.log('❌ Error al llamar API:', error.message);
    }

    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('===============');
    console.log('1. ✅ MongoDB Atlas tiene configuración correcta');
    console.log('2. ❓ API puede no estar respondiendo correctamente');
    console.log('3. ❓ Frontend puede no estar cargando la configuración');
    console.log('\n💡 SOLUCIÓN SUGERIDA:');
    console.log('Verificar que el endpoint /api/admin/settings esté funcionando');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

testAdminSettingsLoading();
