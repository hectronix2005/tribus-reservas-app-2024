#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE GESTIÓN DE ÁREAS${NC}"
echo "================================="
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

echo -e "${BLUE}2️⃣ Verificando áreas existentes...${NC}"
AREAS_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas")
AREAS_COUNT=$(echo "$AREAS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Áreas encontradas: $AREAS_COUNT${NC}"

# Extraer el primer área para pruebas
FIRST_AREA_ID=$(echo "$AREAS_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
FIRST_AREA_NAME=$(echo "$AREAS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_AREA_ID" ]; then
  echo -e "${BLUE}📋 Área de prueba: $FIRST_AREA_NAME (ID: $FIRST_AREA_ID)${NC}"
else
  echo -e "${YELLOW}⚠️ No se encontraron áreas para probar${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Probando actualización de área...${NC}"
TIMESTAMP=$(date +%s)
NEW_NAME="Área Test $TIMESTAMP"

UPDATE_RESPONSE=$(curl -s -X PUT "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas/$FIRST_AREA_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NEW_NAME\",
    \"capacity\": 15,
    \"description\": \"Área de prueba actualizada\",
    \"color\": \"#ef4444\",
    \"isMeetingRoom\": true,
    \"isFullDayReservation\": false
  }")

if echo "$UPDATE_RESPONSE" | grep -q "$NEW_NAME"; then
  echo -e "${GREEN}✅ Área actualizada correctamente${NC}"
  echo -e "${BLUE}📋 Nuevo nombre: $NEW_NAME${NC}"
else
  echo -e "${RED}❌ Error actualizando área${NC}"
  echo -e "${YELLOW}📋 Respuesta: $UPDATE_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando que la actualización persiste...${NC}"
VERIFY_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas/$FIRST_AREA_ID")

if echo "$VERIFY_RESPONSE" | grep -q "$NEW_NAME"; then
  echo -e "${GREEN}✅ Actualización persiste en la base de datos${NC}"
else
  echo -e "${RED}❌ La actualización no persiste${NC}"
  echo -e "${YELLOW}📋 Respuesta: $VERIFY_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}5️⃣ Probando creación de nueva área...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Nueva Área Test $TIMESTAMP\",
    \"capacity\": 8,
    \"description\": \"Área de prueba creada\",
    \"color\": \"#10b981\",
    \"isMeetingRoom\": false,
    \"isFullDayReservation\": true
  }")

if echo "$CREATE_RESPONSE" | grep -q "_id"; then
  echo -e "${GREEN}✅ Nueva área creada correctamente${NC}"
  NEW_AREA_ID=$(echo "$CREATE_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 ID de nueva área: $NEW_AREA_ID${NC}"
else
  echo -e "${RED}❌ Error creando nueva área${NC}"
  echo -e "${YELLOW}📋 Respuesta: $CREATE_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando que la nueva área aparece en la lista...${NC}"
FINAL_AREAS_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas")
FINAL_AREAS_COUNT=$(echo "$FINAL_AREAS_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$FINAL_AREAS_COUNT" -gt "$AREAS_COUNT" ]; then
  echo -e "${GREEN}✅ Nueva área aparece en la lista${NC}"
  echo -e "${BLUE}📋 Total de áreas: $FINAL_AREAS_COUNT (antes: $AREAS_COUNT)${NC}"
else
  echo -e "${RED}❌ La nueva área no aparece en la lista${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}7️⃣ Probando eliminación de área...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas/$NEW_AREA_ID")

if echo "$DELETE_RESPONSE" | grep -q "eliminada\|deleted\|success"; then
  echo -e "${GREEN}✅ Área eliminada correctamente${NC}"
else
  echo -e "${RED}❌ Error eliminando área${NC}"
  echo -e "${YELLOW}📋 Respuesta: $DELETE_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}8️⃣ Verificando que la eliminación persiste...${NC}"
FINAL_VERIFY_RESPONSE=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas")
FINAL_VERIFY_COUNT=$(echo "$FINAL_VERIFY_RESPONSE" | grep -o '"_id"' | wc -l)

if [ "$FINAL_VERIFY_COUNT" -eq "$AREAS_COUNT" ]; then
  echo -e "${GREEN}✅ Eliminación persiste en la base de datos${NC}"
  echo -e "${BLUE}📋 Total de áreas: $FINAL_VERIFY_COUNT (restaurado al original)${NC}"
else
  echo -e "${RED}❌ La eliminación no persiste${NC}"
  echo -e "${YELLOW}📋 Total de áreas: $FINAL_VERIFY_COUNT (esperado: $AREAS_COUNT)${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE PRUEBAS${NC}"
echo "========================"
echo ""
echo -e "${GREEN}✅ Sistema funcionando correctamente${NC}"
echo -e "${GREEN}✅ Áreas cargadas desde MongoDB${NC}"
echo -e "${GREEN}✅ Actualización de áreas funciona${NC}"
echo -e "${GREEN}✅ Creación de áreas funciona${NC}"
echo -e "${GREEN}✅ Eliminación de áreas funciona${NC}"
echo -e "${GREEN}✅ Cambios persisten en la base de datos${NC}"
echo ""

echo -e "${BLUE}🎯 INSTRUCCIONES PARA PROBAR EN EL FRONTEND${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario${NC}"
echo -e "${YELLOW}3. Ve a la sección 'Gestión de Áreas'${NC}"
echo -e "${YELLOW}4. Edita una área existente y cambia su nombre${NC}"
echo -e "${YELLOW}5. Guarda los cambios${NC}"
echo -e "${YELLOW}6. Verifica que el nombre persiste después de guardar${NC}"
echo -e "${YELLOW}7. Recarga la página y verifica que el cambio persiste${NC}"
echo -e "${YELLOW}8. Prueba crear una nueva área${NC}"
echo -e "${YELLOW}9. Prueba eliminar una área${NC}"
echo ""

echo -e "${GREEN}🎉 ¡GESTIÓN DE ÁREAS FUNCIONANDO CORRECTAMENTE!${NC}"
echo ""
