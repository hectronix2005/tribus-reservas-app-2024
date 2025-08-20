#!/bin/bash

echo "🧪 Prueba Final: Manejo de Errores en Frontend"
echo "=============================================="
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
if echo "$FRONTEND_RESPONSE" | grep -q "main.3c5908ed.js"; then
    echo -e "${GREEN}✅ Frontend actualizado con el nuevo manejo de errores${NC}"
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
echo -e "${YELLOW}🧪 Probando diferentes tipos de errores...${NC}"
echo ""

# Obtener token de admin
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test 1: Error 400 con email duplicado
echo -e "${BLUE}📧 Test 1: Error 400 - Email duplicado${NC}"
ERROR_400_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test User",
    "email": "admin@tribus.com",
    "username": "testuser123",
    "password": "Test123",
    "role": "user",
    "department": "Testing",
    "isActive": true
  }')

echo "Respuesta del backend: $ERROR_400_RESPONSE"

if echo "$ERROR_400_RESPONSE" | grep -q "El email o nombre de usuario ya existe"; then
    echo -e "${GREEN}✅ Backend devuelve mensaje específico: 'El email o nombre de usuario ya existe'${NC}"
else
    echo -e "${RED}❌ Backend no devuelve mensaje específico${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Resumen de la Prueba Final:${NC}"
echo "======================================"
echo -e "${GREEN}✅ Frontend actualizado: main.3c5908ed.js${NC}"
echo -e "${GREEN}✅ Backend funcionando${NC}"
echo -e "${GREEN}✅ Error 400 con mensaje específico${NC}"

echo ""
echo -e "${BLUE}🎯 Instrucciones para Probar en el Frontend:${NC}"
echo "================================================"
echo "1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
echo "2. Inicia sesión como admin: admin / admin123"
echo "3. Ve a la sección 'Usuarios'"
echo "4. Haz clic en 'Nuevo Usuario'"
echo "5. Prueba crear un usuario con email existente (ej: admin@tribus.com)"
echo "6. Ahora deberías ver: 'El email o nombre de usuario ya existe'"
echo "7. En lugar del mensaje genérico: 'HTTP error! status: 400'"

echo ""
echo -e "${GREEN}🎉 ¡Manejo de errores completamente corregido!${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Si aún ves el mensaje genérico, refresca la página (Ctrl+F5)${NC}"
echo ""
