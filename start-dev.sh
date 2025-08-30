#!/bin/bash

echo "🚀 Iniciando servidores de desarrollo..."

# Matar procesos existentes en los puertos
echo "🔄 Limpiando puertos..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Esperar un momento
sleep 2

# Iniciar backend
echo "🔧 Iniciando backend (puerto 3001)..."
NODE_ENV=development PORT=3001 node server.js &
BACKEND_PID=$!

# Esperar a que el backend esté listo
sleep 3

# Iniciar frontend
echo "⚛️  Iniciando frontend (puerto 3000)..."
npm run dev &
FRONTEND_PID=$!

# Esperar un momento
sleep 5

# Verificar que ambos estén corriendo
echo "✅ Verificando servidores..."
if lsof -ti:3000 >/dev/null 2>&1 && lsof -ti:3001 >/dev/null 2>&1; then
    echo "🎉 ¡Servidores iniciados correctamente!"
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:3001"
    echo "📊 API Health: http://localhost:3000/api/health"
    echo ""
    echo "Presiona Ctrl+C para detener los servidores"
    
    # Mantener el script corriendo
    wait
else
    echo "❌ Error: Los servidores no se iniciaron correctamente"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi
