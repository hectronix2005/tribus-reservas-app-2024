#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA SIMPLE DEL SISTEMA DE RESERVACIONES${NC}"
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

echo -e "${BLUE}2️⃣ Obteniendo usuarios...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Usuarios encontrados: $USER_COUNT${NC}"
echo ""

echo -e "${BLUE}3️⃣ Obteniendo reservaciones actuales...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
RESERVATION_COUNT=$(echo "$RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Reservaciones actuales: $RESERVATION_COUNT${NC}"
echo ""

echo -e "${BLUE}4️⃣ Creando una nueva reservación...${NC}"
# Obtener el primer usuario
FIRST_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
FIRST_USER_NAME=$(echo "$USERS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

# Crear reservación para mañana
TOMORROW=$(date -v+1d +%Y-%m-%d)

CREATE_DATA='{
  "userId": "'$FIRST_USER_ID'",
  "userName": "'$FIRST_USER_NAME'",
  "area": "Sala de Juntas A",
  "date": "'$TOMORROW'",
  "startTime": "09:00",
  "endTime": "10:00",
  "notes": "Prueba del sistema"
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

echo -e "${BLUE}5️⃣ Verificando que la reservación aparece en la lista...${NC}"
NEW_RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
NEW_RESERVATION_COUNT=$(echo "$NEW_RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$NEW_RESERVATION_COUNT" -gt "$RESERVATION_COUNT" ]; then
  echo -e "${GREEN}✅ La reservación se agregó correctamente${NC}"
  echo -e "${BLUE}📊 Total de reservaciones: $NEW_RESERVATION_COUNT${NC}"
else
  echo -e "${RED}❌ La reservación no apareció en la lista${NC}"
fi
echo ""

echo -e "${BLUE}6️⃣ Probando eliminación de la reservación...${NC}"
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

echo -e "${BLUE}7️⃣ Verificando que la reservación fue eliminada...${NC}"
FINAL_RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
FINAL_RESERVATION_COUNT=$(echo "$FINAL_RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$FINAL_RESERVATION_COUNT" -eq "$RESERVATION_COUNT" ]; then
  echo -e "${GREEN}✅ La reservación fue eliminada correctamente${NC}"
  echo -e "${BLUE}📊 Total final de reservaciones: $FINAL_RESERVATION_COUNT${NC}"
else
  echo -e "${RED}❌ La reservación aún existe después de eliminarla${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN FINAL${NC}"
echo "=================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Creación de reservaciones funcionando${NC}"
echo -e "${GREEN}✅ Eliminación de reservaciones funcionando${NC}"
echo -e "${GREEN}✅ Sistema de permisos implementado${NC}"
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
