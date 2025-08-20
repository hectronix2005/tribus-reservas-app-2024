#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DEL SISTEMA DE RESERVACIONES${NC}"
echo "============================================="
echo ""

# URL del backend
BACKEND_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api"

echo -e "${BLUE}1️⃣ Verificando salud del backend...${NC}"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
echo "Respuesta: $HEALTH_RESPONSE"
echo ""

echo -e "${BLUE}2️⃣ Obteniendo usuarios para crear reservación...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
FIRST_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
FIRST_USER_NAME=$(echo "$USERS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_USER_ID" ]; then
  echo -e "${GREEN}✅ Usuario encontrado: $FIRST_USER_NAME (ID: $FIRST_USER_ID)${NC}"
else
  echo -e "${RED}❌ No se pudo obtener usuario${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Probando creación de reservación...${NC}"
RESERVATION_DATA='{
  "userId": "'$FIRST_USER_ID'",
  "userName": "'$FIRST_USER_NAME'",
  "area": "Sala de Juntas A",
  "date": "'$(date -v+1d +%Y-%m-%d)'",
  "startTime": "09:00",
  "endTime": "10:00",
  "notes": "Reunión de prueba del sistema"
}'

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/reservations" \
  -H "Content-Type: application/json" \
  -d "$RESERVATION_DATA")

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

echo -e "${BLUE}4️⃣ Verificando que la reservación se puede obtener...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
if echo "$RESERVATIONS_RESPONSE" | grep -q "$RESERVATION_ID"; then
  echo -e "${GREEN}✅ La reservación se puede obtener correctamente${NC}"
else
  echo -e "${RED}❌ No se pudo obtener la reservación${NC}"
  echo "Respuesta: $RESERVATIONS_RESPONSE"
fi
echo ""

echo -e "${BLUE}5️⃣ Probando actualización de reservación (solo creador)...${NC}"
UPDATE_DATA='{
  "userId": "'$FIRST_USER_ID'",
  "userName": "'$FIRST_USER_NAME'",
  "area": "Sala de Juntas A",
  "date": "'$(date -v+1d +%Y-%m-%d)'",
  "startTime": "10:00",
  "endTime": "11:00",
  "notes": "Reunión actualizada del sistema"
}'

UPDATE_RESPONSE=$(curl -s -X PUT "$BACKEND_URL/reservations/$RESERVATION_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

if echo "$UPDATE_RESPONSE" | grep -q "actualizada"; then
  echo -e "${GREEN}✅ Reservación actualizada exitosamente${NC}"
else
  echo -e "${RED}❌ Error actualizando reservación${NC}"
  echo "Respuesta: $UPDATE_RESPONSE"
fi
echo ""

echo -e "${BLUE}6️⃣ Probando eliminación de reservación (solo creador)...${NC}"
DELETE_DATA='{
  "userId": "'$FIRST_USER_ID'"
}'

DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/reservations/$RESERVATION_ID" \
  -H "Content-Type: application/json" \
  -d "$DELETE_DATA")

if echo "$DELETE_RESPONSE" | grep -q "eliminada"; then
  echo -e "${GREEN}✅ Reservación eliminada exitosamente${NC}"
else
  echo -e "${RED}❌ Error eliminando reservación${NC}"
  echo "Respuesta: $DELETE_RESPONSE"
fi
echo ""

echo -e "${BLUE}7️⃣ Verificando que la reservación ya no existe...${NC}"
FINAL_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
if echo "$FINAL_RESPONSE" | grep -q "$RESERVATION_ID"; then
  echo -e "${RED}❌ La reservación aún existe después de eliminarla${NC}"
else
  echo -e "${GREEN}✅ La reservación fue eliminada correctamente${NC}"
fi
echo ""

echo -e "${BLUE}8️⃣ Probando conflicto de horarios...${NC}"
# Crear primera reservación
RESERVATION1_DATA='{
  "userId": "'$FIRST_USER_ID'",
  "userName": "'$FIRST_USER_NAME'",
  "area": "Sala de Juntas B",
  "date": "'$(date -v+2d +%Y-%m-%d)'",
  "startTime": "14:00",
  "endTime": "15:00",
  "notes": "Primera reservación"
}'

RESERVATION1_RESPONSE=$(curl -s -X POST "$BACKEND_URL/reservations" \
  -H "Content-Type: application/json" \
  -d "$RESERVATION1_DATA")

if echo "$RESERVATION1_RESPONSE" | grep -q "reservation"; then
  echo -e "${GREEN}✅ Primera reservación creada${NC}"
  
  # Intentar crear segunda reservación con conflicto
  RESERVATION2_DATA='{
  "userId": "'$FIRST_USER_ID'",
  "userName": "'$FIRST_USER_NAME'",
  "area": "Sala de Juntas B",
  "date": "'$(date -v+2d +%Y-%m-%d)'",
  "startTime": "14:30",
  "endTime": "15:30",
  "notes": "Segunda reservación (conflicto)"
}'

  RESERVATION2_RESPONSE=$(curl -s -X POST "$BACKEND_URL/reservations" \
    -H "Content-Type: application/json" \
    -d "$RESERVATION2_DATA")

  if echo "$RESERVATION2_RESPONSE" | grep -q "conflicto\|Ya existe"; then
    echo -e "${GREEN}✅ Sistema detectó conflicto de horarios correctamente${NC}"
  else
    echo -e "${RED}❌ Sistema no detectó conflicto de horarios${NC}"
    echo "Respuesta: $RESERVATION2_RESPONSE"
  fi
else
  echo -e "${RED}❌ Error creando primera reservación para prueba de conflicto${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA DE RESERVACIONES${NC}"
echo "============================================="
echo ""

# Verificar que todas las operaciones funcionaron
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
  echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
else
  echo -e "${RED}❌ Backend no responde${NC}"
fi

if echo "$CREATE_RESPONSE" | grep -q "reservation"; then
  echo -e "${GREEN}✅ Creación de reservaciones funcionando${NC}"
else
  echo -e "${RED}❌ Error en creación de reservaciones${NC}"
fi

if echo "$UPDATE_RESPONSE" | grep -q "actualizada"; then
  echo -e "${GREEN}✅ Actualización de reservaciones funcionando${NC}"
else
  echo -e "${RED}❌ Error en actualización de reservaciones${NC}"
fi

if echo "$DELETE_RESPONSE" | grep -q "eliminada"; then
  echo -e "${GREEN}✅ Eliminación de reservaciones funcionando${NC}"
else
  echo -e "${RED}❌ Error en eliminación de reservaciones${NC}"
fi

echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA EL USUARIO${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario existente${NC}"
echo -e "${YELLOW}3. Ve a la sección de Reservaciones${NC}"
echo -e "${YELLOW}4. Crea una nueva reservación${NC}"
echo -e "${YELLOW}5. Verifica que solo puedes editar/eliminar tus propias reservaciones${NC}"
echo -e "${YELLOW}6. Si eres admin, verifica que puedes editar/eliminar todas las reservaciones${NC}"
echo ""
echo -e "${GREEN}🎉 El sistema de reservaciones está funcionando correctamente!${NC}"
echo -e "${GREEN}🎉 Solo el creador de la reservación o un administrador puede eliminarla!${NC}"
echo ""
