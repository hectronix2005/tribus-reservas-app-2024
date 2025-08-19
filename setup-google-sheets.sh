#!/bin/bash

# Script de configuración automática para Google Sheets
echo "🚀 Configuración de Google Sheets para TRIBUS"
echo "=============================================="
echo ""

# Verificar si Heroku CLI está instalado
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI no está instalado."
    echo "Por favor, instala Heroku CLI desde: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo "✅ Heroku CLI detectado"
echo ""

# Solicitar credenciales
echo "📋 Ingresa las credenciales de Google Sheets:"
echo ""

read -p "🔑 ID de la hoja de Google Sheets: " SHEETS_ID
read -p "🔑 Clave de API de Google: " API_KEY

# Validar que no estén vacías
if [ -z "$SHEETS_ID" ] || [ -z "$API_KEY" ]; then
    echo "❌ Error: Las credenciales no pueden estar vacías"
    exit 1
fi

echo ""
echo "⚙️ Configurando variables de entorno en Heroku..."

# Configurar variables de entorno
heroku config:set REACT_APP_GOOGLE_SHEETS_ID="$SHEETS_ID"
heroku config:set REACT_APP_GOOGLE_API_KEY="$API_KEY"

echo ""
echo "✅ Variables de entorno configuradas"
echo ""

# Mostrar configuración actual
echo "📊 Configuración actual:"
heroku config | grep -E "(GOOGLE_SHEETS|GOOGLE_API)"

echo ""
echo "🔄 Desplegando aplicación con nueva configuración..."
git add .
git commit -m "Update Google Sheets configuration"
git push heroku main

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a la aplicación: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/"
echo "2. Inicia sesión como administrador"
echo "3. Ve a 'Google Sheets' en el panel de administración"
echo "4. Haz clic en 'Inicializar Hoja'"
echo "5. ¡Listo! Las reservas se guardarán automáticamente"
echo ""
echo "📖 Para más información, consulta: GOOGLE_SHEETS_SETUP.md"
