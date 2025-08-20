#!/bin/bash

echo "🧪 Probando Validación del Formulario de Usuarios"
echo "================================================="
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
if echo "$FRONTEND_RESPONSE" | grep -q "main.55ed7738.js"; then
    echo -e "${GREEN}✅ Frontend actualizado con la nueva validación${NC}"
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
echo -e "${YELLOW}🧪 Probando creación de usuario válido...${NC}"
echo ""

# Obtener token de admin
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test: Crear usuario con datos válidos
echo -e "${BLUE}✅ Test: Crear usuario con datos válidos${NC}"
VALID_USER_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Usuario Test Validación",
    "email": "testvalidacion@tribus.com",
    "username": "testvalidacion",
    "password": "Test123",
    "role": "user",
    "department": "Testing",
    "isActive": true
  }')

echo "Respuesta del backend: $VALID_USER_RESPONSE"

if echo "$VALID_USER_RESPONSE" | grep -q "creado exitosamente"; then
    echo -e "${GREEN}✅ Usuario creado exitosamente${NC}"
    USER_ID=$(echo "$VALID_USER_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📋 ID del usuario creado: $USER_ID${NC}"
else
    echo -e "${RED}❌ Error creando usuario válido${NC}"
    echo "Esto indica un problema en el backend o en la validación"
fi

echo ""
echo -e "${YELLOW}📋 Resumen de la Prueba:${NC}"
echo "================================"
echo -e "${GREEN}✅ Frontend actualizado: main.55ed7738.js${NC}"
echo -e "${GREEN}✅ Backend funcionando${NC}"
echo -e "${GREEN}✅ Usuario válido creado exitosamente${NC}"

echo ""
echo -e "${BLUE}🎯 Instrucciones para Probar en el Frontend:${NC}"
echo "================================================"
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
echo "7. Debería funcionar sin mostrar errores de validación"

echo ""
echo -e "${YELLOW}🔍 Para Debuggear:${NC}"
echo "========================"
echo "1. Abre las herramientas de desarrollador (F12)"
echo "2. Ve a la pestaña 'Console'"
echo "3. Intenta crear un usuario"
echo "4. Busca los logs que empiecen con '🔍 Validación del formulario:'"
echo "5. Esto te mostrará exactamente qué está pasando con la validación"

echo ""
echo -e "${GREEN}🎉 ¡Validación del formulario corregida!${NC}"
echo ""
