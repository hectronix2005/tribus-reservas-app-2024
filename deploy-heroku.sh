#!/bin/bash

echo "🚀 Iniciando despliegue en Heroku..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Heroku CLI está instalado
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar que estamos logueados en Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Error: No estás logueado en Heroku. Ejecuta 'heroku login' primero."
    exit 1
fi

echo "📦 Instalando dependencias..."
npm install

echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: La construcción falló. Revisa los errores arriba."
    exit 1
fi

echo "✅ Construcción exitosa"

echo "🌐 Desplegando en Heroku..."
git add .
git commit -m "Deploy: Actualización del sistema de reservas con selección de puestos"

# Verificar si ya existe un remote de Heroku
if ! git remote | grep -q heroku; then
    echo "🔗 Agregando remote de Heroku..."
    heroku git:remote -a tribus-reservas-app-2024
fi

echo "🚀 Enviando a Heroku..."
git push heroku main

if [ $? -eq 0 ]; then
    echo "✅ Despliegue exitoso!"
    echo "🌐 Aplicación disponible en: https://tribus-reservas-app-2024.herokuapp.com"
    
    echo "🔍 Verificando logs..."
    heroku logs --tail --num 20
    
    echo "📊 Abriendo aplicación..."
    heroku open
else
    echo "❌ Error en el despliegue. Revisa los logs:"
    heroku logs --tail
    exit 1
fi
