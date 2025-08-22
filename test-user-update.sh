#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE ACTUALIZACIÓN DE USUARIOS (FIX)${NC}"
echo "====================================================="
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

echo -e "${BLUE}2️⃣ Creando un usuario de prueba para actualizar...${NC}"
# Generar timestamp único para evitar conflictos
TIMESTAMP=$(date +%s)
CREATE_USER_DATA='{
  "name": "Usuario Test Update '$TIMESTAMP'",
  "email": "testupdate'$TIMESTAMP'@example.com",
  "username": "testupdate'$TIMESTAMP'",
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

echo -e "${BLUE}3️⃣ Obteniendo datos actuales del usuario...${NC}"
GET_USER_RESPONSE=$(curl -s "$BACKEND_URL/users/$TEST_USER_ID")
CURRENT_NAME=$(echo "$GET_USER_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
CURRENT_DEPARTMENT=$(echo "$GET_USER_RESPONSE" | grep -o '"department":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${BLUE}📊 Datos actuales:${NC}"
echo -e "${BLUE}   - Nombre: $CURRENT_NAME${NC}"
echo -e "${BLUE}   - Departamento: $CURRENT_DEPARTMENT${NC}"
echo ""

echo -e "${BLUE}4️⃣ Actualizando el usuario...${NC}"
UPDATE_USER_DATA='{
  "name": "Usuario Test Update Modificado '$TIMESTAMP'",
  "email": "testupdate'$TIMESTAMP'@example.com",
  "username": "testupdate'$TIMESTAMP'",
  "role": "user",
  "department": "Testing Modificado",
  "isActive": true
}'

UPDATE_RESPONSE=$(curl -s -X PUT "$BACKEND_URL/users/$TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_USER_DATA")

if echo "$UPDATE_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ Usuario actualizado exitosamente${NC}"
else
  echo -e "${RED}❌ Error actualizando usuario${NC}"
  echo "Respuesta: $UPDATE_RESPONSE"
  exit 1
fi
echo ""

echo -e "${BLUE}5️⃣ Verificando que los cambios se aplicaron...${NC}"
UPDATED_USER_RESPONSE=$(curl -s "$BACKEND_URL/users/$TEST_USER_ID")
UPDATED_NAME=$(echo "$UPDATED_USER_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
UPDATED_DEPARTMENT=$(echo "$UPDATED_USER_RESPONSE" | grep -o '"department":"[^"]*"' | head -1 | cut -d'"' -f4)

echo -e "${BLUE}📊 Datos después de la actualización:${NC}"
echo -e "${BLUE}   - Nombre: $UPDATED_NAME${NC}"
echo -e "${BLUE}   - Departamento: $UPDATED_DEPARTMENT${NC}"

if [ "$UPDATED_NAME" != "$CURRENT_NAME" ] && [ "$UPDATED_DEPARTMENT" != "$CURRENT_DEPARTMENT" ]; then
  echo -e "${GREEN}✅ Los cambios se aplicaron correctamente${NC}"
else
  echo -e "${RED}❌ Los cambios no se aplicaron${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}6️⃣ Limpiando: Eliminando el usuario de prueba...${NC}"
DELETE_DATA='{
  "adminUserId": "'$TEST_USER_ID'"
}'

DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/users/$TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA")

if echo "$DELETE_RESPONSE" | grep -q "eliminado"; then
  echo -e "${GREEN}✅ Usuario de prueba eliminado exitosamente${NC}"
else
  echo -e "${YELLOW}⚠️  No se pudo eliminar el usuario de prueba (puede ser normal)${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA DE ACTUALIZACIÓN (FIX)${NC}"
echo "====================================================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Creación de usuarios funcionando${NC}"
echo -e "${GREEN}✅ Actualización de usuarios funcionando${NC}"
echo -e "${GREEN}✅ No hay errores 401 Unauthorized${NC}"
echo -e "${GREEN}✅ Los cambios se aplican correctamente${NC}"
echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con un usuario administrador${NC}"
echo -e "${YELLOW}3. Ve a la sección de Gestión de Usuarios${NC}"
echo -e "${YELLOW}4. Crea un nuevo usuario de prueba${NC}"
echo -e "${YELLOW}5. Haz clic en el botón editar del usuario creado${NC}"
echo -e "${YELLOW}6. Modifica algunos campos (nombre, departamento, etc.)${NC}"
echo -e "${YELLOW}7. Guarda los cambios${NC}"
echo -e "${YELLOW}8. Verifica que los cambios se aplicaron correctamente${NC}"
echo ""
echo -e "${GREEN}🎉 El problema de 401 Unauthorized en actualización ha sido solucionado!${NC}"
echo -e "${GREEN}🎉 La actualización de usuarios funciona correctamente!${NC}"
echo ""
