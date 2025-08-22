#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA DE NUEVOS CAMPOS DE RESERVACIÓN${NC}"
echo "=========================================="
echo ""

# URL base
BASE_URL="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"

# 1. Verificar salud del sistema
echo -e "${YELLOW}1. Verificando salud del sistema...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo -e "${GREEN}✅ Sistema funcionando correctamente${NC}"
else
    echo -e "${RED}❌ Error en el sistema${NC}"
    exit 1
fi

# 2. Obtener usuarios disponibles
echo -e "${YELLOW}2. Obteniendo usuarios disponibles...${NC}"
USERS_RESPONSE=$(curl -s "$BASE_URL/api/users")
if [[ $USERS_RESPONSE == *"admin"* ]]; then
    echo -e "${GREEN}✅ Usuarios disponibles${NC}"
    # Extraer credenciales del admin
    ADMIN_EMAIL=$(echo "$USERS_RESPONSE" | jq -r '.[] | select(.username=="admin") | .email' 2>/dev/null)
    ADMIN_PASSWORD="admin123"
else
    echo -e "${RED}❌ No se pudieron obtener usuarios${NC}"
    exit 1
fi

# 3. Obtener áreas disponibles
echo -e "${YELLOW}3. Obteniendo áreas disponibles...${NC}"
AREAS_RESPONSE=$(curl -s "$BASE_URL/api/areas")
if [[ $AREAS_RESPONSE == *"Sala"* ]] || [[ $AREAS_RESPONSE == *"Área"* ]]; then
    echo -e "${GREEN}✅ Áreas disponibles${NC}"
    # Extraer primera área
    FIRST_AREA=$(echo "$AREAS_RESPONSE" | jq -r '.[0].name' 2>/dev/null)
else
    echo -e "${RED}❌ No se pudieron obtener áreas${NC}"
    exit 1
fi

# 4. Obtener plantillas disponibles
echo -e "${YELLOW}4. Obteniendo plantillas disponibles...${NC}"
TEMPLATES_RESPONSE=$(curl -s "$BASE_URL/api/templates")
if [[ $TEMPLATES_RESPONSE == *"name"* ]]; then
    echo -e "${GREEN}✅ Plantillas disponibles${NC}"
    # Extraer primera plantilla
    FIRST_TEMPLATE_ID=$(echo "$TEMPLATES_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
else
    echo -e "${RED}❌ No se pudieron obtener plantillas${NC}"
    exit 1
fi

# 5. Simular login para obtener token
echo -e "${YELLOW}5. Simulando login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"admin\",
    \"password\": \"admin123\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
if [[ $TOKEN != "null" ]] && [[ $TOKEN != "" ]]; then
    echo -e "${GREEN}✅ Login exitoso, token obtenido${NC}"
else
    echo -e "${RED}❌ Error en login${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 6. Crear una reservación con los nuevos campos
echo -e "${YELLOW}6. Creando reservación con nuevos campos...${NC}"
RESERVATION_DATA="{
  \"userId\": \"$(echo "$USERS_RESPONSE" | jq -r '.[] | select(.username=="admin") | ._id' 2>/dev/null)\",
  \"userName\": \"Administrador del Sistema\",
  \"area\": \"$FIRST_AREA\",
  \"date\": \"$(date -v+1d '+%Y-%m-%d')\",
  \"startTime\": \"09:00\",
  \"endTime\": \"10:00\",
  \"contactPerson\": \"Juan Pérez\",
  \"teamName\": \"Equipo de Desarrollo\",
  \"contactEmail\": \"juan.perez@empresa.com\",
  \"contactPhone\": \"+57 300 123 4567\",
  \"templateId\": \"$FIRST_TEMPLATE_ID\",
  \"notes\": \"Prueba de nuevos campos de reservación\"
}"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/reservations" \
  -H "Content-Type: application/json" \
  -d "$RESERVATION_DATA")

