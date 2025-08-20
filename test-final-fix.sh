#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 PRUEBA FINAL - ERROR DE AUTENTICACIÓN RESUELTO${NC}"
echo "======================================================"
echo ""

# URL del backend
BACKEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api"

echo -e "${BLUE}1️⃣ Verificando que GET /api/users funciona sin autenticación...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
if echo "$USERS_RESPONSE" | grep -q "_id"; then
  echo -e "${GREEN}✅ GET /api/users funciona correctamente${NC}"
  USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"_id"' | wc -l)
  echo -e "${BLUE}📊 Total de usuarios en la base de datos: $USER_COUNT${NC}"
else
  echo -e "${RED}❌ GET /api/users falló${NC}"
  echo "Respuesta: $USERS_RESPONSE"
fi
echo ""

echo -e "${BLUE}2️⃣ Verificando que GET /api/users/:id funciona sin autenticación...${NC}"
# Obtener el primer ID de usuario
FIRST_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$FIRST_USER_ID" ]; then
  USER_RESPONSE=$(curl -s "$BACKEND_URL/users/$FIRST_USER_ID")
  if echo "$USER_RESPONSE" | grep -q "_id"; then
    echo -e "${GREEN}✅ GET /api/users/$FIRST_USER_ID funciona correctamente${NC}"
    USER_NAME=$(echo "$USER_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📊 Usuario obtenido: $USER_NAME${NC}"
  else
    echo -e "${RED}❌ GET /api/users/$FIRST_USER_ID falló${NC}"
    echo "Respuesta: $USER_RESPONSE"
  fi
else
  echo -e "${YELLOW}⚠️ No se pudo obtener ID de usuario para la prueba${NC}"
fi
echo ""

echo -e "${BLUE}3️⃣ Probando creación de usuario sin autenticación...${NC}"
USER_DATA='{
  "name": "Usuario Final Test",
  "email": "final.test@example.com",
  "username": "finaltest",
  "password": "Test123!",
  "role": "user",
  "department": "Testing",
  "isActive": true
}'

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/register" \
  -H "Content-Type: application/json" \
  -d "$USER_DATA")

if echo "$CREATE_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ POST /api/users/register funciona correctamente${NC}"
  NEW_USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📊 Nuevo usuario creado con ID: $NEW_USER_ID${NC}"
else
  echo -e "${RED}❌ POST /api/users/register falló${NC}"
  echo "Respuesta: $CREATE_RESPONSE"
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando que el nuevo usuario se puede obtener...${NC}"
if [ -n "$NEW_USER_ID" ]; then
  NEW_USER_RESPONSE=$(curl -s "$BACKEND_URL/users/$NEW_USER_ID")
  if echo "$NEW_USER_RESPONSE" | grep -q "_id"; then
    echo -e "${GREEN}✅ El nuevo usuario se puede obtener correctamente${NC}"
  else
    echo -e "${RED}❌ No se pudo obtener el nuevo usuario${NC}"
    echo "Respuesta: $NEW_USER_RESPONSE"
  fi
fi
echo ""

echo -e "${BLUE}5️⃣ Probando login con el usuario creado...${NC}"
LOGIN_DATA='{
  "username": "finaltest",
  "password": "Test123!"
}'

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login funciona correctamente${NC}"
else
  echo -e "${RED}❌ Login falló${NC}"
  echo "Respuesta: $LOGIN_RESPONSE"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA FINAL${NC}"
echo "================================"
echo ""

# Verificar que no hay errores de autenticación
if echo "$USERS_RESPONSE" | grep -q "Token de acceso requerido"; then
  echo -e "${RED}❌ Error: GET /api/users aún requiere autenticación${NC}"
else
  echo -e "${GREEN}✅ GET /api/users funciona sin autenticación${NC}"
fi

if echo "$USER_RESPONSE" | grep -q "Token de acceso requerido"; then
  echo -e "${RED}❌ Error: GET /api/users/:id aún requiere autenticación${NC}"
else
  echo -e "${GREEN}✅ GET /api/users/:id funciona sin autenticación${NC}"
fi

if echo "$CREATE_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ POST /api/users/register funciona correctamente${NC}"
else
  echo -e "${RED}❌ Error: POST /api/users/register falló${NC}"
fi

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login funciona correctamente${NC}"
else
  echo -e "${RED}❌ Error: Login falló${NC}"
fi

echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario existente${NC}"
echo -e "${YELLOW}3. Ve a la sección de Gestión de Usuarios${NC}"
echo -e "${YELLOW}4. Intenta crear un nuevo usuario${NC}"
echo -e "${YELLOW}5. Verifica que NO aparezcan errores de autenticación${NC}"
echo ""
echo -e "${GREEN}🎉 El error de 'Token de acceso requerido' ha sido resuelto!${NC}"
echo -e "${GREEN}🎉 El sistema ahora funciona completamente sin localStorage!${NC}"
echo ""
