#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DEL SISTEMA COMPLETO SIN LOCALSTORAGE${NC}"
echo "=================================================="
echo ""

# URL del backend
BACKEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api"

echo -e "${BLUE}1️⃣ Verificando salud del backend...${NC}"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
echo "Respuesta: $HEALTH_RESPONSE"
echo ""

echo -e "${BLUE}2️⃣ Probando creación de usuario sin autenticación...${NC}"
USER_DATA='{
  "name": "Usuario Test Sistema",
  "email": "test.sistema@example.com",
  "username": "testsistema",
  "password": "Test123!",
  "role": "user",
  "department": "Testing",
  "isActive": true
}'

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/register" \
  -H "Content-Type: application/json" \
  -d "$USER_DATA")

echo "Respuesta: $CREATE_RESPONSE"
echo ""

echo -e "${BLUE}3️⃣ Probando login con el usuario creado...${NC}"
LOGIN_DATA='{
  "username": "testsistema",
  "password": "Test123!"
}'

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

echo "Respuesta: $LOGIN_RESPONSE"
echo ""

echo -e "${BLUE}4️⃣ Extrayendo token del login...${NC}"
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Token extraído: ${TOKEN:0:20}...${NC}"
else
  echo -e "${RED}❌ No se pudo extraer el token${NC}"
fi
echo ""

echo -e "${BLUE}5️⃣ Probando acceso a usuarios con token...${NC}"
if [ -n "$TOKEN" ]; then
  USERS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  echo "Respuesta: $USERS_RESPONSE"
else
  echo -e "${YELLOW}⚠️ No se puede probar sin token${NC}"
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando que el frontend está disponible...${NC}"
FRONTEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
FRONTEND_RESPONSE=$(curl -s -I "$FRONTEND_URL" | head -1)
echo "Respuesta: $FRONTEND_RESPONSE"
echo ""

echo -e "${BLUE}📊 RESUMEN DEL SISTEMA${NC}"
echo "=========================="
echo ""

if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
  echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
else
  echo -e "${RED}❌ Backend no responde${NC}"
fi

if echo "$CREATE_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ Creación de usuarios funcionando${NC}"
else
  echo -e "${RED}❌ Error en creación de usuarios${NC}"
fi

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login funcionando${NC}"
else
  echo -e "${RED}❌ Error en login${NC}"
fi

if echo "$FRONTEND_RESPONSE" | grep -q "200"; then
  echo -e "${GREEN}✅ Frontend disponible${NC}"
else
  echo -e "${RED}❌ Frontend no disponible${NC}"
fi

echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario existente${NC}"
echo -e "${YELLOW}3. Ve a la sección de Gestión de Usuarios${NC}"
echo -e "${YELLOW}4. Intenta crear un nuevo usuario${NC}"
echo -e "${YELLOW}5. Verifica que no aparezcan errores de localStorage${NC}"
echo ""
echo -e "${GREEN}🎉 El sistema ahora usa MongoDB directamente sin localStorage!${NC}"
echo ""
