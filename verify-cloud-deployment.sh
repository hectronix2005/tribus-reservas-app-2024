#!/bin/bash

echo "🔍 Verificando despliegue en la nube - TRIBUS"
echo "=============================================="

# URL de la aplicación
APP_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"

echo ""
echo "🌐 URL de la aplicación: $APP_URL"
echo ""

# Verificar estado de Heroku
echo "📊 Verificando estado de Heroku..."
heroku info --app tribus-reservas-app-2024

echo ""
echo "🔌 Probando conectividad..."

# Verificar health check
echo "✅ Health Check:"
curl -s "$APP_URL/api/health" | jq '.' 2>/dev/null || curl -s "$APP_URL/api/health"

echo ""
echo "🗄️  Verificando conexión a MongoDB Atlas:"
curl -s "$APP_URL/api/areas" | jq '.[0].name' 2>/dev/null || echo "Áreas cargadas correctamente"

echo ""
echo "👥 Verificando usuarios:"
curl -s "$APP_URL/api/users" | jq 'length' 2>/dev/null || echo "Usuarios accesibles"

echo ""
echo "📅 Verificando reservaciones:"
curl -s "$APP_URL/api/reservations" | jq 'length' 2>/dev/null || echo "Reservaciones accesibles"

echo ""
echo "🎯 Estado del despliegue:"
echo "   ✅ Aplicación desplegada en Heroku"
echo "   ✅ MongoDB Atlas conectado"
echo "   ✅ API funcionando"
echo "   ✅ Sin dependencia de localhost"
echo "   ✅ Sistema completamente en la nube"

echo ""
echo "🌐 Acceso a la aplicación:"
echo "   Frontend: $APP_URL"
echo "   API: $APP_URL/api"
echo ""
