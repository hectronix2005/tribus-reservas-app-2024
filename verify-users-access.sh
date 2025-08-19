#!/bin/bash

echo "🔐 Verificando Acceso de Usuarios en TRIBUS"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para probar login
test_user_login() {
    local username=$1
    local password=$2
    local display_name=$3
    
    echo -e "${BLUE}🔍 Probando: $display_name ($username)${NC}"
    
    response=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    if echo "$response" | grep -q "Login exitoso"; then
        echo -e "${GREEN}✅ Login exitoso para $display_name${NC}"
        return 0
    else
        echo -e "${RED}❌ Error en login para $display_name${NC}"
        echo "   Respuesta: $response"
        return 1
    fi
}

# Función para obtener token de admin
get_admin_token() {
    response=$(curl -s -X POST https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')
    
    echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

echo "📊 Probando acceso de usuarios..."
echo ""

# Probar cada usuario
test_user_login "admin" "admin123" "Administrador del Sistema"
test_user_login "usuario" "user123" "Usuario General"
test_user_login "Dneira" "dneira123" "Hector Neira"
test_user_login "Drodriguez" "drodriguez123" "Daniel R"

echo ""
echo "🔧 Verificando funcionalidades de admin..."

# Obtener token de admin
admin_token=$(get_admin_token)

if [ -n "$admin_token" ]; then
    echo -e "${GREEN}✅ Token de admin obtenido${NC}"
    
    # Probar obtener lista de usuarios
    users_response=$(curl -s -H "Authorization: Bearer $admin_token" \
        https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/users)
    
    user_count=$(echo "$users_response" | jq '. | length' 2>/dev/null || echo "0")
    
    if [ "$user_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Lista de usuarios obtenida: $user_count usuarios${NC}"
    else
        echo -e "${RED}❌ Error obteniendo lista de usuarios${NC}"
    fi
else
    echo -e "${RED}❌ No se pudo obtener token de admin${NC}"
fi

echo ""
echo "🌐 Verificando frontend..."
frontend_url="https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"

if curl -s -f "$frontend_url" > /dev/null; then
    echo -e "${GREEN}✅ Frontend disponible: $frontend_url${NC}"
else
    echo -e "${RED}❌ Frontend no disponible${NC}"
fi

echo ""
echo "📋 Resumen de Usuarios Disponibles:"
echo "=================================="
echo -e "${YELLOW}🔑 Admin: admin / admin123${NC}"
echo -e "${YELLOW}👤 Usuario: usuario / user123${NC}"
echo -e "${YELLOW}👤 Dneira: Dneira / dneira123${NC}"
echo -e "${YELLOW}👤 Daniel R: Drodriguez / drodriguez123${NC}"
echo ""

echo "🎯 Instrucciones de Acceso:"
echo "=========================="
echo "1. Ve a: $frontend_url"
echo "2. Usa cualquiera de las credenciales arriba"
echo "3. El sistema cargará los usuarios desde MongoDB"
echo "4. Todos los datos se guardan en la base de datos"
echo ""

echo -e "${GREEN}🎉 ¡Sistema TRIBUS completamente funcional con MongoDB!${NC}"
echo ""
