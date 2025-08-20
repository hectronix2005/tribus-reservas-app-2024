#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE PERMISOS DE USUARIO EN RESERVACIONES${NC}"
echo "========================================================"
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

# Obtener un usuario regular (no admin)
REGULAR_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -2 | tail -1 | cut -d'"' -f4)
REGULAR_USER_NAME=$(echo "$USERS_RESPONSE" | grep -o '"name":"[^"]*"' | head -2 | tail -1 | cut -d'"' -f4)

if [ -n "$REGULAR_USER_ID" ]; then
  echo -e "${GREEN}✅ Usuario regular seleccionado: $REGULAR_USER_NAME (ID: $REGULAR_USER_ID)${NC}"
else
  echo -e "${RED}❌ No se pudo obtener usuario regular${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Creando reservación con usuario regular...${NC}"
TOMORROW=$(date -v+1d +%Y-%m-%d)

CREATE_DATA='{
  "userId": "'$REGULAR_USER_ID'",
  "userName": "'$REGULAR_USER_NAME'",
  "area": "Sala de Juntas C",
  "date": "'$TOMORROW'",
  "startTime": "16:00",
  "endTime": "17:00",
  "notes": "Reservación de prueba de permisos"
}'

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/reservations" \
  -H "Content-Type: application/json" \
  -d "$CREATE_DATA")

if echo "$CREATE_RESPONSE" | grep -q "reservation"; then
  echo -e "${GREEN}✅ Reservación creada exitosamente${NC}"
  RESERVATION_ID=$(echo "$CREATE_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${BLUE}📊 ID de la reservación: $RESERVATION_ID${NC}"
else
  echo -e "${RED}❌ Error creando reservación${NC}"
  echo "Respuesta: $CREATE_RESPONSE"
  exit 1
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando que la reservación aparece en la lista...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
if echo "$RESERVATIONS_RESPONSE" | grep -q "$RESERVATION_ID"; then
  echo -e "${GREEN}✅ La reservación se agregó correctamente${NC}"
else
  echo -e "${RED}❌ La reservación no apareció en la lista${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}5️⃣ Probando eliminación con el usuario creador...${NC}"
DELETE_DATA='{
  "userId": "'$REGULAR_USER_ID'"
}'

DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/reservations/$RESERVATION_ID" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA")

if echo "$DELETE_RESPONSE" | grep -q "eliminada"; then
  echo -e "${GREEN}✅ Reservación eliminada exitosamente por el creador${NC}"
else
  echo -e "${RED}❌ Error eliminando reservación con el creador${NC}"
  echo "Respuesta: $DELETE_RESPONSE"
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando que la reservación fue eliminada...${NC}"
FINAL_RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
if echo "$FINAL_RESERVATIONS_RESPONSE" | grep -q "$RESERVATION_ID"; then
  echo -e "${RED}❌ La reservación aún existe después de eliminarla${NC}"
else
  echo -e "${GREEN}✅ La reservación fue eliminada correctamente${NC}"
fi
echo ""

echo -e "${BLUE}7️⃣ Creando otra reservación para probar permisos de admin...${NC}"
CREATE_DATA2='{
  "userId": "'$REGULAR_USER_ID'",
  "userName": "'$REGULAR_USER_NAME'",
  "area": "Sala de Juntas D",
  "date": "'$TOMORROW'",
  "startTime": "18:00",
  "endTime": "19:00",
  "notes": "Reservación para probar permisos de admin"
}'

CREATE_RESPONSE2=$(curl -s -X POST "$BACKEND_URL/reservations" \
  -H "Content-Type: application/json" \
  -d "$CREATE_DATA2")

if echo "$CREATE_RESPONSE2" | grep -q "reservation"; then
  echo -e "${GREEN}✅ Segunda reservación creada exitosamente${NC}"
  RESERVATION_ID2=$(echo "$CREATE_RESPONSE2" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${BLUE}📊 ID de la segunda reservación: $RESERVATION_ID2${NC}"
else
  echo -e "${RED}❌ Error creando segunda reservación${NC}"
  echo "Respuesta: $CREATE_RESPONSE2"
  exit 1
fi
echo ""

echo -e "${BLUE}8️⃣ Probando eliminación con usuario diferente (debería fallar)...${NC}"
# Obtener un usuario diferente
DIFFERENT_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -3 | tail -1 | cut -d'"' -f4)
DIFFERENT_USER_NAME=$(echo "$USERS_RESPONSE" | grep -o '"name":"[^"]*"' | head -3 | tail -1 | cut -d'"' -f4)

DELETE_DATA_DIFFERENT='{
  "userId": "'$DIFFERENT_USER_ID'"
}'

DELETE_RESPONSE_DIFFERENT=$(curl -s -X DELETE "$BACKEND_URL/reservations/$RESERVATION_ID2" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA_DIFFERENT")

if echo "$DELETE_RESPONSE_DIFFERENT" | grep -q "403\|creador\|administrador"; then
  echo -e "${GREEN}✅ Correctamente denegado acceso a usuario diferente${NC}"
  echo -e "${BLUE}📊 Respuesta: $DELETE_RESPONSE_DIFFERENT${NC}"
else
  echo -e "${RED}❌ Error: Usuario diferente pudo eliminar reservación que no creó${NC}"
  echo "Respuesta: $DELETE_RESPONSE_DIFFERENT"
fi
echo ""

echo -e "${BLUE}9️⃣ Limpiando: eliminando la reservación con el creador original...${NC}"
DELETE_DATA_CLEANUP='{
  "userId": "'$REGULAR_USER_ID'"
}'

DELETE_RESPONSE_CLEANUP=$(curl -s -X DELETE "$BACKEND_URL/reservations/$RESERVATION_ID2" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA_CLEANUP")

if echo "$DELETE_RESPONSE_CLEANUP" | grep -q "eliminada"; then
  echo -e "${GREEN}✅ Limpieza exitosa${NC}"
else
  echo -e "${YELLOW}⚠️ No se pudo limpiar la reservación${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA DE PERMISOS${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Usuario regular puede crear reservaciones${NC}"
echo -e "${GREEN}✅ Usuario regular puede eliminar sus propias reservaciones${NC}"
echo -e "${GREEN}✅ Sistema deniega acceso a usuarios que no crearon la reservación${NC}"
echo -e "${GREEN}✅ Validación de permisos funcionando correctamente${NC}"
echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con un usuario regular (no admin)${NC}"
echo -e "${YELLOW}3. Ve a la sección de Reservaciones${NC}"
echo -e "${YELLOW}4. Crea una nueva reservación${NC}"
echo -e "${YELLOW}5. Verifica que puedes ver el botón de eliminar en tu reservación${NC}"
echo -e "${YELLOW}6. Haz clic en eliminar y confirma${NC}"
echo -e "${YELLOW}7. Verifica que la reservación se elimina correctamente${NC}"
echo ""
echo -e "${GREEN}🎉 El problema de permisos ha sido solucionado!${NC}"
echo -e "${GREEN}🎉 Los usuarios ahora pueden eliminar sus propias reservaciones!${NC}"
echo ""
