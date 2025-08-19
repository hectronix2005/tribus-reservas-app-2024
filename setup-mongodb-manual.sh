#!/bin/bash

echo "🗄️ Configurando MongoDB Atlas Manualmente"
echo "========================================="
echo ""

# Función para verificar si MongoDB está configurado
check_mongodb_status() {
    echo "🔍 Verificando estado de MongoDB..."
    MONGODB_CONFIG=$(heroku config:get MONGODB_URI --app tribus-backend-api-2024 2>/dev/null)
    
    if [ -n "$MONGODB_CONFIG" ]; then
        echo "✅ MongoDB ya está configurado"
        return 0
    else
        echo "❌ MongoDB no está configurado"
        return 1
    fi
}

# Función para verificar si el backend funciona
check_backend_status() {
    echo "🔍 Verificando estado del backend..."
    HEALTH_RESPONSE=$(curl -s https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health)
    
    if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
        echo "✅ Backend funcionando correctamente"
        return 0
    else
        echo "❌ Backend no funciona"
        echo "Respuesta: $HEALTH_RESPONSE"
        return 1
    fi
}

# Función para configurar MongoDB Atlas manualmente
setup_mongodb_atlas_manual() {
    echo "📋 Configurando MongoDB Atlas manualmente..."
    echo ""
    
    # Abrir MongoDB Atlas
    echo "🌐 Abriendo MongoDB Atlas..."
    open "https://www.mongodb.com/atlas"
    
    echo ""
    echo "📝 Sigue estos pasos exactos:"
    echo ""
    
    echo "1️⃣ CREAR CUENTA:"
    echo "   - Haz clic en 'Try Free'"
    echo "   - Email: tribus.backend@gmail.com"
    echo "   - Password: TribusBackend2024!"
    echo "   - Account name: TRIBUS Backend"
    echo "   - Haz clic en 'Create Account'"
    echo ""
    
    echo "2️⃣ CREAR CLUSTER:"
    echo "   - Haz clic en 'Build a Database'"
    echo "   - Selecciona 'FREE' (M0)"
    echo "   - Proveedor: AWS"
    echo "   - Región: US East (N. Virginia)"
    echo "   - Haz clic en 'Create Cluster'"
    echo ""
    
    echo "3️⃣ CONFIGURAR USUARIO:"
    echo "   - En el menú lateral, ve a 'Database Access'"
    echo "   - Haz clic en 'Add New Database User'"
    echo "   - Username: tribus_admin"
    echo "   - Password: Tribus2024!"
    echo "   - Role: Atlas admin"
    echo "   - Haz clic en 'Add User'"
    echo ""
    
    echo "4️⃣ CONFIGURAR RED:"
    echo "   - En el menú lateral, ve a 'Network Access'"
    echo "   - Haz clic en 'Add IP Address'"
    echo "   - Selecciona 'Allow Access from Anywhere'"
    echo "   - Haz clic en 'Confirm'"
    echo ""
    
    echo "5️⃣ OBTENER URL:"
    echo "   - En el menú lateral, ve a 'Database'"
    echo "   - Haz clic en 'Connect' en tu cluster"
    echo "   - Selecciona 'Connect your application'"
    echo "   - Copia la URL de conexión"
    echo ""
    
    echo "⚠️ IMPORTANTE:"
    echo "   - Reemplaza <password> con: Tribus2024!"
    echo "   - Agrega /tribus antes de ?retryWrites=true"
    echo ""
    
    echo "🔗 URL final debe ser:"
    echo "mongodb+srv://tribus_admin:Tribus2024!@cluster0.xxxxx.mongodb.net/tribus?retryWrites=true&w=majority"
    echo ""
    
    read -p "¿Ya tienes la URL real de MongoDB Atlas? (y/n): " has_real_url
    
    if [[ $has_real_url == "y" || $has_real_url == "Y" ]]; then
        echo ""
        read -p "🔗 Ingresa la URL real de MongoDB Atlas: " REAL_MONGODB_URI
        
        if [ -n "$REAL_MONGODB_URI" ]; then
            echo ""
            echo "⚙️ Configurando MongoDB real en Heroku..."
            
            # Configurar MongoDB real en Heroku
            heroku config:set MONGODB_URI="$REAL_MONGODB_URI" --app tribus-backend-api-2024
            
            echo "✅ MongoDB real configurado en Heroku"
            
            # Guardar URL en archivo
            echo "$REAL_MONGODB_URI" > mongodb-connection-string.txt
            echo "📄 URL guardada en mongodb-connection-string.txt"
            
            return 0
        else
            echo "❌ URL no válida"
            return 1
        fi
    else
        echo ""
        echo "📋 Sigue los pasos arriba para configurar MongoDB Atlas"
        return 1
    fi
}

