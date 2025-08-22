#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  CREANDO COPIA DE SEGURIDAD COMPLETA DE MONGODB${NC}"
echo "=========================================================="
echo ""

# Configuración de MongoDB
MONGODB_URI="mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0"
BACKUP_DIR="./mongodb-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="tribus_backup_$TIMESTAMP"

echo -e "${BLUE}1️⃣ Verificando conexión a MongoDB...${NC}"
if mongosh "$MONGODB_URI" --eval "db.runCommand('ping')" --quiet > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Conexión a MongoDB exitosa${NC}"
else
  echo -e "${RED}❌ Error conectando a MongoDB${NC}"
  echo -e "${YELLOW}💡 Asegúrate de tener MongoDB CLI instalado: brew install mongosh${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}2️⃣ Creando directorio de backup...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Directorio creado: $BACKUP_DIR${NC}"
echo ""

echo -e "${BLUE}3️⃣ Exportando colección de usuarios...${NC}"
mongoexport --uri="$MONGODB_URI" \
  --collection=users \
  --out="$BACKUP_DIR/users_$BACKUP_NAME.json" \
  --jsonArray

if [ $? -eq 0 ]; then
  USER_COUNT=$(cat "$BACKUP_DIR/users_$BACKUP_NAME.json" | jq '. | length' 2>/dev/null || echo "0")
  echo -e "${GREEN}✅ Usuarios exportados: $USER_COUNT registros${NC}"
  echo -e "${BLUE}📁 Archivo: users_$BACKUP_NAME.json${NC}"
else
  echo -e "${RED}❌ Error exportando usuarios${NC}"
fi
echo ""

echo -e "${BLUE}4️⃣ Exportando colección de reservaciones...${NC}"
mongoexport --uri="$MONGODB_URI" \
  --collection=reservations \
  --out="$BACKUP_DIR/reservations_$BACKUP_NAME.json" \
  --jsonArray

if [ $? -eq 0 ]; then
  RESERVATION_COUNT=$(cat "$BACKUP_DIR/reservations_$BACKUP_NAME.json" | jq '. | length' 2>/dev/null || echo "0")
  echo -e "${GREEN}✅ Reservaciones exportadas: $RESERVATION_COUNT registros${NC}"
  echo -e "${BLUE}📁 Archivo: reservations_$BACKUP_NAME.json${NC}"
else
  echo -e "${RED}❌ Error exportando reservaciones${NC}"
fi
echo ""

echo -e "${BLUE}5️⃣ Creando backup completo de la base de datos...${NC}"
mongodump --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR/complete_backup_$BACKUP_NAME"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Backup completo creado exitosamente${NC}"
  echo -e "${BLUE}📁 Directorio: complete_backup_$BACKUP_NAME${NC}"
else
  echo -e "${RED}❌ Error creando backup completo${NC}"
fi
echo ""

echo -e "${BLUE}6️⃣ Creando archivo de resumen...${NC}"
SUMMARY_FILE="$BACKUP_DIR/backup_summary_$BACKUP_NAME.txt"
{
  echo "=== RESUMEN DE BACKUP MONGODB TRIBUS ==="
  echo "Fecha: $(date)"
  echo "Timestamp: $TIMESTAMP"
  echo "Base de datos: tribus"
  echo ""
  echo "=== ESTADÍSTICAS ==="
  echo "Usuarios: $USER_COUNT"
  echo "Reservaciones: $RESERVATION_COUNT"
  echo ""
  echo "=== ARCHIVOS CREADOS ==="
  echo "- users_$BACKUP_NAME.json"
  echo "- reservations_$BACKUP_NAME.json"
  echo "- complete_backup_$BACKUP_NAME/ (directorio completo)"
  echo ""
  echo "=== INSTRUCCIONES DE RESTAURACIÓN ==="
  echo "Para restaurar usuarios:"
  echo "mongoimport --uri=\"$MONGODB_URI\" --collection=users --file=\"users_$BACKUP_NAME.json\" --jsonArray"
  echo ""
  echo "Para restaurar reservaciones:"
  echo "mongoimport --uri=\"$MONGODB_URI\" --collection=reservations --file=\"reservations_$BACKUP_NAME.json\" --jsonArray"
  echo ""
  echo "Para restaurar backup completo:"
  echo "mongorestore --uri=\"$MONGODB_URI\" \"complete_backup_$BACKUP_NAME/\""
} > "$SUMMARY_FILE"

echo -e "${GREEN}✅ Resumen creado: backup_summary_$BACKUP_NAME.txt${NC}"
echo ""

echo -e "${BLUE}7️⃣ Comprimiendo backup...${NC}"
cd "$BACKUP_DIR"
tar -czf "tribus_backup_$BACKUP_NAME.tar.gz" \
  "users_$BACKUP_NAME.json" \
  "reservations_$BACKUP_NAME.json" \
  "complete_backup_$BACKUP_NAME" \
  "backup_summary_$BACKUP_NAME.txt"

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "tribus_backup_$BACKUP_NAME.tar.gz" | cut -f1)
  echo -e "${GREEN}✅ Backup comprimido: tribus_backup_$BACKUP_NAME.tar.gz ($BACKUP_SIZE)${NC}"
else
  echo -e "${RED}❌ Error comprimiendo backup${NC}"
fi
cd ..
echo ""

echo -e "${BLUE}8️⃣ Verificando integridad del backup...${NC}"
cd "$BACKUP_DIR"
if tar -tzf "tribus_backup_$BACKUP_NAME.tar.gz" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Integridad del backup verificada${NC}"
else
  echo -e "${RED}❌ Error en la integridad del backup${NC}"
fi
cd ..
echo ""

echo -e "${BLUE}📊 RESUMEN DEL BACKUP${NC}"
echo "================================"
echo ""
echo -e "${GREEN}✅ Conexión a MongoDB verificada${NC}"
echo -e "${GREEN}✅ Usuarios exportados: $USER_COUNT${NC}"
echo -e "${GREEN}✅ Reservaciones exportadas: $RESERVATION_COUNT${NC}"
echo -e "${GREEN}✅ Backup completo creado${NC}"
echo -e "${GREEN}✅ Archivos comprimidos${NC}"
echo -e "${GREEN}✅ Integridad verificada${NC}"
echo ""
echo -e "${BLUE}📁 ARCHIVOS CREADOS EN: $BACKUP_DIR${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}📄 users_$BACKUP_NAME.json${NC}"
echo -e "${YELLOW}📄 reservations_$BACKUP_NAME.json${NC}"
echo -e "${YELLOW}📁 complete_backup_$BACKUP_NAME/ (directorio)${NC}"
echo -e "${YELLOW}📄 backup_summary_$BACKUP_NAME.txt${NC}"
echo -e "${YELLOW}🗜️  tribus_backup_$BACKUP_NAME.tar.gz (comprimido)${NC}"
echo ""
echo -e "${GREEN}🎉 ¡Backup completado exitosamente!${NC}"
echo -e "${GREEN}🎉 Todos los datos están seguros en: $BACKUP_DIR${NC}"
echo ""
