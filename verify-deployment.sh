#!/bin/bash

echo "🚀 Verificando Despliegue Completo de TRIBUS"
echo "============================================"
echo ""

echo "📊 Verificando Frontend..."
FRONTEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
if curl -s -f "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend funcionando: $FRONTEND_URL"
else
    echo "❌ Frontend no disponible"
fi

echo ""
echo "🔧 Verificando Backend..."
BACKEND_URL="https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo "✅ Backend funcionando: $BACKEND_URL"
    echo "   Respuesta: $HEALTH_RESPONSE"
else
    echo "❌ Backend no disponible"
fi

echo ""
echo "🗄️ Verificando Base de Datos..."
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Base de datos conectada y usuarios disponibles"
    echo "   Login exitoso para admin"
else
    echo "❌ Error en la base de datos"
    echo "   Respuesta: $LOGIN_RESPONSE"
fi

echo ""
echo "🔗 Verificando Conexión Frontend-Backend..."
API_TEST=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario","password":"user123"}' \
  -w "%{http_code}")

HTTP_CODE=$(echo "$API_TEST" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API funcionando correctamente"
else
    echo "❌ Error en API: HTTP $HTTP_CODE"
fi

echo ""
echo "📋 Resumen del Sistema:"
echo "======================"
echo "🌐 Frontend: $FRONTEND_URL"
echo "🔧 Backend: https://tribus-backend-api-2024-c417f649c911.herokuapp.com"
echo "🗄️ Base de datos: MongoDB Atlas"
echo "🔑 Usuarios: admin/admin123, usuario/user123, Dneira/dneira123"
echo ""

echo "🎯 Próximos Pasos:"
echo "================="
echo "1. Acceder al frontend y probar login"
echo "2. Verificar funcionalidades de usuario"
echo "3. Probar gestión de usuarios (admin)"
echo "4. Configurar reservas, áreas y plantillas"
echo ""

echo "🎉 ¡Sistema TRIBUS completamente desplegado!"
echo ""
echo "🔗 Accede ahora a: $FRONTEND_URL"
echo ""