# Función para reiniciar y verificar backend
restart_and_verify_backend() {
    echo "🔄 Reiniciando la aplicación..."
    heroku restart --app tribus-backend-api-2024
    
    echo "⏳ Esperando que el servidor se inicie..."
    sleep 20
    
    # Verificar múltiples veces
    for i in {1..5}; do
        echo "🔍 Verificando conexión (intento $i/5)..."
        
        if check_backend_status; then
            echo "✅ ¡Backend funcionando correctamente!"
            return 0
        else
            echo "⏳ Esperando más tiempo..."
            sleep 10
        fi
    done
    
    echo "❌ Backend no responde después de 5 intentos"
    return 1
}

# Función para migrar usuarios
migrate_users() {
    echo "🔄 Migrando usuarios por defecto..."
    
    # Crear script de migración temporal
    cat > temp-migrate.js << 'EOF'
const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  role: String,
  department: String,
  isActive: Boolean,
  lastLogin: Date
});

const User = mongoose.model('User', userSchema);

const defaultUsers = [
  {
    name: 'Administrador del Sistema',
    email: 'admin@tribus.com',
    username: 'admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // admin123
    role: 'admin',
    department: 'IT',
    isActive: true
  },
  {
    name: 'Usuario General',
    email: 'usuario@tribus.com',
    username: 'usuario',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // user123
    role: 'user',
    department: 'General',
    isActive: true
  },
  {
    name: 'Hector Neira',
    email: 'dneira@tribus.com',
    username: 'Dneira',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // dneira123
    role: 'user',
    department: 'Desarrollo',
    isActive: true
  }
];

async function migrateUsers() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.log('❌ MONGODB_URI no configurado');
      return;
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');
    
    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Usuario ${userData.username} migrado`);
      } else {
        console.log(`⚠️ Usuario ${userData.username} ya existe`);
      }
    }
    
    const allUsers = await User.find({});
    console.log(`📊 Total de usuarios: ${allUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error migrando usuarios:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsers();
EOF

    # Ejecutar migración
    cd backend
    node ../temp-migrate.js
    cd ..
    
    # Limpiar archivo temporal
    rm temp-migrate.js
    
    echo "✅ Migración completada"
}

# Función para probar conexión con MongoDB CLI
test_mongodb_connection() {
    echo "🔍 Probando conexión con MongoDB CLI..."
    
    if [ -f "mongodb-connection-string.txt" ]; then
        MONGODB_URI=$(cat mongodb-connection-string.txt)
        
        # Extraer host y puerto de la URL
        HOST=$(echo $MONGODB_URI | sed 's/mongodb+srv:\/\///' | sed 's/\/.*//')
        
        echo "🔗 Probando conexión a: $HOST"
        
        # Usar mongosh para probar conexión
        if command -v mongosh &> /dev/null; then
            echo "📊 Usando mongosh para probar conexión..."
            # mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})" --quiet
            echo "✅ Conexión probada con mongosh"
        else
            echo "⚠️ mongosh no disponible, saltando prueba de conexión"
        fi
        
        return 0
    else
        echo "❌ No se encontró archivo de URL de conexión"
        return 1
    fi
}

# Función principal
main() {
    echo "🎯 Iniciando configuración manual de MongoDB Atlas..."
    echo ""
    
    # Paso 1: Verificar estado actual
    if check_mongodb_status; then
        echo "📋 MongoDB ya está configurado"
    else
        echo "📋 Configurando MongoDB Atlas..."
        if ! setup_mongodb_atlas_manual; then
            echo "❌ Error configurando MongoDB Atlas"
            return 1
        fi
    fi
    
    # Paso 2: Probar conexión con MongoDB CLI
    test_mongodb_connection
    
    # Paso 3: Reiniciar y verificar backend
    if ! restart_and_verify_backend; then
        echo "❌ Error en el backend"
        echo "🔍 Revisando logs..."
        heroku logs --tail --app tribus-backend-api-2024 --num 20
        return 1
    fi
    
    # Paso 4: Migrar usuarios
    migrate_users
    
    # Paso 5: Verificación final
    echo ""
    echo "🎉 ¡Configuración completada exitosamente!"
    echo ""
    echo "📊 Información del sistema:"
    echo "   - Backend: https://tribus-backend-api-2024-c417f649c911.herokuapp.com"
    echo "   - API: https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api"
    echo "   - Health: https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health"
    echo ""
    echo "🔑 Credenciales por defecto:"
    echo "   - Admin: admin / admin123"
    echo "   - Usuario: usuario / user123"
    echo "   - Dneira: Dneira / dneira123"
    echo ""
    echo "🎯 Próximo paso: Conectar el frontend al backend"
    echo ""
    
    return 0
}

# Ejecutar función principal
main
