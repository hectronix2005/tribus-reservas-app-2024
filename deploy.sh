#!/bin/bash

# Script de despliegue automatizado para TRIBUS en Heroku
echo "🚀 Iniciando despliegue de TRIBUS en Heroku..."

# Verificar si Heroku CLI está instalado
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI no está instalado."
    echo "📥 Por favor instala Heroku CLI desde: https://devcenter.heroku.com/articles/heroku-cli"
    echo "💡 O ejecuta: npm install -g heroku (si tienes permisos)"
    exit 1
fi

# Verificar si estás logueado en Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Iniciando sesión en Heroku..."
    heroku login
fi

# Solicitar nombre de la aplicación
echo "📝 Ingresa el nombre para tu aplicación (o presiona Enter para nombre automático):"
read app_name

if [ -z "$app_name" ]; then
    echo "🎲 Creando aplicación con nombre automático..."
    heroku create
else
    echo "🏷️ Creando aplicación con nombre: $app_name"
    heroku create $app_name
fi

# Obtener el nombre de la aplicación creada
APP_NAME=$(heroku apps:info --json | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
echo "✅ Aplicación creada: $APP_NAME"

# Configurar buildpacks
echo "🔧 Configurando buildpacks..."
heroku buildpacks:clear
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static

# Configurar variables de entorno
echo "⚙️ Configurando variables de entorno..."
heroku config:set NODE_ENV=production

# Construir la aplicación localmente
echo "🏗️ Construyendo la aplicación..."
npm run build

# Hacer commit de los cambios
echo "💾 Guardando cambios..."
git add .
git commit -m "Deploy to Heroku: $(date)"

# Desplegar a Heroku
echo "🚀 Desplegando a Heroku..."
git push heroku main

# Verificar el despliegue
echo "🔍 Verificando el despliegue..."
heroku ps

# Abrir la aplicación
echo "🌐 Abriendo la aplicación..."
heroku open

echo "✅ ¡Despliegue completado!"
echo "🔗 Tu aplicación está disponible en: https://$APP_NAME.herokuapp.com"
echo "📊 Para ver logs: heroku logs --tail"
echo "🔄 Para reiniciar: heroku restart"
