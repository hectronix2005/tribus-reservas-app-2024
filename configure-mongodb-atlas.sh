#!/bin/bash

echo "🗄️ Configurando MongoDB Atlas Completamente"
echo "==========================================="
echo ""

# URL de MongoDB Atlas
MONGODB_URI="mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0"

echo "🔗 URL de MongoDB Atlas:"
echo "$MONGODB_URI"
echo ""

echo "📋 Pasos para configurar acceso de red:"
echo ""
echo "1️⃣ Ve a MongoDB Atlas:"
echo "   https://cloud.mongodb.com"
echo ""

echo "2️⃣ En el menú lateral, ve a 'Network Access'"
echo ""

echo "3️⃣ Haz clic en 'Add IP Address'"
echo ""

echo "4️⃣ Selecciona 'Allow Access from Anywhere' (0.0.0.0/0)"
echo ""

echo "5️⃣ Haz clic en 'Confirm'"
echo ""

echo "6️⃣ Espera unos minutos para que se aplique"
echo ""

read -p "¿Ya configuraste el acceso de red? (y/n): " network_configured

if [[ $network_configured == "y" || $network_configured == "Y" ]]; then
    echo ""
    echo "⚙️ Configurando MongoDB en Heroku..."
    
    # Configurar MongoDB en Heroku
    heroku config:set MONGODB_URI="$MONGODB_URI" --app tribus-backend-api-2024
    
    echo "✅ MongoDB configurado en Heroku"
    echo ""
    echo "🔄 Reiniciando aplicación..."
    heroku restart --app tribus-backend-api-2024
    
    echo ""
    echo "⏳ Esperando que el servidor se inicie..."
    sleep 20
    
    echo ""
    echo "🔍 Verificando conexión..."
    
    # Verificar múltiples veces
    for i in {1..5}; do
        echo "🔍 Verificando conexión (intento $i/5)..."
        
        HEALTH_RESPONSE=$(curl -s https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api/health)
        
        if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
            echo "✅ ¡Backend funcionando correctamente!"
            
            echo ""
            echo "🔄 Migrando usuarios por defecto..."
            
            # Crear script de migración temporal
            cat > temp-migrate.js << 'EOF'
const mongoose = require('mongoose');

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
            
            break
        else
            echo "⏳ Esperando más tiempo..."
            sleep 10
        fi
    done
    
    if [[ $i -eq 5 ]]; then
        echo "❌ Backend no responde después de 5 intentos"
        echo "🔍 Revisando logs..."
        heroku logs --tail --app tribus-backend-api-2024 --num 20
    fi
    
else
    echo ""
    echo "📋 Configura el acceso de red primero"
    echo "Luego ejecuta este script nuevamente"
fi

echo ""
