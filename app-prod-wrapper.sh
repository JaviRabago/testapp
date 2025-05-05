#!/bin/sh
# Script para ejecutar la aplicación Node.js en producción

# Esperar a que la base de datos PostgreSQL esté disponible
echo "Esperando a que la base de datos PostgreSQL esté disponible..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME; do
  sleep 2
done

# Ejecutar la aplicación Node.js en modo producción
echo "Iniciando aplicación Node.js en modo producción..."
export NODE_ENV=production
exec node index.js
