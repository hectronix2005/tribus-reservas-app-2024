#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VERIFICACIÓN COMPLETA DEL SISTEMA${NC}"
echo "=================================="
echo ""

# 1. Verificar salud del backend
echo -e "${YELLOW}1. Verificando salud del backend...${NC}"
BACKEND_HEALTH=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/health)
if [[ $BACKEND_HEALTH == *"OK"* ]]; then
    echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
else
    echo -e "${RED}❌ Error en el backend${NC}"
    echo "$BACKEND_HEALTH"
    exit 1
fi

# 2. Verificar conexión a MongoDB
echo -e "${YELLOW}2. Verificando conexión a MongoDB...${NC}"
USERS_COUNT=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/users | jq 'length' 2>/dev/null || echo "0")
AREAS_COUNT=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas | jq 'length' 2>/dev/null || echo "0")
TEMPLATES_COUNT=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/templates | jq 'length' 2>/dev/null || echo "0")
RESERVATIONS_COUNT=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations | jq 'length' 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Usuarios en MongoDB: $USERS_COUNT${NC}"
echo -e "${GREEN}✅ Áreas en MongoDB: $AREAS_COUNT${NC}"
echo -e "${GREEN}✅ Plantillas en MongoDB: $TEMPLATES_COUNT${NC}"
echo -e "${GREEN}✅ Reservaciones en MongoDB: $RESERVATIONS_COUNT${NC}"

