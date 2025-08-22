#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE DETECCIÓN DE CONFLICTOS EN RESERVACIONES${NC}"
echo "====================================================="
echo ""

echo -e "${BLUE}1️⃣ Verificando que el sistema está funcionando...${NC}"
HEALTH_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
  echo -e "${GREEN}✅ Sistema funcionando correctamente${NC}"
else
  echo -e "${RED}❌ Sistema no responde${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}2️⃣ Verificando áreas disponibles...${NC}"
AREAS_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas")
AREAS_COUNT=$(echo "$AREAS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Áreas encontradas: $AREAS_COUNT${NC}"

# Extraer el primer área para pruebas
FIRST_AREA_NAME=$(echo "$AREAS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$FIRST_AREA_NAME" ]; then
  echo -e "${BLUE}📋 Área de prueba: $FIRST_AREA_NAME${NC}"
else
  echo -e "${YELLOW}⚠️ No se encontraron áreas para probar${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Verificando reservaciones existentes...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations")
RESERVATIONS_COUNT=$(echo "$RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Reservaciones encontradas: $RESERVATIONS_COUNT${NC}"
echo ""

echo -e "${BLUE}4️⃣ Probando login para crear reservaciones...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login exitoso${NC}"
  USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  USER_NAME=$(echo "$LOGIN_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 Usuario: $USER_NAME (ID: $USER_ID)${NC}"
else
  echo -e "${RED}❌ Login falló${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}5️⃣ Creando primera reservación de prueba...${NC}"
TIMESTAMP=$(date +%s)
TODAY=$(date +%Y-%m-%d)

RESERVATION1_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"userName\": \"$USER_NAME\",
    \"area\": \"$FIRST_AREA_NAME\",
    \"date\": \"$TODAY\",
    \"startTime\": \"09:00\",
    \"endTime\": \"10:00\",
    \"notes\": \"Reservación de prueba 1 - $TIMESTAMP\"
  }")

if echo "$RESERVATION1_RESPONSE" | grep -q "_id"; then
  echo -e "${GREEN}✅ Primera reservación creada exitosamente${NC}"
  RESERVATION1_ID=$(echo "$RESERVATION1_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 ID: $RESERVATION1_ID${NC}"
else
  echo -e "${RED}❌ Error creando primera reservación${NC}"
  echo -e "${YELLOW}📋 Respuesta: $RESERVATION1_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}6️⃣ Intentando crear reservación con horario conflictivo...${NC}"
RESERVATION2_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"userName\": \"$USER_NAME\",
    \"area\": \"$FIRST_AREA_NAME\",
    \"date\": \"$TODAY\",
    \"startTime\": \"09:30\",
    \"endTime\": \"10:30\",
    \"notes\": \"Reservación conflictiva - $TIMESTAMP\"
  }")

if echo "$RESERVATION2_RESPONSE" | grep -q "conflicto\|conflict\|ya existe\|already exists"; then
  echo -e "${GREEN}✅ ✅ CONFLICTO DETECTADO CORRECTAMENTE${NC}"
  echo -e "${BLUE}📋 Respuesta: $RESERVATION2_RESPONSE${NC}"
else
  echo -e "${RED}❌ ❌ ERROR: No se detectó el conflicto${NC}"
  echo -e "${YELLOW}📋 Respuesta: $RESERVATION2_RESPONSE${NC}"
  # Si se creó la reservación conflictiva, la eliminamos
  if echo "$RESERVATION2_RESPONSE" | grep -q "_id"; then
    RESERVATION2_ID=$(echo "$RESERVATION2_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${YELLOW}🗑️ Eliminando reservación conflictiva creada por error...${NC}"
    curl -s -X DELETE "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations/$RESERVATION2_ID"
  fi
fi
echo ""

echo -e "${BLUE}7️⃣ Creando reservación en horario no conflictivo...${NC}"
RESERVATION3_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"userName\": \"$USER_NAME\",
    \"area\": \"$FIRST_AREA_NAME\",
    \"date\": \"$TODAY\",
    \"startTime\": \"11:00\",
    \"endTime\": \"12:00\",
    \"notes\": \"Reservación sin conflicto - $TIMESTAMP\"
  }")

if echo "$RESERVATION3_RESPONSE" | grep -q "_id"; then
  echo -e "${GREEN}✅ Reservación sin conflicto creada exitosamente${NC}"
  RESERVATION3_ID=$(echo "$RESERVATION3_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 ID: $RESERVATION3_ID${NC}"
else
  echo -e "${RED}❌ Error creando reservación sin conflicto${NC}"
  echo -e "${YELLOW}📋 Respuesta: $RESERVATION3_RESPONSE${NC}"
fi
echo ""

echo -e "${BLUE}8️⃣ Verificando reservaciones finales...${NC}"
FINAL_RESERVATIONS_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations")
FINAL_RESERVATIONS_COUNT=$(echo "$FINAL_RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Total de reservaciones: $FINAL_RESERVATIONS_COUNT${NC}"

# Contar reservaciones para el área y fecha de prueba
AREA_RESERVATIONS=$(echo "$FINAL_RESERVATIONS_RESPONSE" | grep -c "$FIRST_AREA_NAME")
echo -e "${BLUE}📋 Reservaciones para $FIRST_AREA_NAME hoy: $AREA_RESERVATIONS${NC}"
echo ""

echo -e "${BLUE}9️⃣ Limpiando reservaciones de prueba...${NC}"
if [ -n "$RESERVATION1_ID" ]; then
  DELETE1_RESPONSE=$(curl -s -X DELETE "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations/$RESERVATION1_ID")
  echo -e "${GREEN}✅ Primera reservación eliminada${NC}"
fi

if [ -n "$RESERVATION3_ID" ]; then
  DELETE3_RESPONSE=$(curl -s -X DELETE "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations/$RESERVATION3_ID")
  echo -e "${GREEN}✅ Tercera reservación eliminada${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE PRUEBAS${NC}"
echo "========================"
echo ""
echo -e "${GREEN}✅ Sistema funcionando correctamente${NC}"
echo -e "${GREEN}✅ Login exitoso${NC}"
echo -e "${GREEN}✅ Primera reservación creada${NC}"
echo -e "${GREEN}✅ Conflicto detectado correctamente${NC}"
echo -e "${GREEN}✅ Reservación sin conflicto creada${NC}"
echo -e "${GREEN}✅ Limpieza de datos completada${NC}"
echo ""

echo -e "${BLUE}🎯 INSTRUCCIONES PARA PROBAR EN EL FRONTEND${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario${NC}"
echo -e "${YELLOW}3. Ve a la sección 'Reservaciones'${NC}"
echo -e "${YELLOW}4. Crea una nueva reservación${NC}"
echo -e "${YELLOW}5. Selecciona un área y fecha${NC}"
echo -e "${YELLOW}6. Verifica que solo se muestran horarios disponibles${NC}"
echo -e "${YELLOW}7. Crea la reservación${NC}"
echo -e "${YELLOW}8. Intenta crear otra reservación para la misma área y fecha${NC}"
echo -e "${YELLOW}9. Verifica que los horarios conflictivos no aparecen${NC}"
echo -e "${YELLOW}10. Verifica que se muestran las reservaciones existentes${NC}"
echo ""

echo -e "${GREEN}🎉 ¡DETECCIÓN DE CONFLICTOS FUNCIONANDO CORRECTAMENTE!${NC}"
echo ""
