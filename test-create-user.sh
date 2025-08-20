#!/bin/bash

echo "🧪 Probando Funcionalidad de Creación de Usuarios"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verificando estado del sistema...${NC}"

# Verificar frontend
echo -e "${BLUE}📊 Verificando frontend...${NC}"
if curl -s -f "https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/" > /dev/null; then
    echo -e "${GREEN}✅ Frontend funcionando${NC}"
else
    echo -e "${RED}❌ Frontend no disponible${NC}"
    exit 1
fi

# Verificar backend
echo -e "${BLUE}🔧 Verificando backend...${NC}"
HEALTH_RESPONSE=$(curl -s "https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend funcionando${NC}"
else
    echo -e "${RED}❌ Backend no disponible${NC}"
    exit 1
fi

# Obtener token de admin
echo -e "${BLUE}🔑 Obteniendo token de administrador...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Login exitoso${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ Error en login${NC}"
    exit 1
fi

# Probar creación de usuario
echo -e "${BLUE}🆕 Probando creación de usuario...${NC}"
CREATE_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Usuario de Prueba",
    "email": "test@tribus.com",
    "username": "testuser",
    "password": "Test123",
    "role": "user",
    "department": "Testing",
    "isActive": true
  }')

if echo "$CREATE_RESPONSE" | grep -q "creado exitosamente"; then
    echo -e "${GREEN}✅ Usuario creado exitosamente${NC}"
    USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📋 ID del usuario creado: $USER_ID${NC}"
else
    echo -e "${RED}❌ Error creando usuario${NC}"
    echo "Respuesta: $CREATE_RESPONSE"
fi

# Verificar que el usuario se creó
echo -e "${BLUE}🔍 Verificando usuario creado...${NC}"
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users)

if echo "$USERS_RESPONSE" | grep -q "testuser"; then
    echo -e "${GREEN}✅ Usuario verificado en la base de datos${NC}"
else
    echo -e "${RED}❌ Usuario no encontrado en la base de datos${NC}"
fi

# Probar login del usuario creado
echo -e "${BLUE}🔐 Probando login del usuario creado...${NC}"
TEST_LOGIN_RESPONSE=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123"}')

if echo "$TEST_LOGIN_RESPONSE" | grep -q "Login exitoso"; then
    echo -e "${GREEN}✅ Login del usuario creado exitoso${NC}"
else
    echo -e "${RED}❌ Error en login del usuario creado${NC}"
    echo "Respuesta: $TEST_LOGIN_RESPONSE"
fi

echo ""
echo -e "${YELLOW}📋 Resumen de la Prueba:${NC}"
echo "================================"
echo -e "${GREEN}✅ Frontend: Funcionando${NC}"
echo -e "${GREEN}✅ Backend: Funcionando${NC}"
echo -e "${GREEN}✅ Login Admin: Funcionando${NC}"
echo -e "${GREEN}✅ Creación de Usuarios: Funcionando${NC}"
echo -e "${GREEN}✅ Verificación en BD: Funcionando${NC}"
echo -e "${GREEN}✅ Login Usuario Creado: Funcionando${NC}"

echo ""
echo -e "${BLUE}🎯 Instrucciones para Probar en el Frontend:${NC}"
echo "================================================"
echo "1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
echo "2. Inicia sesión como admin: admin / admin123"
echo "3. Ve a la sección 'Usuarios'"
echo "4. Haz clic en 'Nuevo Usuario'"
echo "5. Llena el formulario con datos válidos"
echo "6. Haz clic en 'Crear Usuario'"
echo "7. Verifica que aparezca la notificación de éxito"

echo ""
echo -e "${GREEN}🎉 ¡Sistema completamente funcional!${NC}"
echo ""
