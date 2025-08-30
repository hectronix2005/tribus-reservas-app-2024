#!/bin/bash

echo "🛑 Deteniendo servidores de desarrollo..."

# Matar procesos en los puertos
echo "🔄 Deteniendo procesos en puerto 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No hay procesos en puerto 3000"

echo "🔄 Deteniendo procesos en puerto 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No hay procesos en puerto 3001"

# Verificar que los puertos estén libres
sleep 2
if ! lsof -ti:3000 >/dev/null 2>&1 && ! lsof -ti:3001 >/dev/null 2>&1; then
    echo "✅ Servidores detenidos correctamente"
else
    echo "⚠️  Algunos procesos podrían seguir corriendo"
    echo "Puertos en uso:"
    lsof -ti:3000 2>/dev/null || echo "Puerto 3000: Libre"
    lsof -ti:3001 2>/dev/null || echo "Puerto 3001: Libre"
fi
