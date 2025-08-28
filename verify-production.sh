#!/bin/bash

echo "🔍 Verificando configuración para producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    exit 1
fi

echo "✅ package.json encontrado"

# Verificar que el servidor esté configurado para MongoDB Atlas
if grep -q "mongodb+srv://tribus_admin" server.js; then
    echo "✅ Servidor configurado para MongoDB Atlas"
else
    echo "❌ Error: Servidor no está configurado para MongoDB Atlas"
    exit 1
fi

# Verificar que la API esté configurada para Heroku
if grep -q "tribus-reservas-app-2024.herokuapp.com" src/services/api.ts; then
    echo "✅ API configurada para Heroku"
else
    echo "❌ Error: API no está configurada para Heroku"
    exit 1
fi

# Verificar que el campo requestedSeats esté en el servidor
if grep -q "requestedSeats" server.js; then
    echo "✅ Campo requestedSeats configurado en el servidor"
else
    echo "❌ Error: Campo requestedSeats no encontrado en el servidor"
    exit 1
fi

# Verificar que el campo requestedSeats esté en el frontend
if grep -q "requestedSeats" src/components/Reservations.tsx; then
    echo "✅ Campo requestedSeats configurado en el frontend"
else
    echo "❌ Error: Campo requestedSeats no encontrado en el frontend"
    exit 1
fi

# Verificar que el campo de plantilla esté junto al área
if grep -q "Usar Plantilla" src/components/Reservations.tsx; then
    echo "✅ Campo de plantilla configurado"
else
    echo "❌ Error: Campo de plantilla no encontrado"
    exit 1
fi

# Verificar que las dependencias estén instaladas
if [ -d "node_modules" ]; then
    echo "✅ Dependencias instaladas"
else
    echo "⚠️  Dependencias no instaladas. Ejecutando npm install..."
    npm install
fi

# Verificar que la aplicación se construya correctamente
echo "🔨 Probando construcción..."
if npm run build; then
    echo "✅ Construcción exitosa"
else
    echo "❌ Error: La construcción falló"
    exit 1
fi

echo ""
echo "🎉 ¡Todo está listo para producción!"
echo "📋 Resumen de verificaciones:"
echo "   ✅ MongoDB Atlas configurado"
echo "   ✅ Heroku configurado"
echo "   ✅ Campo de puestos implementado"
echo "   ✅ Campo de plantilla reposicionado"
echo "   ✅ Dependencias instaladas"
echo "   ✅ Construcción exitosa"
echo ""
echo "🚀 Para desplegar, ejecuta: ./deploy-heroku.sh"
