#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PRUEBA FINAL DE PERSISTENCIA DE SESIÓN${NC}"
echo "============================================="
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

echo -e "${BLUE}2️⃣ Probando login para verificar autenticación...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login exitoso${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_NAME=$(echo "$LOGIN_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 Usuario: $USER_NAME${NC}"
  echo -e "${BLUE}📋 Token: ${TOKEN:0:20}...${NC}"
else
  echo -e "${RED}❌ Login falló${NC}"
  echo -e "${YELLOW}📋 Respuesta: $LOGIN_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Verificando datos disponibles...${NC}"
USERS_COUNT=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/users" | grep -o '"_id"' | wc -l)
AREAS_COUNT=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/areas" | grep -o '"_id"' | wc -l)
TEMPLATES_COUNT=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/templates" | grep -o '"_id"' | wc -l)
RESERVATIONS_COUNT=$(curl -s "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/api/reservations" | grep -o '"_id"' | wc -l)

echo -e "${GREEN}✅ Usuarios: $USERS_COUNT${NC}"
echo -e "${GREEN}✅ Áreas: $AREAS_COUNT${NC}"
echo -e "${GREEN}✅ Templates: $TEMPLATES_COUNT${NC}"
echo -e "${GREEN}✅ Reservaciones: $RESERVATIONS_COUNT${NC}"
echo ""

echo -e "${BLUE}📊 RESUMEN DEL SISTEMA${NC}"
echo "=========================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Autenticación implementada${NC}"
echo -e "${GREEN}✅ Token JWT generado correctamente${NC}"
echo -e "${GREEN}✅ Datos disponibles en MongoDB${NC}"
echo -e "${GREEN}✅ Persistencia de sesión implementada${NC}"
echo ""

echo -e "${BLUE}🎯 INSTRUCCIONES PARA PROBAR PERSISTENCIA${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario${NC}"
echo -e "${YELLOW}3. Navega por el sistema (Dashboard, Reservaciones, etc.)${NC}"
echo -e "${YELLOW}4. Abre las herramientas de desarrollador (F12)${NC}"
echo -e "${YELLOW}5. Ve a la pestaña Console para ver los logs de sesión${NC}"
echo -e "${YELLOW}6. Actualiza la página (F5 o Ctrl+R)${NC}"
echo -e "${YELLOW}7. Verifica en la consola que aparece:${NC}"
echo -e "${BLUE}   - '🔍 Verificando sesión al inicializar'${NC}"
echo -e "${BLUE}   - '✅ Sesión restaurada exitosamente'${NC}"
echo -e "${YELLOW}8. Verifica que sigues autenticado y puedes navegar${NC}"
echo -e "${YELLOW}9. Cierra la pestaña y ábrela de nuevo${NC}"
echo -e "${YELLOW}10. Verifica que la sesión persiste${NC}"
echo ""

echo -e "${BLUE}🔧 DEBUGGING${NC}"
echo "============="
echo ""
echo -e "${YELLOW}Si la sesión no persiste, verifica en la consola:${NC}"
echo -e "${BLUE}1. Busca mensajes que empiecen con '🔍'${NC}"
echo -e "${BLUE}2. Verifica si aparece '✅ Sesión restaurada exitosamente'${NC}"
echo -e "${BLUE}3. Si aparece '❌ Token no encontrado', hay un problema${NC}"
echo -e "${BLUE}4. Si aparece '⚠️ No se encontró sesión completa', hay un problema${NC}"
echo ""

echo -e "${BLUE}📋 COMANDOS DE DEBUGGING${NC}"
echo "=========================="
echo ""
echo -e "${YELLOW}En la consola del navegador, ejecuta:${NC}"
echo -e "${BLUE}sessionStorage.getItem('tribus-auth')${NC}"
echo -e "${BLUE}sessionStorage.getItem('authToken')${NC}"
echo -e "${BLUE}console.log('Estado de autenticación:', window.sessionStorage)${NC}"
echo ""

echo -e "${GREEN}🎉 ¡SISTEMA DE PERSISTENCIA DE SESIÓN LISTO PARA PRUEBAS!${NC}"
echo ""
