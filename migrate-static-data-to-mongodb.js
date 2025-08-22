const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_URI = 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0';

// Esquemas
const areaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  description: { type: String },
  color: { type: String, required: true },
  isMeetingRoom: { type: Boolean, default: false },
  isFullDayReservation: { type: Boolean, default: false }
});

const templateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  groupName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
});

const Area = mongoose.model('Area', areaSchema);
const Template = mongoose.model('Template', templateSchema);

// Datos estáticos a migrar
const staticAreas = [
  {
    id: '1',
    name: 'Sala de Reuniones A',
    capacity: 20,
    description: 'Sala principal para reuniones de equipo',
    color: '#3b82f6',
    isMeetingRoom: true
  },
  {
    id: '2',
    name: 'Sala de Reuniones B',
    capacity: 15,
    description: 'Sala secundaria para reuniones pequeñas',
    color: '#10b981',
    isMeetingRoom: true
  },
  {
    id: '3',
    name: 'Área de Colaboración',
    capacity: 30,
    description: 'Espacio abierto para trabajo en equipo - Se reserva por día completo',
    color: '#f59e0b',
    isMeetingRoom: false,
    isFullDayReservation: true
  },
  {
    id: '4',
    name: 'Sala de Capacitación',
    capacity: 25,
    description: 'Sala equipada para capacitaciones',
    color: '#8b5cf6',
    isMeetingRoom: true
  }
];

const staticTemplates = [
  {
    id: '1',
    name: 'Equipo de Desarrollo',
    description: 'Plantilla para el equipo de desarrollo',
    groupName: 'Equipo de Desarrollo',
    contactPerson: 'Juan Pérez',
    contactEmail: 'juan.perez@empresa.com',
    contactPhone: '+1234567890',
    notes: 'Reunión de planificación semanal',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0]
  },
  {
    id: '2',
    name: 'Equipo de Marketing',
    description: 'Plantilla para el equipo de marketing',
    groupName: 'Equipo de Marketing',
    contactPerson: 'María García',
    contactEmail: 'maria.garcia@empresa.com',
    contactPhone: '+1234567891',
    notes: 'Revisión de campañas',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0]
  },
  {
    id: '3',
    name: 'Reunión de Cliente',
    description: 'Plantilla para reuniones con clientes',
    groupName: 'Reunión de Cliente',
    contactPerson: 'Carlos López',
    contactEmail: 'carlos.lopez@empresa.com',
    contactPhone: '+1234567892',
    notes: 'Presentación de propuestas',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0]
  }
];

async function migrateStaticData() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Migrar áreas
    console.log('\n📋 Migrando áreas...');
    for (const area of staticAreas) {
      const existingArea = await Area.findOne({ id: area.id });
      if (existingArea) {
        console.log(`⚠️  Área ${area.name} ya existe, actualizando...`);
        await Area.findOneAndUpdate({ id: area.id }, area, { upsert: true });
      } else {
        console.log(`✅ Creando área: ${area.name}`);
        await Area.create(area);
      }
    }

    // Migrar templates
    console.log('\n📋 Migrando templates...');
    for (const template of staticTemplates) {
      const existingTemplate = await Template.findOne({ id: template.id });
      if (existingTemplate) {
        console.log(`⚠️  Template ${template.name} ya existe, actualizando...`);
        await Template.findOneAndUpdate({ id: template.id }, template, { upsert: true });
      } else {
        console.log(`✅ Creando template: ${template.name}`);
        await Template.create(template);
      }
    }

    // Verificar migración
    console.log('\n🔍 Verificando migración...');
    const areasCount = await Area.countDocuments();
    const templatesCount = await Template.countDocuments();
    
    console.log(`✅ Áreas migradas: ${areasCount}`);
    console.log(`✅ Templates migrados: ${templatesCount}`);

    console.log('\n🎉 Migración completada exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   - ${areasCount} áreas en MongoDB`);
    console.log(`   - ${templatesCount} templates en MongoDB`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración
migrateStaticData();