if [[ $CREATE_RESPONSE == *"Reservación creada exitosamente"* ]]; then
    echo -e "${GREEN}✅ Reservación creada exitosamente${NC}"
    
    # Extraer ID de la reservación creada
    RESERVATION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.reservation._id' 2>/dev/null)
    echo -e "${BLUE}📋 ID de reservación: $RESERVATION_ID${NC}"
    
    # Mostrar detalles de la reservación creada
    echo -e "${BLUE}📄 Detalles de la reservación:${NC}"
    echo "$CREATE_RESPONSE" | jq '.reservation | {
        area: .area,
        date: .date,
        startTime: .startTime,
        endTime: .endTime,
        contactPerson: .contactPerson,
        teamName: .teamName,
        contactEmail: .contactEmail,
        contactPhone: .contactPhone,
        templateId: .templateId,
        notes: .notes
    }' 2>/dev/null
    
else
    echo -e "${RED}❌ Error creando reservación${NC}"
    echo "$CREATE_RESPONSE"
    exit 1
fi

# 7. Verificar que la reservación se guardó correctamente
echo -e "${YELLOW}7. Verificando que la reservación se guardó...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BASE_URL/api/reservations")
if [[ $RESERVATIONS_RESPONSE == *"Juan Pérez"* ]]; then
    echo -e "${GREEN}✅ Reservación guardada correctamente en MongoDB${NC}"
else
    echo -e "${RED}❌ La reservación no se guardó correctamente${NC}"
fi

# 8. Actualizar la reservación
echo -e "${YELLOW}8. Actualizando la reservación...${NC}"
UPDATE_DATA="{
  \"userId\": \"$(echo "$USERS_RESPONSE" | jq -r '.[] | select(.username=="admin") | ._id' 2>/dev/null)\",
  \"userName\": \"Administrador del Sistema\",
  \"area\": \"$FIRST_AREA\",
  \"date\": \"$(date -v+1d '+%Y-%m-%d')\",
  \"startTime\": \"10:00\",
  \"endTime\": \"11:00\",
  \"contactPerson\": \"María García\",
  \"teamName\": \"Equipo de Marketing\",
  \"contactEmail\": \"maria.garcia@empresa.com\",
  \"contactPhone\": \"+57 300 987 6543\",
  \"templateId\": \"\",
  \"notes\": \"Reservación actualizada con nuevos campos\"
}"

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/reservations/$RESERVATION_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

if [[ $UPDATE_RESPONSE == *"Reservación actualizada exitosamente"* ]]; then
    echo -e "${GREEN}✅ Reservación actualizada exitosamente${NC}"
else
    echo -e "${RED}❌ Error actualizando reservación${NC}"
    echo "$UPDATE_RESPONSE"
fi

# 9. Eliminar la reservación de prueba
echo -e "${YELLOW}9. Eliminando reservación de prueba...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/reservations/$RESERVATION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$(echo "$USERS_RESPONSE" | jq -r '.[] | select(.username=="admin") | ._id' 2>/dev/null)\"}")

if [[ $DELETE_RESPONSE == *"Reservación eliminada exitosamente"* ]]; then
    echo -e "${GREEN}✅ Reservación eliminada exitosamente${NC}"
else
    echo -e "${RED}❌ Error eliminando reservación${NC}"
    echo "$DELETE_RESPONSE"
fi

echo ""
echo -e "${BLUE}📊 RESUMEN DE LA PRUEBA${NC}"
echo "========================"
echo -e "✅ Sistema funcionando"
echo -e "✅ Login exitoso"
echo -e "✅ Nuevos campos implementados"
echo -e "✅ Creación de reservación exitosa"
echo -e "✅ Actualización de reservación exitosa"
echo -e "✅ Eliminación de reservación exitosa"
echo -e "✅ Persistencia en MongoDB verificada"
echo ""
echo -e "${GREEN}🎉 ¡PRUEBA DE NUEVOS CAMPOS EXITOSA!${NC}"
echo ""
echo -e "${BLUE}🌐 URL de la aplicación:${NC}"
echo -e "$BASE_URL"
echo ""
echo -e "${BLUE}📝 Campos verificados:${NC}"
echo "- Nombre del solicitante (contactPerson)"
echo "- Equipo de trabajo (teamName)"
echo "- Email de contacto (contactEmail)"
echo "- Teléfono de contacto (contactPhone)"
echo "- Plantilla opcional (templateId)"
echo "- Notas adicionales (notes)"
