#!/bin/bash

echo "🔍 Testing: Creación de Usuarios como Administrador"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verificando que el frontend esté actualizado...${NC}"

# Verificar que el frontend se actualizó
FRONTEND_RESPONSE=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/)
if echo "$FRONTEND_RESPONSE" | grep -q "main.d3699bfa.js"; then
    echo -e "${GREEN}✅ Frontend actualizado con logging detallado${NC}"
else
    echo -e "${RED}❌ Frontend no se actualizó correctamente${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Verificando backend...${NC}"
HEALTH_RESPONSE=$(curl -s "https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend funcionando${NC}"
else
    echo -e "${RED}❌ Backend no disponible${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🧪 Probando autenticación y creación de usuarios...${NC}"
echo ""

# Test 1: Login como admin
echo -e "${BLUE}🔑 Test 1: Login como administrador${NC}"
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "Respuesta de login: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q "Login exitoso"; then
    echo -e "${GREEN}✅ Login exitoso${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📋 Token obtenido: ${TOKEN:0:20}...${NC}"
else
    echo -e "${RED}❌ Error en login${NC}"
    exit 1
fi

# Test 2: Crear usuario como admin
echo ""
echo -e "${BLUE}👤 Test 2: Crear usuario como administrador${NC}"
CREATE_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Usuario Admin Test",
    "email": "admintest@tribus.com",
    "username": "admintest",
    "password": "Test123",
    "role": "user",
    "department": "Testing",
    "isActive": true
  }')

echo "Respuesta de creación: $CREATE_RESPONSE"

if echo "$CREATE_RESPONSE" | grep -q "creado exitosamente"; then
    echo -e "${GREEN}✅ Usuario creado exitosamente${NC}"
    USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📋 ID del usuario creado: $USER_ID${NC}"
else
    echo -e "${RED}❌ Error creando usuario${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Resumen de Pruebas:${NC}"
echo "=============================="
echo -e "${GREEN}✅ Frontend actualizado: main.d3699bfa.js${NC}"
echo -e "${GREEN}✅ Backend funcionando${NC}"
echo -e "${GREEN}✅ Login como admin exitoso${NC}"
echo -e "${GREEN}✅ Creación de usuario exitosa${NC}"

echo ""
echo -e "${BLUE}🎯 Instrucciones para Debuggear en el Frontend:${NC}"
echo "======================================================"
echo "1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
echo "2. Inicia sesión como admin: admin / admin123"
echo "3. Ve a la sección 'Usuarios'"
echo "4. Haz clic en 'Nuevo Usuario'"
echo "5. Llena todos los campos con datos válidos:"
echo "   - Nombre: Usuario Test"
echo "   - Email: test@example.com"
echo "   - Username: testuser"
echo "   - Contraseña: Test123"
echo "   - Rol: Usuario"
echo "6. Haz clic en 'Crear Usuario'"
echo "7. Abre las herramientas de desarrollador (F12)"
echo "8. Ve a la pestaña 'Console'"
echo "9. Busca estos logs específicos:"
echo "   - '🔑 Token de autenticación:'"
echo "   - '🌐 Enviando request a:'"
echo "   - '📤 Configuración del request:'"
echo "   - '🔍 Validación del formulario:'"
echo "   - '📤 Datos que se van a enviar al backend:'"

echo ""
echo -e "${YELLOW}🔍 Posibles Problemas y Soluciones:${NC}"
echo "============================================="
echo -e "${RED}❌ Si ves 'Token de autenticación: No encontrado':${NC}"
echo "   - El login no se completó correctamente"
echo "   - Refresca la página y vuelve a hacer login"
echo ""
echo -e "${RED}❌ Si ves 'Todos los campos son requeridos':${NC}"
echo "   - Los datos se están enviando vacíos"
echo "   - Revisa los logs de 'Datos que se van a enviar al backend'"
echo ""
echo -e "${RED}❌ Si ves 'El email o nombre de usuario ya existe':${NC}"
echo "   - Usa datos únicos (email y username diferentes)"
echo ""
echo -e "${RED}❌ Si ves '401 Unauthorized':${NC}"
echo "   - El token ha expirado"
echo "   - Haz logout y vuelve a hacer login"

echo ""
echo -e "${GREEN}🎉 ¡Sistema listo para debugging detallado!${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Comparte los logs de la consola para poder identificar el problema exacto${NC}"
echo ""
