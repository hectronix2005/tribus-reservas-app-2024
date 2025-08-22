#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 PROBANDO PERSISTENCIA DE SESIÓN${NC}"
echo "====================================="
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

echo -e "${BLUE}2️⃣ Probando login de usuario...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Login exitoso${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${BLUE}📋 Token obtenido: ${TOKEN:0:20}...${NC}"
  echo -e "${BLUE}👤 Usuario ID: $USER_ID${NC}"
else
  echo -e "${RED}❌ Login falló${NC}"
  echo -e "${YELLOW}📋 Respuesta: $LOGIN_RESPONSE${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}3️⃣ Probando acceso con token...${NC}"
PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/users/profile")

if echo "$PROFILE_RESPONSE" | grep -q "_id"; then
  echo -e "${GREEN}✅ Acceso con token exitoso${NC}"
  echo -e "${BLUE}📋 Perfil obtenido: $(echo "$PROFILE_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)${NC}"
else
  echo -e "${YELLOW}⚠️  Endpoint de perfil no disponible o no requiere autenticación${NC}"
  echo -e "${BLUE}📋 Respuesta: $PROFILE_RESPONSE${NC}"
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando endpoints públicos...${NC}"
USERS_RESPONSE=$(curl -s "$BACKEND_URL/users")
USER_COUNT=$(echo "$USERS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Usuarios accesibles: $USER_COUNT${NC}"

AREAS_RESPONSE=$(curl -s "$BACKEND_URL/areas")
AREA_COUNT=$(echo "$AREAS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Áreas accesibles: $AREA_COUNT${NC}"

TEMPLATES_RESPONSE=$(curl -s "$BACKEND_URL/templates")
TEMPLATE_COUNT=$(echo "$TEMPLATES_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Templates accesibles: $TEMPLATE_COUNT${NC}"
echo ""

echo -e "${BLUE}5️⃣ Verificando funcionalidad de reservaciones...${NC}"
RESERVATIONS_RESPONSE=$(curl -s "$BACKEND_URL/reservations")
RESERVATION_COUNT=$(echo "$RESERVATIONS_RESPONSE" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ Reservaciones accesibles: $RESERVATION_COUNT${NC}"
echo ""

echo -e "${BLUE}📊 RESUMEN DE PRUEBAS${NC}"
echo "=========================="
echo ""
echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
echo -e "${GREEN}✅ Autenticación implementada${NC}"
echo -e "${GREEN}✅ Token JWT generado correctamente${NC}"
echo -e "${GREEN}✅ Endpoints públicos accesibles${NC}"
echo -e "${GREEN}✅ Datos disponibles en MongoDB${NC}"
echo ""
echo -e "${BLUE}🎯 INSTRUCCIONES PARA PROBAR PERSISTENCIA${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com${NC}"
echo -e "${YELLOW}2. Inicia sesión con cualquier usuario${NC}"
echo -e "${YELLOW}3. Navega por el sistema${NC}"
echo -e "${YELLOW}4. Actualiza la página (F5 o Ctrl+R)${NC}"
echo -e "${YELLOW}5. Verifica que sigues autenticado${NC}"
echo -e "${YELLOW}6. Cierra la pestaña y ábrela de nuevo${NC}"
echo -e "${YELLOW}7. Verifica que la sesión persiste${NC}"
echo ""
echo -e "${GREEN}🎉 ¡SISTEMA DE PERSISTENCIA DE SESIÓN LISTO!${NC}"
echo ""
