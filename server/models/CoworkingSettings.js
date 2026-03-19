const mongoose = require('mongoose');

const coworkingSettingsSchema = new mongoose.Schema({
  homeContent: {
    hero: {
      title: { type: String, default: 'Tu espacio de trabajo,' },
      subtitle: { type: String, default: 'cuando lo necesites' },
      description: { type: String, default: 'Reserva salas de reuniones, hot desks y espacios colaborativos de forma rápida y sencilla. Flexibilidad total para tu equipo.' },
      stats: {
        activeReservations: { type: Number, default: 500 },
        satisfaction: { type: Number, default: 98 },
        availability: { type: String, default: '24/7' }
      }
    },
    features: [{
      icon: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true }
    }],
    spaces: [{
      name: { type: String, required: true },
      capacity: { type: String, required: true },
      priceFrom: { type: String },
      features: [{ type: String }],
      image: { type: String, required: true }
    }],
    benefits: [{ type: String }]
  },
  company: {
    name: { type: String, default: 'Tribus' },
    description: { type: String, default: 'Espacios de trabajo flexibles para equipos modernos' },
    contactEmail: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  contactForm: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Contáctanos' },
    subtitle: { type: String, default: 'Hola, introduzca sus datos de contacto para empezar' },
    description: { type: String, default: 'Solo utilizaremos esta información para ponernos en contacto con usted en relación con productos y servicios' },
    successMessage: { type: String, default: '¡Gracias por contactarnos! Nos pondremos en contacto contigo pronto.' },
    fields: {
      name: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      company: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      interestedIn: { type: Boolean, default: true }
    },
    interestedInOptions: [{
      label: { type: String },
      value: { type: String }
    }],
    privacyPolicyUrl: { type: String, default: '/privacy-policy' },
    buttonText: { type: String, default: 'Enviar' }
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('CoworkingSettings', coworkingSettingsSchema);
