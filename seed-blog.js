// Script para poblar la base de datos con artículos de blog de ejemplo
require('dotenv').config();
const mongoose = require('mongoose');

// Esquema del BlogPost (debe coincidir con el de server.js)
const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, default: 'Equipo Tribus' },
  category: {
    type: String,
    enum: ['Networking', 'Ahorro', 'Tecnología', 'Productividad', 'Emprendimiento', 'Coworking', 'Otro'],
    default: 'Coworking'
  },
  image: { type: String, default: '📝' },
  keywords: [String],
  readTime: { type: String, default: '5 min' },
  published: { type: Boolean, default: false },
  publishedAt: Date,
  views: { type: Number, default: 0 },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String
  },
  lastModifiedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    modifiedAt: Date
  }
}, {
  timestamps: true
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

// Artículos de ejemplo
const samplePosts = [
  {
    title: "5 Beneficios del Coworking para Emprendedores",
    slug: "beneficios-coworking-emprendedores",
    excerpt: "Descubre cómo los espacios de coworking pueden impulsar tu productividad y ayudarte a crear conexiones valiosas en el ecosistema empresarial.",
    content: `
# 5 Beneficios del Coworking para Emprendedores

El coworking se ha convertido en una tendencia global que transforma la manera en que trabajamos. Para los emprendedores, estos espacios ofrecen ventajas únicas que van más allá de tener un escritorio.

## 1. Networking Natural

En un espacio de coworking, estás rodeado de profesionales de diversas industrias. Esto crea oportunidades orgánicas de networking que pueden llevar a colaboraciones, asociaciones y nuevos clientes.

## 2. Flexibilidad Financiera

Sin contratos a largo plazo ni inversiones iniciales grandes, el coworking te permite escalar tu espacio de trabajo según las necesidades de tu negocio.

## 3. Productividad Aumentada

El ambiente profesional y la separación física entre trabajo y hogar ayudan a mantener el enfoque y la disciplina laboral.

## 4. Servicios Incluidos

Internet de alta velocidad, salas de reuniones, impresoras y café son solo algunos de los servicios que normalmente incluyen los espacios de coworking.

## 5. Comunidad y Apoyo

Formar parte de una comunidad de emprendedores te brinda apoyo emocional, consejos y motivación en los momentos difíciles del emprendimiento.

## Conclusión

Los espacios de coworking no son solo oficinas compartidas, son ecosistemas completos diseñados para impulsar el éxito empresarial.
    `,
    author: "María González",
    category: "Coworking",
    image: "💼",
    keywords: ["coworking", "emprendimiento", "productividad", "networking"],
    readTime: "5 min",
    published: true,
    publishedAt: new Date()
  },
  {
    title: "Cómo Elegir el Espacio de Coworking Perfecto",
    slug: "elegir-espacio-coworking-perfecto",
    excerpt: "Guía completa para seleccionar el espacio de coworking que mejor se adapte a tus necesidades profesionales y presupuesto.",
    content: `
# Cómo Elegir el Espacio de Coworking Perfecto

Elegir el espacio de coworking adecuado puede marcar la diferencia en tu productividad y éxito profesional. Aquí te presentamos los factores clave a considerar.

## Ubicación Estratégica

La ubicación es fundamental. Busca espacios que:
- Sean accesibles en transporte público
- Estén cerca de cafeterías y restaurantes
- Tengan estacionamiento disponible
- Se encuentren en zonas seguras

## Amenidades y Servicios

Verifica que el espacio ofrezca:
- Internet de alta velocidad y confiable
- Salas de reuniones reservables
- Áreas de descanso y cocina
- Impresoras y equipos de oficina
- Servicio de café y snacks

## Comunidad y Ambiente

El ambiente del coworking es crucial:
- Observa la energía del lugar
- Conoce a otros miembros
- Verifica eventos de networking
- Evalúa el nivel de ruido

## Flexibilidad de Membresías

Busca opciones que se adapten a ti:
- Membresías por día, semana o mes
- Posibilidad de cambiar de plan
- Acceso 24/7 si lo necesitas
- Opciones de upgrade

## Precio y Valor

Compara no solo precios, sino valor:
- Servicios incluidos vs. adicionales
- Relación costo-beneficio
- Descuentos por contratos largos
- Costos ocultos a considerar

## Visita Antes de Decidir

Nunca reserves sin visitar primero:
- Solicita un tour guiado
- Prueba un día gratis si es posible
- Habla con miembros actuales
- Verifica las instalaciones personalmente

## Conclusión

El espacio de coworking perfecto es diferente para cada persona. Toma tu tiempo para evaluar opciones y encontrar el lugar que realmente impulse tu trabajo.
    `,
    author: "Carlos Ramírez",
    category: "Coworking",
    image: "🏢",
    keywords: ["coworking", "oficinas", "espacios de trabajo", "guía"],
    readTime: "7 min",
    published: true,
    publishedAt: new Date()
  },
  {
    title: "Ahorra Dinero: Coworking vs. Oficina Tradicional",
    slug: "ahorro-coworking-vs-oficina-tradicional",
    excerpt: "Análisis detallado de costos que demuestra cómo el coworking puede ahorrarte hasta un 60% comparado con una oficina tradicional.",
    content: `
# Ahorra Dinero: Coworking vs. Oficina Tradicional

Para muchas empresas y emprendedores, el coworking representa una alternativa significativamente más económica que una oficina tradicional. Veamos los números.

## Costos de una Oficina Tradicional

Una oficina tradicional implica:

### Costos Iniciales
- Depósito de garantía (2-3 meses de renta)
- Mobiliario y equipamiento
- Instalación de internet y telefonía
- Decoración y acondicionamiento

### Costos Mensuales Recurrentes
- Renta del espacio
- Servicios públicos (luz, agua, gas)
- Internet y telefonía
- Servicio de limpieza
- Mantenimiento
- Seguridad
- Café y suministros

### Total Estimado
Para una oficina pequeña: $2,500,000 - $4,000,000 COP mensuales

## Costos de Coworking

El coworking incluye todo en un solo pago:

### Membresía Todo Incluido
- Escritorio o oficina privada
- Internet de alta velocidad
- Salas de reuniones
- Café y snacks
- Limpieza diaria
- Servicios públicos
- Recepción y correo

### Total Estimado
Desde $400,000 COP mensuales por hot desk

## Comparación de Ahorros

| Concepto | Oficina Tradicional | Coworking | Ahorro |
|----------|-------------------|-----------|---------|
| Costo Mensual | $3,000,000 | $1,200,000 | 60% |
| Inversión Inicial | $10,000,000 | $0 | 100% |
| Flexibilidad | Baja | Alta | Máxima |

## Ahorro Anual

Con coworking ahorras aproximadamente:
- $21,600,000 COP al año en costos operativos
- $10,000,000 COP en inversión inicial
- **Total: $31,600,000 COP en el primer año**

## Beneficios Adicionales No Monetarios

Más allá del dinero, ganas:
- Flexibilidad para escalar
- Networking con otros profesionales
- Servicios premium incluidos
- Sin compromisos a largo plazo
- Ubicaciones estratégicas

## ¿Para Quién es Mejor el Coworking?

El coworking es ideal para:
- Startups y emprendedores
- Equipos remotos pequeños (1-10 personas)
- Freelancers y consultores
- Empresas que buscan presencia en nuevas ciudades
- Negocios con necesidades fluctuantes de espacio

## Conclusión

El coworking no solo es más económico, sino que ofrece flexibilidad y servicios que una oficina tradicional no puede igualar. Para muchos negocios modernos, es la opción inteligente.
    `,
    author: "Ana Martínez",
    category: "Ahorro",
    image: "💰",
    keywords: ["ahorro", "coworking", "costos", "oficina", "emprendimiento"],
    readTime: "8 min",
    published: true,
    publishedAt: new Date()
  },
  {
    title: "10 Tips para Ser Más Productivo en un Coworking",
    slug: "tips-productividad-coworking",
    excerpt: "Estrategias prácticas para maximizar tu productividad y aprovechar al máximo tu membresía de coworking.",
    content: `
# 10 Tips para Ser Más Productivo en un Coworking

Los espacios de coworking ofrecen un ambiente ideal para trabajar, pero requieren ciertas estrategias para maximizar tu productividad.

## 1. Establece una Rutina Matutina

Llega a la misma hora cada día. Esto ayuda a tu cerebro a entrar en "modo trabajo" automáticamente.

## 2. Elige tu Zona de Trabajo Estratégicamente

- Cerca de las ventanas para luz natural
- Lejos de áreas de mucho tráfico
- Con buena ventilación
- Nivel de ruido apropiado para tu trabajo

## 3. Usa Auriculares (Incluso sin Música)

Los auriculares son una señal universal de "no molestar" en espacios de coworking.

## 4. Reserva Salas de Reuniones con Anticipación

Para llamadas importantes o trabajo que requiere concentración absoluta, reserva una sala privada.

## 5. Toma Breaks Estratégicos

- Levántate cada hora
- Usa las áreas de descanso
- Socializa durante los breaks (no durante trabajo)
- Sal a caminar al mediodía

## 6. Participa en Eventos de Networking

Asiste a eventos del coworking, pero solo cuando tengas tiempo. No sacrifiques deadlines por socializar.

## 7. Mantén tu Espacio Organizado

Un escritorio limpio = mente clara. Usa lockers para guardar tus cosas.

## 8. Establece Límites Claros

Aprende a decir "no" educadamente cuando estés en deep work. Los compañeros de coworking lo entenderán.

## 9. Usa Técnicas de Productividad

- Pomodoro (25 min trabajo, 5 min descanso)
- Time blocking en tu calendario
- Lista de tareas priorizadas
- Elimina distracciones digitales

## 10. Aprovecha los Servicios Premium

Si tu coworking ofrece:
- Café gratis → úsalo para mantenerte alerta
- Impresora → imprime materiales importantes
- Sala de eventos → organiza workshops

## Errores Comunes a Evitar

- Llegar sin plan de trabajo
- Socializar demasiado
- No reservar salas cuando las necesitas
- Trabajar desde lugares incómodos
- Ignorar la comunidad completamente

## Conclusión

La productividad en un coworking es un balance entre aprovechar la energía comunitaria y mantener el enfoque en tus objetivos. Con estos tips, maximizarás tu inversión.
    `,
    author: "Laura Sánchez",
    category: "Productividad",
    image: "⚡",
    keywords: ["productividad", "coworking", "trabajo remoto", "tips", "eficiencia"],
    readTime: "6 min",
    published: true,
    publishedAt: new Date()
  }
];

async function seedBlog() {
  try {
    // Conectar a MongoDB
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar colección existente (opcional)
    console.log('\nLimpiando artículos existentes...');
    await BlogPost.deleteMany({});
    console.log('✅ Artículos existentes eliminados');

    // Insertar artículos de ejemplo
    console.log('\nInsertando artículos de ejemplo...');
    const result = await BlogPost.insertMany(samplePosts);
    console.log(`✅ ${result.length} artículos insertados exitosamente`);

    // Mostrar resumen
    console.log('\n📊 Resumen de artículos creados:');
    result.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   - Slug: ${post.slug}`);
      console.log(`   - Categoría: ${post.category}`);
      console.log(`   - Publicado: ${post.published ? 'Sí' : 'No'}`);
      console.log('');
    });

    console.log('🎉 ¡Seed de blog completado exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar blog:', error);
    process.exit(1);
  }
}

seedBlog();
