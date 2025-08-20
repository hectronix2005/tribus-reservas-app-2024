#!/bin/bash

echo "🔍 Debugging: Creación de Usuarios"
echo "=================================="
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
if echo "$FRONTEND_RESPONSE" | grep -q "main.c4c093d4.js"; then
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
echo -e "${YELLOW}🧪 Probando diferentes escenarios...${NC}"
echo ""

# Obtener token de admin
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test 1: Datos completos y válidos
echo -e "${BLUE}✅ Test 1: Datos completos y válidos${NC}"
VALID_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Usuario Debug Test",
    "email": "debugtest@tribus.com",
    "username": "debugtest",
    "password": "Test123",
    "role": "user",
    "department": "Testing",
    "isActive": true
  }')

echo "Respuesta: $VALID_RESPONSE"

if echo "$VALID_RESPONSE" | grep -q "creado exitosamente"; then
    echo -e "${GREEN}✅ Usuario creado exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando usuario válido${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Instrucciones para Debuggear en el Frontend:${NC}"
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
echo "9. Busca los logs que empiecen con:"
echo "   - '🔍 Validación del formulario:'"
echo "   - '📤 Datos que se van a enviar al backend:'"
echo "   - '🔍 Validación de datos antes del envío:'"
echo "10. Esto te mostrará exactamente qué datos se están enviando"

echo ""
echo -e "${YELLOW}🔍 Posibles Problemas:${NC}"
echo "=============================="
echo -e "${RED}❌ Si ves 'Todos los campos son requeridos':${NC}"
echo "   - Los datos se están enviando vacíos al backend"
echo "   - Revisa los logs para ver qué se está enviando"
echo ""
echo -e "${RED}❌ Si ves 'El email o nombre de usuario ya existe':${NC}"
echo "   - Usa datos únicos (email y username diferentes)"
echo ""
echo -e "${RED}❌ Si no ves logs en la consola:${NC}"
echo "   - Refresca la página (Ctrl+F5)"
echo "   - Verifica que estés en la versión correcta"

echo ""
echo -e "${GREEN}🎉 ¡Sistema listo para debugging!${NC}"
echo ""
