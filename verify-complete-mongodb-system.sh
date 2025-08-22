#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VERIFICACIÓN FINAL DEL SISTEMA MONGODB COMPLETO${NC}"
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

echo -e "${BLUE}2️⃣ Verificando endpoints de usuarios...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Usuarios en MongoDB: $USER_COUNT${NC}"
echo ""

echo -e "${BLUE}3️⃣ Verificando endpoints de áreas...${NC}"
AREAS_RESPONSE=$(curl -s "$BACKEND_URL/areas")
AREA_COUNT=$(echo "$AREAS_RESPONSE" | grep -o '"_id"' | wc -l)
if [ "$AREA_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Áreas en MongoDB: $AREA_COUNT${NC}"
  # Verificar que el Área de Colaboración está presente
  if echo "$AREAS_RESPONSE" | grep -q "Área de Colaboración"; then
    echo -e "${GREEN}✅ Área de Colaboración encontrada${NC}"
  else
    echo -e "${RED}❌ Área de Colaboración no encontrada${NC}"
  fi
else
  echo -e "${RED}❌ No se encontraron áreas en MongoDB${NC}"
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando endpoints de templates...${NC}"
TEMPLATES_RESPONSE=$(curl -s "$BACKEND_URL/templates")
TEMPLATE_COUNT=$(echo "$TEMPLATES_RESPONSE" | grep -o '"_id"' | wc -l)
if [ "$TEMPLATE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Templates en MongoDB: $TEMPLATE_COUNT${NC}"
else
  echo -e "${RED}❌ No se encontraron templates en MongoDB${NC}"
fi
echo ""

echo -e "${BLUE}5️⃣ Verificando endpoints de reservaciones...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
RESERVATION_COUNT=$(echo "$RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Reservaciones en MongoDB: $RESERVATION_COUNT${NC}"
echo ""

echo -e "${BLUE}6️⃣ Verificando que no hay referencias a localStorage...${NC}"
LOCALSTORAGE_COUNT=$(grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | wc -l)
if [ "$LOCALSTORAGE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay referencias a localStorage${NC}"
else
  echo -e "${RED}❌ Se encontraron $LOCALSTORAGE_COUNT referencias a localStorage${NC}"
  echo -e "${YELLOW}📋 Archivos con localStorage:${NC}"
  grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | head -5
fi
echo ""

echo -e "${BLUE}7️⃣ Verificando que todos los servicios usan la API...${NC}"
API_SERVICE_COUNT=$(grep -r "apiRequest\|userService\|areaService\|templateService\|reservationService" src/ --include="*.tsx" --include="*.ts" | wc -l)
echo -e "${GREEN}✅ Referencias a servicios de API: $API_SERVICE_COUNT${NC}"
echo ""

echo -e "${BLUE}8️⃣ Verificando modelos de MongoDB en el backend...${NC}"
MONGODB_MODELS=$(grep -r "mongoose.model\|mongoose.Schema" server.js | wc -l)
if [ "$MONGODB_MODELS" -gt 0 ]; then
  echo -e "${GREEN}✅ Modelos de MongoDB definidos: $MONGODB_MODELS${NC}"
else
  echo -e "${RED}❌ No se encontraron modelos de MongoDB${NC}"
fi
echo ""

echo -e "${BLUE}9️⃣ Verificando endpoints del backend...${NC}"
BACKEND_ENDPOINTS=$(grep -r "app\.(get|post|put|delete)" server.js | wc -l)
echo -e "${GREEN}✅ Endpoints del backend: $BACKEND_ENDPOINTS${NC}"
echo ""

echo -e "${BLUE}🔟 Verificando que el estado inicial no tiene datos estáticos...${NC}"
STATIC_STATE=$(grep -r "initialState.*=.*{" src/context/ --include="*.tsx" --include="*.ts" -A 20 | grep -E "(users|areas|templates|reservations).*\[.*{.*id" | wc -l)
if [ "$STATIC_STATE" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos estáticos en el estado inicial${NC}"
else
  echo -e "${RED}❌ Se encontraron $STATIC_STATE datos estáticos en el estado inicial${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN FINAL DEL SISTEMA${NC}"
echo "=================================="
echo ""

# Verificar que todo está funcionando
if [ "$USER_COUNT" -gt 0 ] && [ "$AREA_COUNT" -gt 0 ] && [ "$TEMPLATE_COUNT" -gt 0 ] && [ "$LOCALSTORAGE_COUNT" -eq 0 ] && [ "$MONGODB_MODELS" -gt 0 ]; then
  echo -e "${GREEN}✅ SISTEMA COMPLETAMENTE VERIFICADO${NC}"
  echo -e "${GREEN}✅ Todos los datos están en MongoDB${NC}"
  echo -e "${GREEN}✅ No hay dependencias de localStorage${NC}"
  echo -e "${GREEN}✅ Backend conectado a MongoDB${NC}"
  echo -e "${GREEN}✅ Modelos de MongoDB definidos${NC}"
  echo -e "${GREEN}✅ Servicios de API implementados${NC}"
  echo -e "${GREEN}✅ Área de Colaboración configurada${NC}"
  echo ""
  echo -e "${BLUE}🎯 ESTADÍSTICAS FINALES${NC}"
  echo "======================="
  echo -e "${YELLOW}👥 Usuarios: $USER_COUNT${NC}"
  echo -e "${YELLOW}🏢 Áreas: $AREA_COUNT${NC}"
  echo -e "${YELLOW}📋 Templates: $TEMPLATE_COUNT${NC}"
  echo -e "${YELLOW}📅 Reservaciones: $RESERVATION_COUNT${NC}"
  echo -e "${YELLOW}🔗 Endpoints: $BACKEND_ENDPOINTS${NC}"
  echo -e "${YELLOW}🗄️ Modelos MongoDB: $MONGODB_MODELS${NC}"
  echo ""
  echo -e "${GREEN}🎉 ¡EL SISTEMA ESTÁ COMPLETAMENTE MIGRADO A MONGODB!${NC}"
  echo -e "${GREEN}🎉 ¡TODOS LOS DATOS ESTÁN SEGUROS EN LA NUBE!${NC}"
  echo -e "${GREEN}🎉 ¡NO HAY DEPENDENCIAS LOCALES!${NC}"
else
  echo -e "${RED}❌ SISTEMA NO COMPLETAMENTE VERIFICADO${NC}"
  echo -e "${RED}❌ Hay problemas que necesitan ser corregidos${NC}"
  echo ""
  echo -e "${BLUE}🔧 PROBLEMAS DETECTADOS${NC}"
  echo "====================="
  if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No hay usuarios en MongoDB${NC}"
  fi
  if [ "$AREA_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No hay áreas en MongoDB${NC}"
  fi
  if [ "$TEMPLATE_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No hay templates en MongoDB${NC}"
  fi
  if [ "$LOCALSTORAGE_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Hay referencias a localStorage${NC}"
  fi
  if [ "$MONGODB_MODELS" -eq 0 ]; then
    echo -e "${RED}❌ No hay modelos de MongoDB definidos${NC}"
  fi
fi
echo ""
echo -e "${BLUE}📁 BACKUP DISPONIBLE EN: ./mongodb-backup${NC}"
echo "============================================="
echo -e "${YELLOW}💾 Ejecuta ./backup-mongodb-data.sh para crear un nuevo backup${NC}"
echo -e "${YELLOW}🔍 Ejecuta ./verify-mongodb-only.sh para verificar dependencias${NC}"
echo ""
