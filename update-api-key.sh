#!/bin/bash

echo "🔑 Actualizando API Key de Google Sheets"
echo "========================================"
echo ""

echo "📋 Configuración actual:"
heroku config | grep GOOGLE
echo ""

echo "⚠️  IMPORTANTE: Necesitas crear una nueva API Key en Google Cloud Console"
echo ""
echo "📋 Pasos para crear nueva API Key:"
echo ""
echo "1️⃣ Ve a Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials"
echo ""
echo "2️⃣ Selecciona tu proyecto 'TRIBUS-Sheets-API'"
echo ""
echo "3️⃣ Haz clic en 'Crear credenciales' > 'Clave de API'"
echo ""
echo "4️⃣ IMPORTANTE: No agregues restricciones de dominio"
echo "   - Deja la API Key completamente abierta para pruebas"
echo ""
echo "5️⃣ Copia la nueva clave generada"
echo ""

read -p "🔑 Ingresa la nueva API Key: " NEW_API_KEY

if [ -z "$NEW_API_KEY" ]; then
    echo "❌ Error: La API Key no puede estar vacía"
    exit 1
fi

echo ""
echo "⚙️ Actualizando variable de entorno..."

# Actualizar la API Key
heroku config:set REACT_APP_GOOGLE_API_KEY="$NEW_API_KEY"

echo ""
echo "✅ API Key actualizada"
echo ""

echo "📊 Nueva configuración:"
heroku config | grep GOOGLE
echo ""

echo "🔄 Desplegando aplicación con nueva configuración..."
git add .
git commit -m "Update Google Sheets API Key"
git push heroku main

echo ""
echo "🎉 ¡Configuración actualizada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a la aplicación: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/"
echo "2. Inicia sesión como administrador"
echo "3. Ve a 'Google Sheets' en el panel de administración"
echo "4. Haz clic en 'Probar Conexión'"
echo "5. Si es exitosa, haz clic en 'Inicializar Hoja'"
echo ""
