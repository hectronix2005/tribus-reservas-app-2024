#!/bin/bash

echo "🔧 Solucionando Problemas de Permisos de Google Sheets"
echo "======================================================"
echo ""

# Verificar configuración actual
echo "📋 Configuración actual:"
heroku config | grep GOOGLE
echo ""

echo "🔍 Pasos para solucionar el error 403:"
echo ""
echo "1️⃣ CONFIGURAR PERMISOS DE LA HOJA:"
echo "   - Ve a: https://docs.google.com/spreadsheets/d/1Y9EEbhFmQdrD8kbwS4QSnAVeeA5fDjjyVIE1mzbY14I/edit"
echo "   - Haz clic en 'Compartir' (arriba a la derecha)"
echo "   - Agrega tu email con permisos de 'Editor'"
echo "   - Desmarca 'Notificar a las personas'"
echo "   - Haz clic en 'Listo'"
echo ""

echo "2️⃣ CONFIGURAR GOOGLE CLOUD CONSOLE:"
echo "   - Ve a: https://console.cloud.google.com/apis/credentials"
echo "   - Selecciona tu proyecto 'TRIBUS-Sheets-API'"
echo "   - Ve a 'APIs y servicios' > 'Pantalla de consentimiento de OAuth'"
echo "   - Configura como 'Externo'"
echo "   - Agrega tu email como usuario de prueba"
echo ""

echo "3️⃣ VERIFICAR API KEY:"
echo "   - Ve a 'APIs y servicios' > 'Credenciales'"
echo "   - Verifica que tu API Key esté activa"
echo "   - Asegúrate de que no tenga restricciones de dominio"
echo ""

echo "4️⃣ HABILITAR API:"
echo "   - Ve a 'APIs y servicios' > 'Biblioteca'"
echo "   - Busca 'Google Sheets API'"
echo "   - Asegúrate de que esté habilitada"
echo ""

echo "5️⃣ PROBAR CONEXIÓN:"
echo "   - Ve a la aplicación: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/"
echo "   - Inicia sesión como administrador"
echo "   - Ve a 'Google Sheets' en el panel de administración"
echo "   - Haz clic en 'Probar Conexión'"
echo ""

echo "6️⃣ INICIALIZAR HOJA:"
echo "   - Si la conexión es exitosa, haz clic en 'Inicializar Hoja'"
echo "   - Esto creará las columnas necesarias"
echo ""

echo "7️⃣ CREAR RESERVA DE PRUEBA:"
echo "   - Ve a 'Reservas' en el menú"
echo "   - Crea una nueva reserva"
echo "   - Verifica que aparezca en Google Sheets"
echo ""

echo "🔗 Enlaces importantes:"
echo "   - Hoja de Google Sheets: https://docs.google.com/spreadsheets/d/1Y9EEbhFmQdrD8kbwS4QSnAVeeA5fDjjyVIE1mzbY14I/edit"
echo "   - Google Cloud Console: https://console.cloud.google.com/"
echo "   - Aplicación TRIBUS: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/"
echo ""

echo "📞 Si el problema persiste:"
echo "   - Verifica que la API Key no tenga restricciones"
echo "   - Asegúrate de que la hoja esté compartida correctamente"
echo "   - Revisa los logs en la consola del navegador"
echo ""
