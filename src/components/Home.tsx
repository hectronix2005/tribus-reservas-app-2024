import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, Users, Calendar, Clock, MapPin, ArrowRight, Check, Star, Mail, FileText, X } from 'lucide-react';
import { blogService } from '../services/api';
import { BlogPost } from '../types';
import ReactMarkdown from 'react-markdown';

interface HomeProps {
  onLoginClick: () => void;
  onContactClick?: () => void;
}

interface Space {
  name: string;
  capacity: string;
  priceFrom: string;
  features: string[];
  image: string;
}

interface Feature {
  icon: any;
  title: string;
  description: string;
}

export const Home: React.FC<HomeProps> = ({ onLoginClick, onContactClick }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [features, setFeatures] = useState<Feature[]>([
    {
      icon: Building2,
      title: "Espacios Flexibles",
      description: "Salas de reuniones, hot desks y espacios colaborativos adaptados a tus necesidades"
    },
    {
      icon: Calendar,
      title: "Reserva Inteligente",
      description: "Sistema de reservas en tiempo real con disponibilidad instantánea"
    },
    {
      icon: Users,
      title: "Colaboración",
      description: "Gestiona equipos y colaboradores fácilmente en cada reserva"
    },
    {
      icon: Clock,
      title: "Horario de Oficina",
      description: "Acceso flexible cuando lo necesites, adaptado a tu horario"
    }
  ]);
  const [spaces, setSpaces] = useState<Space[]>([
    {
      name: "Salas de Reuniones",
      capacity: "4-12 personas",
      priceFrom: "$80,000/mes",
      features: ["Pantalla 4K", "Videoconferencia", "Video Beam"],
      image: "🏢"
    },
    {
      name: "Hot Desk",
      capacity: "1-8 puestos",
      priceFrom: "$50,000/mes",
      features: ["Escritorio Ergonómico", "WiFi Alta Velocidad", "Zonas Abiertas"],
      image: "💼"
    },
    {
      name: "Espacios Colaborativos",
      capacity: "6-20 personas",
      priceFrom: "$120,000/mes",
      features: ["Mobiliario Flexible", "Zonas de Descanso", "Cafetería"],
      image: "👥"
    }
  ]);

  // Cargar configuración dinámica desde el backend
  useEffect(() => {
    const loadCoworkingSettings = async () => {
      try {
        console.log('🔄 Cargando configuración de coworking desde el backend...');
        const response = await fetch('/api/coworking-settings');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const settings = await response.json();
        console.log('📦 Configuración recibida del backend:', settings);

        // IMPORTANTE: Mapeo de iconos de string a componentes Lucide
        const iconMap: { [key: string]: any } = {
          'Building2': Building2,
          'Calendar': Calendar,
          'Users': Users,
          'Clock': Clock,
          'MapPin': MapPin,
          'Star': Star,
          'Check': Check,
          'Mail': Mail,
          'FileText': FileText,
          'ArrowRight': ArrowRight
        };

        // Cargar FEATURES desde el backend
        if (settings.homeContent?.features && Array.isArray(settings.homeContent.features) && settings.homeContent.features.length > 0) {
          const updatedFeatures: Feature[] = settings.homeContent.features.map((feature: any) => ({
            icon: iconMap[feature.icon] || Clock, // Fallback a Clock si el icono no existe
            title: feature.title || "Característica",
            description: feature.description || "Descripción"
          }));

          setFeatures(updatedFeatures);
          console.log('✅ Features cargadas desde configuración:', updatedFeatures.map(f => f.title));
        } else {
          console.warn('⚠️ No se encontraron features en la configuración del backend, usando valores por defecto');
        }

        // Cargar ESPACIOS desde el backend
        if (settings.homeContent?.spaces && Array.isArray(settings.homeContent.spaces) && settings.homeContent.spaces.length > 0) {
          const updatedSpaces: Space[] = settings.homeContent.spaces.map((space: any) => ({
            name: space.name || "Espacio",
            capacity: space.capacity || "1-10 personas",
            priceFrom: space.priceFrom || "$50,000/mes",
            features: space.features || [],
            image: space.image || "🏢"
          }));

          setSpaces(updatedSpaces);
          console.log('✅ Espacios cargados desde configuración:', updatedSpaces.map(s => s.name));
        } else {
          console.warn('⚠️ No se encontraron espacios en la configuración del backend, usando valores por defecto');
        }
      } catch (error) {
        console.error('❌ Error cargando configuración de coworking:', error);
        console.error('Detalles del error:', error instanceof Error ? error.message : 'Error desconocido');
        // Mantener valores por defecto en caso de error
      }
    };

    loadCoworkingSettings();
  }, []);

  // Cargar posts del blog publicados
  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        const posts = await blogService.getPublished();
        // Mostrar solo los últimos 3 posts
        setBlogPosts(posts.slice(0, 3));
      } catch (error) {
        console.error('Error cargando posts del blog:', error);
        // No mostrar error al usuario, simplemente no mostrar blog
      }
    };

    loadBlogPosts();
  }, []);

  const benefits = [
    "Sin compromisos a largo plazo",
    "Facturación transparente",
    "Soporte técnico incluido",
    "Ubicaciones estratégicas",
    "Networking empresarial",
    "Servicios de recepción"
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://tribus-76fa5345672e.herokuapp.com/#organization",
    "name": "Tribus Coworking",
    "description": "Alquiler de oficinas por horas y días en Colombia. Espacios de coworking, salas de reuniones y hot desks. Reservas online fáciles y rápidas con flexibilidad total para tu equipo.",
    "url": "https://tribus-76fa5345672e.herokuapp.com/",
    "logo": "https://tribus-76fa5345672e.herokuapp.com/logo192.png",
    "image": "https://tribus-76fa5345672e.herokuapp.com/og-image.jpg",
    "priceRange": "$$",
    "telephone": "+57-xxx-xxx-xxxx",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "CO",
      "addressRegion": "Bogotá",
      "addressLocality": "Colombia"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "addressCountry": "CO"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      }
    ],
    "areaServed": {
      "@type": "Country",
      "name": "Colombia"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Servicios de Espacios de Trabajo",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Alquiler de Oficinas por Horas",
            "description": "Oficinas privadas por horas o días completos en Colombia, totalmente equipadas y listas para usar con internet de alta velocidad"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Espacios de Coworking Colombia",
            "description": "Espacios compartidos flexibles para trabajar y colaborar con otros profesionales y emprendedores"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Salas de Reuniones Bogotá",
            "description": "Salas equipadas con videoconferencia para reuniones profesionales, disponibles por horas"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Hot Desk Colombia",
            "description": "Puestos de trabajo flexibles sin asignación fija, ideales para trabajadores remotos y nómadas digitales"
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127"
    },
    "sameAs": []
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Alquiler de Oficinas por Horas y Coworking en Colombia | Tribus</title>
        <meta name="description" content="Alquiler de oficinas por horas y días en Colombia. Espacios de coworking, salas de reuniones y hot desks en Bogotá. Reserva online con flexibilidad total. Desde $50.000/mes." />
        <meta name="keywords" content="alquiler oficinas colombia, coworking bogota, espacios compartidos, salas reuniones, hot desk colombia, oficina por horas bogota, alquiler oficina temporal, espacio trabajo flexible, coworking colombia precios, oficina compartida bogota" />

        {/* Open Graph adicional para mejor sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Alquiler de Oficinas por Horas y Coworking | Tribus Colombia" />
        <meta property="og:description" content="Espacios de trabajo flexibles en Colombia. Alquiler de oficinas, coworking y salas de reuniones por horas. Reserva online fácil." />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Header/Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Tribus
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-indigo-600 transition">Características</a>
              <a href="#spaces" className="text-gray-700 hover:text-indigo-600 transition">Espacios</a>
              <a href="#benefits" className="text-gray-700 hover:text-indigo-600 transition">Beneficios</a>
              {blogPosts.length > 0 && (
                <a href="#blog" className="text-gray-700 hover:text-indigo-600 transition">Blog</a>
              )}
              {onContactClick && (
                <button
                  onClick={onContactClick}
                  className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-full hover:bg-indigo-50 transition flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contacto
                </button>
              )}
              <button
                onClick={onLoginClick}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition"
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 md:mb-6">
              Alquiler de Oficinas y Espacios de Coworking en Colombia
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-6 md:mb-8">
              Alquiler de oficinas por horas y días. Reserva salas de reuniones, hot desks y espacios de coworking compartidos. Sistema de reservas online fácil y rápido con flexibilidad total para tu equipo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={onLoginClick}
                className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl transform hover:-translate-y-1 transition flex items-center justify-center"
              >
                Empezar Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-gray-700 rounded-full font-semibold hover:shadow-lg transform hover:-translate-y-1 transition border-2 border-gray-200">
                Ver Demo
              </button>
            </div>
            <div className="mt-8 md:mt-12 grid grid-cols-3 gap-4 sm:flex sm:items-center sm:justify-center sm:space-x-8 md:space-x-12">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600">500+</div>
                <div className="text-xs sm:text-sm text-gray-600">Reservas Activas</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">98%</div>
                <div className="text-xs sm:text-sm text-gray-600">Satisfacción</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-pink-600">24/7</div>
                <div className="text-xs sm:text-sm text-gray-600">Disponibilidad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Características de Nuestros Espacios de Coworking y Oficinas
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Espacios de trabajo flexibles equipados con todo lo necesario para tu equipo. Alquiler de oficinas por horas con sistema de reservas online, salas de reuniones profesionales y hot desks compartidos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setActiveFeature(index)}
                  className={`p-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                    activeFeature === index
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl transform -translate-y-2'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-12 w-12 mb-4 ${activeFeature === index ? 'text-white' : 'text-indigo-600'}`} />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className={`${activeFeature === index ? 'text-indigo-100' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Spaces Section */}
      <section id="spaces" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Alquiler de Oficinas Privadas, Salas de Reuniones y Hot Desks
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Espacios de coworking flexibles para alquilar por horas o días. Oficinas compartidas, salas de reuniones equipadas y puestos de trabajo hot desk con todas las comodidades.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {spaces.map((space: any, index: number) => (
              <div
                key={index}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-6xl">
                  {space.image}
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{space.name}</h3>
                  <div className="flex items-center justify-between text-gray-600 mb-2">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span className="text-sm">{space.capacity}</span>
                    </div>
                    {space.priceFrom && (
                      <div className="text-sm font-semibold text-indigo-600">
                        Desde {space.priceFrom}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 my-4"></div>
                  <ul className="space-y-2">
                    {space.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    Ver Disponibilidad
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
                ¿Por qué elegir Tribus?
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-6 md:mb-8">
                Más que un espacio de trabajo, una experiencia completa diseñada para impulsar tu productividad
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {benefits.map((benefit: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <Star className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 md:p-8 text-white mt-8 lg:mt-0">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Comienza hoy mismo</h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="h-6 w-6 mr-3 flex-shrink-0" />
                  <span>Registro rápido y sencillo en menos de 2 minutos</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 mr-3 flex-shrink-0" />
                  <span>Acceso inmediato a todos nuestros espacios</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 mr-3 flex-shrink-0" />
                  <span>Sin costos ocultos ni compromisos permanentes</span>
                </li>
              </ul>
              <button
                onClick={onContactClick}
                className="w-full px-6 py-3 sm:px-8 sm:py-4 bg-white text-indigo-600 rounded-full font-semibold hover:shadow-xl transform hover:-translate-y-1 transition"
              >
                Contactar Asesor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      {blogPosts.length > 0 && (
        <section id="blog" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                Blog y Recursos
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-gray-600">
                Consejos, tendencias y mejores prácticas para tu espacio de trabajo
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {blogPosts.map((post) => (
                <article key={post._id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="p-4 md:p-6 lg:p-8">
                    <div className="text-6xl mb-4">{post.image}</div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-semibold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-gray-600 mb-6 line-clamp-3">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Por {post.author}
                      </span>
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 group"
                      >
                        Leer más
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {blogPosts.length >= 3 && (
              <div className="text-center mt-12">
                <button className="px-8 py-3 border-2 border-indigo-600 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all duration-300 font-semibold flex items-center gap-2 mx-auto">
                  <FileText className="w-5 h-5" />
                  Ver todos los artículos
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ Section for SEO */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
              Preguntas Frecuentes sobre Alquiler de Oficinas y Coworking
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600">
              Todo lo que necesitas saber sobre nuestros espacios de trabajo compartido
            </p>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                ¿Cuánto cuesta el alquiler de oficinas por horas en Colombia?
              </h3>
              <p className="text-gray-600">
                Los precios de alquiler de oficinas varían según el tipo de espacio y la duración. Nuestros espacios de coworking comienzan desde $50,000/mes para hot desks, mientras que las salas de reuniones están disponibles desde $150,000/hora. El alquiler de oficinas privadas se cotiza por día u hora según tus necesidades.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ¿Qué incluye el alquiler de espacios de coworking?
              </h3>
              <p className="text-gray-600">
                Todos nuestros espacios de coworking incluyen internet de alta velocidad, escritorios ergonómicos, sillas cómodas, salas de reuniones (según disponibilidad), café y té ilimitado, limpieza diaria y acceso a impresora/escáner. Las oficinas privadas también incluyen mobiliario completo y privacidad total.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ¿Cómo funciona el sistema de reservas online?
              </h3>
              <p className="text-gray-600">
                El sistema de reservas es muy sencillo: creas tu cuenta, seleccionas el espacio que necesitas (sala de reuniones, hot desk u oficina privada), escoges el día y horario, y confirmas tu reserva. Recibirás una confirmación por email inmediatamente. Puedes reservar con anticipación o el mismo día según disponibilidad.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ¿Qué es un hot desk y cuándo debería usarlo?
              </h3>
              <p className="text-gray-600">
                Un hot desk es un puesto de trabajo flexible sin asignación fija, ideal para trabajadores remotos, freelancers y nómadas digitales. Es perfecto si necesitas un espacio profesional ocasionalmente o prefieres la flexibilidad de trabajar en diferentes ubicaciones. Es la opción más económica de coworking.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ¿Puedo alquilar una oficina por solo unas horas?
              </h3>
              <p className="text-gray-600">
                Sí, ofrecemos alquiler de oficinas por horas con total flexibilidad. Puedes reservar salas de reuniones por 1 hora o más, y oficinas privadas por medio día o día completo. No hay contratos de largo plazo ni compromisos permanentes. Pagas solo por el tiempo que necesitas usar el espacio.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ¿Dónde están ubicados sus espacios de coworking en Colombia?
              </h3>
              <p className="text-gray-600">
                Actualmente tenemos espacios de coworking en ubicaciones estratégicas de Colombia. Todos nuestros espacios cuentan con excelente acceso a transporte público, estacionamiento cercano y están en zonas empresariales seguras. Consulta las ubicaciones específicas al momento de hacer tu reserva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
            ¿Listo para transformar tu forma de trabajar?
          </h2>
          <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-indigo-100">
            Únete a cientos de equipos que ya confían en Tribus para gestionar sus espacios
          </p>
          <button
            onClick={onLoginClick}
            className="px-8 py-3 sm:px-12 sm:py-4 bg-white text-indigo-600 rounded-full font-semibold text-base md:text-lg hover:shadow-2xl transform hover:-translate-y-1 transition"
          >
            Empezar Gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-6 w-6 text-indigo-400" />
                <span className="text-xl font-bold text-white">Tribus</span>
              </div>
              <p className="text-sm">
                Espacios de trabajo flexibles para equipos modernos
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Características</a></li>
                <li><a href="#" className="hover:text-white transition">Espacios</a></li>
                <li><a href="#" className="hover:text-white transition">Precios</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Compañía</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Sobre Nosotros</a></li>
                <li>
                  {onContactClick ? (
                    <button onClick={onContactClick} className="hover:text-white transition">Contacto</button>
                  ) : (
                    <a href="#" className="hover:text-white transition">Contacto</a>
                  )}
                </li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition">Términos</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            <p>&copy; 2025 Tribus. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Modal del artículo del blog */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedPost.image}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPost.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-semibold px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                      {selectedPost.category}
                    </span>
                    <span className="text-sm text-gray-500">Por {selectedPost.author}</span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedPost.readTime}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-8">
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
              </div>

              {selectedPost.keywords && selectedPost.keywords.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Palabras clave</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