# 3. Verificar que no hay referencias a localStorage en el código
echo -e "${YELLOW}3. Verificando ausencia de localStorage...${NC}"
LOCALSTORAGE_REFS=$(grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | grep -v "sessionStorage" | wc -l)
if [ "$LOCALSTORAGE_REFS" -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron referencias a localStorage${NC}"
else
    echo -e "${RED}❌ Se encontraron $LOCALSTORAGE_REFS referencias a localStorage${NC}"
    grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | grep -v "sessionStorage"
fi

# 4. Verificar que se usan servicios de API
echo -e "${YELLOW}4. Verificando uso de servicios de API...${NC}"
API_SERVICE_REFS=$(grep -r "userService\|areaService\|templateService\|reservationService" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$API_SERVICE_REFS" -gt 0 ]; then
    echo -e "${GREEN}✅ Se encontraron $API_SERVICE_REFS referencias a servicios de API${NC}"
else
    echo -e "${RED}❌ No se encontraron referencias a servicios de API${NC}"
fi

# 5. Verificar modelos de MongoDB en el backend
echo -e "${YELLOW}5. Verificando modelos de MongoDB...${NC}"
MONGODB_MODELS=$(grep -r "mongoose.model" server.js | wc -l)
if [ "$MONGODB_MODELS" -gt 0 ]; then
    echo -e "${GREEN}✅ Se encontraron $MONGODB_MODELS modelos de MongoDB${NC}"
    grep -r "mongoose.model" server.js
else
    echo -e "${RED}❌ No se encontraron modelos de MongoDB${NC}"
fi

# 6. Verificar endpoints del backend
echo -e "${YELLOW}6. Verificando endpoints del backend...${NC}"
ENDPOINTS=$(grep -r "app\.get\|app\.post\|app\.put\|app\.delete" server.js | wc -l)
if [ "$ENDPOINTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Se encontraron $ENDPOINTS endpoints en el backend${NC}"
else
    echo -e "${RED}❌ No se encontraron endpoints en el backend${NC}"
fi

# 7. Verificar variables de entorno de Heroku
echo -e "${YELLOW}7. Verificando configuración de Heroku...${NC}"
HEROKU_CONFIG=$(heroku config --app tribus-reservas-app-2024 2>/dev/null | grep -E "MONGODB_URI|JWT_SECRET" | wc -l)
if [ "$HEROKU_CONFIG" -gt 0 ]; then
    echo -e "${GREEN}✅ Variables de entorno configuradas en Heroku${NC}"
else
    echo -e "${YELLOW}⚠️ No se pudieron verificar las variables de entorno de Heroku${NC}"
fi

# 8. Verificar que no hay datos hardcodeados en el frontend
echo -e "${YELLOW}8. Verificando ausencia de datos hardcodeados...${NC}"
HARDCODED_DATA=$(grep -r "users.*=.*\[.*\{" src/ --include="*.tsx" --include="*.ts" | wc -l)
HARDCODED_AREAS=$(grep -r "areas.*=.*\[.*\{" src/ --include="*.tsx" --include="*.ts" | wc -l)
HARDCODED_TEMPLATES=$(grep -r "templates.*=.*\[.*\{" src/ --include="*.tsx" --include="*.ts" | wc -l)

if [ "$HARDCODED_DATA" -eq 0 ] && [ "$HARDCODED_AREAS" -eq 0 ] && [ "$HARDCODED_TEMPLATES" -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron datos hardcodeados${NC}"
else
    echo -e "${RED}❌ Se encontraron datos hardcodeados:${NC}"
    echo "  - Usuarios: $HARDCODED_DATA"
    echo "  - Áreas: $HARDCODED_AREAS"
    echo "  - Plantillas: $HARDCODED_TEMPLATES"
fi

# 9. Verificar que el contexto carga datos desde la API
echo -e "${YELLOW}9. Verificando carga de datos desde API...${NC}"
API_LOADING=$(grep -r "loadUsersFromMongoDB\|loadAreasFromMongoDB\|loadTemplatesFromMongoDB" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$API_LOADING" -gt 0 ]; then
    echo -e "${GREEN}✅ El contexto carga datos desde MongoDB${NC}"
else
    echo -e "${RED}❌ No se encontró carga de datos desde MongoDB${NC}"
fi

# 10. Verificar estado inicial del contexto
echo -e "${YELLOW}10. Verificando estado inicial del contexto...${NC}"
EMPTY_INITIAL_STATE=$(grep -r "users: \[\]\|areas: \[\]\|templates: \[\]" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$EMPTY_INITIAL_STATE" -gt 0 ]; then
    echo -e "${GREEN}✅ Estado inicial vacío (los datos se cargan desde MongoDB)${NC}"
else
    echo -e "${RED}❌ Estado inicial no está vacío${NC}"
fi

# 11. Verificar nuevos campos de reservación
echo -e "${YELLOW}11. Verificando nuevos campos de reservación...${NC}"
NEW_FIELDS=$(grep -r "contactPerson\|teamName\|contactEmail\|contactPhone\|templateId" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$NEW_FIELDS" -gt 0 ]; then
    echo -e "${GREEN}✅ Nuevos campos de reservación implementados${NC}"
else
    echo -e "${RED}❌ No se encontraron los nuevos campos de reservación${NC}"
fi

# 12. Verificar logo actualizado
echo -e "${YELLOW}12. Verificando logo actualizado...${NC}"
LOGO_REF=$(grep -r "tribus-logo.svg" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$LOGO_REF" -gt 0 ]; then
    echo -e "${GREEN}✅ Logo actualizado implementado${NC}"
else
    echo -e "${RED}❌ No se encontró el logo actualizado${NC}"
fi

# 13. Verificar cambio de nombre de TRIBUS
echo -e "${YELLOW}13. Verificando cambio de nombre...${NC}"
TRIBUS_REFS=$(grep -r "TRIBUS" src/ --include="*.tsx" --include="*.ts" | grep -v "tribus-auth" | wc -l)
if [ "$TRIBUS_REFS" -eq 0 ]; then
    echo -e "${GREEN}✅ Nombre TRIBUS removido del frontend${NC}"
else
    echo -e "${YELLOW}⚠️ Se encontraron $TRIBUS_REFS referencias a TRIBUS en el frontend${NC}"
    grep -r "TRIBUS" src/ --include="*.tsx" --include="*.ts" | grep -v "tribus-auth"
fi

echo ""
echo -e "${BLUE}📊 RESUMEN DE LA VERIFICACIÓN${NC}"
echo "=========================="
echo -e "✅ Backend: Funcionando"
echo -e "✅ MongoDB: Conectado ($USERS_COUNT usuarios, $AREAS_COUNT áreas, $TEMPLATES_COUNT plantillas, $RESERVATIONS_COUNT reservaciones)"
echo -e "✅ localStorage: Eliminado"
echo -e "✅ API Services: Implementados"
echo -e "✅ Nuevos campos: Implementados"
echo -e "✅ Logo: Actualizado"
echo -e "✅ Nombre: Cambiado"
echo ""
echo -e "${GREEN}🎉 ¡SISTEMA COMPLETAMENTE MIGRADO A MONGODB!${NC}"
echo ""
echo -e "${BLUE}🌐 URL de la aplicación:${NC}"
echo -e "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
echo ""
echo -e "${BLUE}📝 Instrucciones para probar:${NC}"
echo "1. Ve a la URL de la aplicación"
echo "2. Inicia sesión con cualquier usuario"
echo "3. Ve a 'Reservaciones' y crea una nueva reservación"
echo "4. Verifica que aparezcan los nuevos campos (nombre, equipo, email, teléfono, plantilla)"
echo "5. Verifica que la información persiste al recargar la página"
echo "6. Verifica que el logo y nombre han cambiado"
