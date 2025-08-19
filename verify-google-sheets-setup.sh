#!/bin/bash

echo "🔍 Verificación Completa de Google Sheets"
echo "========================================="
echo ""

echo "📋 1. Verificando configuración actual..."
heroku config | grep GOOGLE
echo ""

echo "📋 2. Verificando que las variables estén configuradas..."
SHEETS_ID=$(heroku config:get REACT_APP_GOOGLE_SHEETS_ID)
API_KEY=$(heroku config:get REACT_APP_GOOGLE_API_KEY)

if [ -z "$SHEETS_ID" ]; then
    echo "❌ REACT_APP_GOOGLE_SHEETS_ID no está configurado"
else
    echo "✅ REACT_APP_GOOGLE_SHEETS_ID: $SHEETS_ID"
fi

if [ -z "$API_KEY" ]; then
    echo "❌ REACT_APP_GOOGLE_API_KEY no está configurado"
else
    echo "✅ REACT_APP_GOOGLE_API_KEY: Configurada"
fi

echo ""
echo "📋 3. Verificando URLs importantes..."
echo "   - Hoja de Google Sheets: https://docs.google.com/spreadsheets/d/$SHEETS_ID/edit"
echo "   - Google Cloud Console: https://console.cloud.google.com/"
echo "   - Aplicación TRIBUS: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/"
echo ""

echo "📋 4. Pasos para completar la configuración:"
echo ""
echo "   🔧 En Google Sheets:"
echo "   - Ve a la hoja y haz clic en 'Compartir'"
echo "   - Agrega tu email con permisos de 'Editor'"
echo "   - Desmarca 'Notificar a las personas'"
echo ""
echo "   🔧 En Google Cloud Console:"
echo "   - Verifica que Google Sheets API esté habilitada"
echo "   - Crea una nueva API Key sin restricciones"
echo "   - Configura la pantalla de consentimiento como 'Externo'"
echo ""
echo "   🔧 En la Aplicación:"
echo "   - Inicia sesión como administrador"
echo "   - Ve a 'Google Sheets' en el panel de administración"
echo "   - Haz clic en 'Probar Conexión'"
echo "   - Si es exitosa, haz clic en 'Inicializar Hoja'"
echo ""

echo "📋 5. Para actualizar la API Key:"
echo "   ./update-api-key.sh"
echo ""

echo "🎯 Estado actual:"
if [ -n "$SHEETS_ID" ] && [ -n "$API_KEY" ]; then
    echo "✅ Configuración básica completada"
    echo "⚠️  Necesitas verificar permisos y probar conexión"
else
    echo "❌ Configuración incompleta"
    echo "⚠️  Necesitas configurar las variables de entorno"
fi

echo ""
