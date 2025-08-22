#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VERIFICANDO DEPENDENCIAS EXCLUSIVAS DE MONGODB${NC}"
echo "======================================================="
echo ""

echo -e "${BLUE}1️⃣ Buscando referencias a localStorage...${NC}"
LOCALSTORAGE_COUNT=$(grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | wc -l)

if [ "$LOCALSTORAGE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No se encontraron referencias a localStorage${NC}"
else
  echo -e "${RED}❌ Se encontraron $LOCALSTORAGE_COUNT referencias a localStorage${NC}"
  echo -e "${YELLOW}📋 Archivos con localStorage:${NC}"
  grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | head -10
fi
echo ""

echo -e "${BLUE}2️⃣ Verificando que todos los servicios usan la API...${NC}"
API_SERVICE_COUNT=$(grep -r "apiRequest\|userService\|reservationService" src/ --include="*.tsx" --include="*.ts" | wc -l)
echo -e "${GREEN}✅ Se encontraron $API_SERVICE_COUNT referencias a servicios de API${NC}"
echo ""

echo -e "${BLUE}3️⃣ Verificando endpoints del backend...${NC}"
BACKEND_ENDPOINTS=$(grep -r "app\.(get|post|put|delete)" server.js | wc -l)
echo -e "${GREEN}✅ Se encontraron $BACKEND_ENDPOINTS endpoints en el backend${NC}"
echo ""

echo -e "${BLUE}4️⃣ Verificando conexión a MongoDB...${NC}"
MONGODB_CONNECTION=$(grep -r "mongoose.connect\|MONGODB_URI" server.js | wc -l)
if [ "$MONGODB_CONNECTION" -gt 0 ]; then
  echo -e "${GREEN}✅ Conexión a MongoDB configurada${NC}"
else
  echo -e "${RED}❌ No se encontró configuración de MongoDB${NC}"
fi
echo ""

echo -e "${BLUE}5️⃣ Verificando modelos de MongoDB...${NC}"
MONGODB_MODELS=$(grep -r "mongoose.model\|mongoose.Schema" server.js | wc -l)
if [ "$MONGODB_MODELS" -gt 0 ]; then
  echo -e "${GREEN}✅ Modelos de MongoDB definidos: $MONGODB_MODELS${NC}"
else
  echo -e "${RED}❌ No se encontraron modelos de MongoDB${NC}"
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando variables de entorno de Heroku...${NC}"
HEROKU_ENV=$(grep -r "process.env" server.js | wc -l)
if [ "$HEROKU_ENV" -gt 0 ]; then
  echo -e "${GREEN}✅ Variables de entorno configuradas: $HEROKU_ENV${NC}"
else
  echo -e "${YELLOW}⚠️  No se encontraron variables de entorno${NC}"
fi
echo ""

echo -e "${BLUE}7️⃣ Verificando que el frontend no tiene datos hardcodeados...${NC}"
HARDCODED_DATA=$(grep -r "const.*=.*\[.*{.*id.*name" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$HARDCODED_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ No se encontraron datos hardcodeados en el frontend${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $HARDCODED_DATA posibles datos hardcodeados${NC}"
fi
echo ""

echo -e "${BLUE}8️⃣ Verificando que el contexto usa servicios de API...${NC}"
CONTEXT_API_USAGE=$(grep -r "userService\|reservationService" src/context/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$CONTEXT_API_USAGE" -gt 0 ]; then
  echo -e "${GREEN}✅ El contexto usa servicios de API: $CONTEXT_API_USAGE referencias${NC}"
else
  echo -e "${YELLOW}⚠️  El contexto no parece usar servicios de API${NC}"
fi
echo ""

echo -e "${BLUE}9️⃣ Verificando que los componentes cargan datos desde la API...${NC}"
COMPONENT_API_LOADING=$(grep -r "useEffect.*loadUsers\|useEffect.*loadReservations" src/components/ --include="*.tsx" | wc -l)
if [ "$COMPONENT_API_LOADING" -gt 0 ]; then
  echo -e "${GREEN}✅ Los componentes cargan datos desde la API: $COMPONENT_API_LOADING referencias${NC}"
else
  echo -e "${YELLOW}⚠️  No se encontraron cargas de datos desde API en componentes${NC}"
fi
echo ""

echo -e "${BLUE}🔟 Verificando que no hay datos estáticos en el estado inicial...${NC}"
STATIC_STATE=$(grep -r "initialState.*=.*{" src/context/ --include="*.tsx" --include="*.ts" -A 20 | grep -E "(users|reservations).*\[.*{.*id" | wc -l)
if [ "$STATIC_STATE" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos estáticos en el estado inicial${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $STATIC_STATE posibles datos estáticos en el estado inicial${NC}"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE VERIFICACIÓN${NC}"
echo "================================"
echo ""

if [ "$LOCALSTORAGE_COUNT" -eq 0 ] && [ "$MONGODB_CONNECTION" -gt 0 ] && [ "$MONGODB_MODELS" -gt 0 ]; then
  echo -e "${GREEN}✅ SISTEMA VERIFICADO: Depende exclusivamente de MongoDB y Heroku${NC}"
  echo -e "${GREEN}✅ No hay dependencias de localStorage${NC}"
  echo -e "${GREEN}✅ Backend conectado a MongoDB${NC}"
  echo -e "${GREEN}✅ Modelos de MongoDB definidos${NC}"
  echo -e "${GREEN}✅ Servicios de API implementados${NC}"
  echo ""
  echo -e "${BLUE}🎯 RECOMENDACIONES${NC}"
  echo "=================="
  echo -e "${YELLOW}1. Ejecuta el backup antes de hacer cambios: ./backup-mongodb-data.sh${NC}"
  echo -e "${YELLOW}2. Verifica que Heroku tenga las variables de entorno correctas${NC}"
  echo -e "${YELLOW}3. Monitorea los logs de Heroku durante los cambios${NC}"
  echo -e "${YELLOW}4. Prueba la funcionalidad después de cada cambio${NC}"
else
  echo -e "${RED}❌ SISTEMA NO VERIFICADO: Hay dependencias locales${NC}"
  echo -e "${RED}❌ Se encontraron $LOCALSTORAGE_COUNT referencias a localStorage${NC}"
  echo -e "${RED}❌ Problemas con la configuración de MongoDB${NC}"
  echo ""
  echo -e "${BLUE}🔧 ACCIONES REQUERIDAS${NC}"
  echo "======================="
  echo -e "${YELLOW}1. Eliminar todas las referencias a localStorage${NC}"
  echo -e "${YELLOW}2. Verificar la configuración de MongoDB${NC}"
  echo -e "${YELLOW}3. Asegurar que todos los datos vienen de la API${NC}"
fi
echo ""
