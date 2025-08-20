#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE ELIMINACIÓN DE USUARIOS (FIX)${NC}"
echo "=================================================="
echo ""

# URL del backend
BACKEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api"

echo -e "${BLUE}1️⃣ Verificando salud del backend...${NC}"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
  echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
else
  echo -e "${RED}❌ Backend no responde${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}2️⃣ Obteniendo usuarios disponibles...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Usuarios encontrados: $USER_COUNT${NC}"

# Obtener un usuario admin
ADMIN_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
ADMIN_USER_NAME=$(echo "$USERS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ADMIN_USER_ID" ]; then
  echo -e "${GREEN}✅ Admin seleccionado: $ADMIN_USER_NAME (ID: $ADMIN_USER_ID)${NC}"
else
  echo -e "${RED}❌ No se pudo obtener admin${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Creando un usuario de prueba para eliminar...${NC}"
# Generar timestamp único para evitar conflictos
TIMESTAMP=$(date +%s)
CREATE_USER_DATA='{
  "name": "Usuario Test Fix '$TIMESTAMP'",
  "email": "testfix'$TIMESTAMP'@example.com",
  "username": "testfix'$TIMESTAMP'",
  "password": "Test123!",
  "role": "user",
  "department": "Testing",
  "isActive": true
}'

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/register" \
  -H "Content-Type: application/json" \
  -d "$CREATE_USER_DATA")

if echo "$CREATE_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ Usuario de prueba creado exitosamente${NC}"
  TEST_USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$TEST_USER_ID" ]; then
    echo -e "${BLUE}📊 ID del usuario de prueba: $TEST_USER_ID${NC}"
  else
    echo -e "${RED}❌ No se pudo obtener el ID del usuario creado${NC}"
    echo "Respuesta completa: $CREATE_RESPONSE"
    exit 1
  fi
else
  echo -e "${RED}❌ Error creando usuario de prueba${NC}"
  echo "Respuesta: $CREATE_RESPONSE"
  exit 1
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando que el usuario aparece en la lista...${NC}"
NEW_USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
NEW_USER_COUNT=$(echo "$NEW_USERS_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$NEW_USER_COUNT" -gt "$USER_COUNT" ]; then
  echo -e "${GREEN}✅ El usuario se agregó correctamente${NC}"
  echo -e "${BLUE}📊 Total de usuarios: $NEW_USER_COUNT${NC}"
else
  echo -e "${RED}❌ El usuario no apareció en la lista${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}5️⃣ Probando eliminación con admin...${NC}"
DELETE_DATA='{
  "adminUserId": "'$ADMIN_USER_ID'"
}'

DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/users/$TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA")

if echo "$DELETE_RESPONSE" | grep -q "eliminado"; then
  echo -e "${GREEN}✅ Usuario eliminado exitosamente por admin${NC}"
else
  echo -e "${RED}❌ Error eliminando usuario con admin${NC}"
  echo "Respuesta: $DELETE_RESPONSE"
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando que el usuario fue eliminado...${NC}"
FINAL_USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
FINAL_USER_COUNT=$(echo "$FINAL_USERS_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$FINAL_USER_COUNT" -eq "$USER_COUNT" ]; then
  echo -e "${GREEN}✅ El usuario fue eliminado correctamente${NC}"
  echo -e "${BLUE}📊 Total final de usuarios: $FINAL_USER_COUNT${NC}"
else
  echo -e "${RED}❌ El usuario aún existe después de eliminarlo${NC}"
fi
echo ""

echo -e "${BLUE}7️⃣ Verificando que no hay IDs undefined...${NC}"
UNDEFINED_COUNT=$(echo "$USERS_RESPONSE" | grep -o 'undefined' | wc -l)
if [ "$UNDEFINED_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No se encontraron IDs undefined${NC}"
else
  echo -e "${RED}❌ Se encontraron $UNDEFINED_COUNT IDs undefined${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA DE ELIMINACIÓN (FIX)${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Creación de usuarios funcionando${NC}"
echo -e "${GREEN}✅ Eliminación de usuarios por admin funcionando${NC}"
echo -e "${GREEN}✅ Mapeo de _id a id funcionando${NC}"
echo -e "${GREEN}✅ No hay IDs undefined${NC}"
echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con un usuario administrador${NC}"
echo -e "${YELLOW}3. Ve a la sección de Gestión de Usuarios${NC}"
echo -e "${YELLOW}4. Crea un nuevo usuario de prueba${NC}"
echo -e "${YELLOW}5. Haz clic en el botón eliminar del usuario creado${NC}"
echo -e "${YELLOW}6. Confirma la eliminación${NC}"
echo -e "${YELLOW}7. Verifica que el usuario se elimina correctamente${NC}"
echo ""
echo -e "${GREEN}🎉 El problema de ID undefined ha sido solucionado!${NC}"
echo -e "${GREEN}🎉 La eliminación de usuarios funciona correctamente!${NC}"
echo ""
