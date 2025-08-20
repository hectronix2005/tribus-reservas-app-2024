#!/bin/bash

echo "🔍 Debugging: Problema de Datos del Formulario"
echo "=============================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verificando que el frontend esté actualizado...${NC}"

# Verificar que el frontend se actualizó
FRONTEND_RESPONSE=$(curl -s https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/)
if echo "$FRONTEND_RESPONSE" | grep -q "main.bc90d4fc.js"; then
    echo -e "${GREEN}✅ Frontend actualizado con verificaciones adicionales${NC}"
else
    echo -e "${RED}❌ Frontend no se actualizó correctamente${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Verificando backend...${NC}"
HEALTH_RESPONSE=$(curl -s "https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend funcionando${NC}"
else
    echo -e "${RED}❌ Backend no disponible${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Problema Identificado:${NC}"
echo "================================"
echo -e "${RED}❌ Error: 'Todos los campos son requeridos'${NC}"
echo -e "${BLUE}📋 Causa probable: Datos vacíos enviados al backend${NC}"

echo ""
echo -e "${BLUE}🎯 Instrucciones Específicas para Debuggear:${NC}"
echo "=================================================="
echo "1. Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com"
echo "2. Inicia sesión como admin: admin / admin123"
echo "3. Ve a la sección 'Usuarios'"
echo "4. Haz clic en 'Nuevo Usuario'"
echo "5. Abre las herramientas de desarrollador (F12)"
echo "6. Ve a la pestaña 'Console'"
echo "7. Llena el formulario paso a paso y observa los logs:"
echo ""
echo -e "${YELLOW}📝 Logs que debes ver al llenar el formulario:${NC}"
echo "   - '📝 Estado actual del formulario: {...}' (cada vez que escribes)"
echo ""
echo "8. Llena todos los campos:"
echo "   - Nombre: Usuario Test"
echo "   - Email: test@example.com"
echo "   - Username: testuser"
echo "   - Contraseña: Test123"
echo "   - Rol: Usuario"
echo ""
echo "9. Haz clic en 'Crear Usuario'"
echo ""
echo -e "${YELLOW}📝 Logs que debes ver al enviar:${NC}"
echo "   - '🔍 Validación del formulario: {...}'"
echo "   - '🔍 Verificación final de datos: {...}'"
echo "   - '📤 Datos que se van a enviar al backend: {...}'"
echo "   - '🔑 Token de autenticación: Presente'"
echo "   - '🌐 Enviando request a: ...'"
echo "   - '📤 Configuración del request: {...}'"

echo ""
echo -e "${YELLOW}🔍 Posibles Problemas y Soluciones:${NC}"
echo "============================================="
echo -e "${RED}❌ Si NO ves '📝 Estado actual del formulario':${NC}"
echo "   - El formulario no se está actualizando"
echo "   - Refresca la página (Ctrl+F5)"
echo ""
echo -e "${RED}❌ Si ves '📝 Estado actual del formulario' con datos vacíos:${NC}"
echo "   - Los handlers del formulario no funcionan"
echo "   - Verifica que estés en la versión correcta"
echo ""
echo -e "${RED}❌ Si ves '❌ Formulario no válido, deteniendo envío':${NC}"
echo "   - La validación está fallando"
echo "   - Revisa los datos en '🔍 Verificación final de datos'"
echo ""
echo -e "${RED}❌ Si ves '❌ Error: Datos vacíos detectados antes del envío':${NC}"
echo "   - Los datos se están perdiendo antes del envío"
echo "   - Revisa el estado del formulario"
echo ""
echo -e "${RED}❌ Si ves '🔑 Token de autenticación: No encontrado':${NC}"
echo "   - El login no se completó correctamente"
echo "   - Haz logout y vuelve a hacer login"

echo ""
echo -e "${GREEN}🎉 ¡Sistema listo para debugging detallado!${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Comparte TODOS los logs de la consola para identificar el problema exacto${NC}"
echo ""
