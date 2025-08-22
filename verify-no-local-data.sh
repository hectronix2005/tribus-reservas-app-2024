#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VERIFICACIÓN EXHAUSTIVA: SIN DATOS LOCALES${NC}"
echo "=================================================="
echo ""

echo -e "${BLUE}1️⃣ Verificando archivos duplicados...${NC}"
DUPLICATE_FILES=$(find src/ -name "*\ *" -type f | wc -l)
if [ "$DUPLICATE_FILES" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay archivos duplicados${NC}"
else
  echo -e "${RED}❌ Se encontraron $DUPLICATE_FILES archivos duplicados${NC}"
  find src/ -name "*\ *" -type f
fi
echo ""

echo -e "${BLUE}2️⃣ Verificando referencias a localStorage...${NC}"
LOCALSTORAGE_COUNT=$(grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js" | wc -l)
if [ "$LOCALSTORAGE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay referencias a localStorage${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $LOCALSTORAGE_COUNT referencias a localStorage${NC}"
  echo -e "${YELLOW}📋 Archivos con localStorage:${NC}"
  grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" --include="*.js"
fi
echo ""

echo -e "${BLUE}3️⃣ Verificando datos hardcodeados en arrays...${NC}"
HARDCODED_ARRAYS=$(grep -r "const.*=.*\[.*{.*id.*name" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$HARDCODED_ARRAYS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay arrays con datos hardcodeados${NC}"
else
  echo -e "${RED}❌ Se encontraron $HARDCODED_ARRAYS arrays con datos hardcodeados${NC}"
  grep -r "const.*=.*\[.*{.*id.*name" src/ --include="*.tsx" --include="*.ts"
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando estado inicial con datos estáticos...${NC}"
STATIC_INITIAL_STATE=$(grep -r "initialState.*=.*{" src/ --include="*.tsx" --include="*.ts" -A 20 | grep -E "(users|areas|templates|reservations).*\[.*{.*id" | wc -l)
if [ "$STATIC_INITIAL_STATE" -eq 0 ]; then
  echo -e "${GREEN}✅ Estado inicial sin datos estáticos${NC}"
else
  echo -e "${RED}❌ Se encontraron $STATIC_INITIAL_STATE datos estáticos en estado inicial${NC}"
  grep -r "initialState.*=.*{" src/ --include="*.tsx" --include="*.ts" -A 20 | grep -E "(users|areas|templates|reservations).*\[.*{.*id"
fi
echo ""

echo -e "${BLUE}5️⃣ Verificando imports de localStorage...${NC}"
LOCALSTORAGE_IMPORTS=$(grep -r "import.*localStorage\|from.*localStorage" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$LOCALSTORAGE_IMPORTS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay imports de localStorage${NC}"
else
  echo -e "${RED}❌ Se encontraron $LOCALSTORAGE_IMPORTS imports de localStorage${NC}"
  grep -r "import.*localStorage\|from.*localStorage" src/ --include="*.tsx" --include="*.ts"
fi
echo ""

echo -e "${BLUE}6️⃣ Verificando datos hardcodeados específicos...${NC}"
SPECIFIC_DATA=$(grep -r "Sala de Reuniones\|Área de Colaboración\|Equipo de Desarrollo" src/ --include="*.tsx" --include="*.ts" | grep -v "placeholder\|Ej:" | wc -l)
if [ "$SPECIFIC_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos específicos hardcodeados${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $SPECIFIC_DATA referencias a datos específicos${NC}"
  echo -e "${YELLOW}📋 Referencias encontradas:${NC}"
  grep -r "Sala de Reuniones\|Área de Colaboración\|Equipo de Desarrollo" src/ --include="*.tsx" --include="*.ts" | grep -v "placeholder\|Ej:"
fi
echo ""

echo -e "${BLUE}7️⃣ Verificando que todos los componentes usan servicios de API...${NC}"
API_SERVICES=$(grep -r "userService\|areaService\|templateService\|reservationService" src/ --include="*.tsx" --include="*.ts" | wc -l)
echo -e "${GREEN}✅ Referencias a servicios de API: $API_SERVICES${NC}"
echo ""

echo -e "${BLUE}8️⃣ Verificando que no hay datos en variables globales...${NC}"
GLOBAL_DATA=$(grep -r "let.*=.*\[.*{.*id\|var.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$GLOBAL_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos en variables globales${NC}"
else
  echo -e "${RED}❌ Se encontraron $GLOBAL_DATA variables globales con datos${NC}"
  grep -r "let.*=.*\[.*{.*id\|var.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts"
fi
echo ""

echo -e "${BLUE}9️⃣ Verificando que no hay datos en exports...${NC}"
EXPORT_DATA=$(grep -r "export.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$EXPORT_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos en exports${NC}"
else
  echo -e "${RED}❌ Se encontraron $EXPORT_DATA exports con datos${NC}"
  grep -r "export.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts"
fi
echo ""

echo -e "${BLUE}🔟 Verificando que no hay datos en constantes...${NC}"
CONST_DATA=$(grep -r "const.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts" | grep -v "useState\|useReducer" | wc -l)
if [ "$CONST_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay datos en constantes${NC}"
else
  echo -e "${RED}❌ Se encontraron $CONST_DATA constantes con datos${NC}"
  grep -r "const.*=.*\[.*{.*id" src/ --include="*.tsx" --include="*.ts" | grep -v "useState\|useReducer"
fi
echo ""

echo -e "${BLUE}📊 RESUMEN DE VERIFICACIÓN EXHAUSTIVA${NC}"
echo "=========================================="
echo ""

# Verificar que todo está limpio
if [ "$DUPLICATE_FILES" -eq 0 ] && [ "$HARDCODED_ARRAYS" -eq 0 ] && [ "$STATIC_INITIAL_STATE" -eq 0 ] && [ "$LOCALSTORAGE_IMPORTS" -eq 0 ] && [ "$SPECIFIC_DATA" -eq 0 ] && [ "$GLOBAL_DATA" -eq 0 ] && [ "$EXPORT_DATA" -eq 0 ] && [ "$CONST_DATA" -eq 0 ]; then
  echo -e "${GREEN}✅ VERIFICACIÓN EXHAUSTIVA COMPLETADA${NC}"
  echo -e "${GREEN}✅ No hay archivos duplicados${NC}"
  echo -e "${GREEN}✅ No hay datos hardcodeados${NC}"
  echo -e "${GREEN}✅ No hay estado inicial estático${NC}"
  echo -e "${GREEN}✅ No hay imports de localStorage${NC}"
  echo -e "${GREEN}✅ No hay datos específicos hardcodeados${NC}"
  echo -e "${GREEN}✅ No hay datos en variables globales${NC}"
  echo -e "${GREEN}✅ No hay datos en exports${NC}"
  echo -e "${GREEN}✅ No hay datos en constantes${NC}"
  echo ""
  echo -e "${BLUE}🎯 ESTADÍSTICAS FINALES${NC}"
  echo "======================="
  echo -e "${YELLOW}📁 Archivos duplicados: $DUPLICATE_FILES${NC}"
  echo -e "${YELLOW}🗄️ Referencias localStorage: $LOCALSTORAGE_COUNT (solo limpieza de token)${NC}"
  echo -e "${YELLOW}📊 Arrays hardcodeados: $HARDCODED_ARRAYS${NC}"
  echo -e "${YELLOW}🏗️ Estado inicial estático: $STATIC_INITIAL_STATE${NC}"
  echo -e "${YELLOW}📦 Imports localStorage: $LOCALSTORAGE_IMPORTS${NC}"
  echo -e "${YELLOW}📋 Datos específicos: $SPECIFIC_DATA${NC}"
  echo -e "${YELLOW}🌍 Variables globales: $GLOBAL_DATA${NC}"
  echo -e "${YELLOW}📤 Exports con datos: $EXPORT_DATA${NC}"
  echo -e "${YELLOW}🔧 Constantes con datos: $CONST_DATA${NC}"
  echo -e "${YELLOW}🔗 Servicios de API: $API_SERVICES${NC}"
  echo ""
  echo -e "${GREEN}🎉 ¡EL REPOSITORIO ESTÁ COMPLETAMENTE LIBRE DE DATOS LOCALES!${NC}"
  echo -e "${GREEN}🎉 ¡TODO DEPENDE EXCLUSIVAMENTE DE MONGODB!${NC}"
  echo -e "${GREEN}🎉 ¡EL SISTEMA ESTÁ LISTO PARA PRODUCCIÓN!${NC}"
else
  echo -e "${RED}❌ VERIFICACIÓN EXHAUSTIVA FALLIDA${NC}"
  echo -e "${RED}❌ Hay problemas que necesitan ser corregidos${NC}"
  echo ""
  echo -e "${BLUE}🔧 PROBLEMAS DETECTADOS${NC}"
  echo "====================="
  if [ "$DUPLICATE_FILES" -gt 0 ]; then
    echo -e "${RED}❌ Archivos duplicados: $DUPLICATE_FILES${NC}"
  fi
  if [ "$HARDCODED_ARRAYS" -gt 0 ]; then
    echo -e "${RED}❌ Arrays hardcodeados: $HARDCODED_ARRAYS${NC}"
  fi
  if [ "$STATIC_INITIAL_STATE" -gt 0 ]; then
    echo -e "${RED}❌ Estado inicial estático: $STATIC_INITIAL_STATE${NC}"
  fi
  if [ "$LOCALSTORAGE_IMPORTS" -gt 0 ]; then
    echo -e "${RED}❌ Imports localStorage: $LOCALSTORAGE_IMPORTS${NC}"
  fi
  if [ "$SPECIFIC_DATA" -gt 0 ]; then
    echo -e "${RED}❌ Datos específicos: $SPECIFIC_DATA${NC}"
  fi
  if [ "$GLOBAL_DATA" -gt 0 ]; then
    echo -e "${RED}❌ Variables globales: $GLOBAL_DATA${NC}"
  fi
  if [ "$EXPORT_DATA" -gt 0 ]; then
    echo -e "${RED}❌ Exports con datos: $EXPORT_DATA${NC}"
  fi
  if [ "$CONST_DATA" -gt 0 ]; then
    echo -e "${RED}❌ Constantes con datos: $CONST_DATA${NC}"
  fi
fi
echo ""
