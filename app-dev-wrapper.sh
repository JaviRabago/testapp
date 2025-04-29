#!/bin/sh
# Script para ejecutar la aplicación Node.js en desarrollo

# Ejecutar la aplicación Node.js en modo desarrollo
echo "Iniciando aplicación Node.js en modo desarrollo..."
export NODE_ENV=development
exec npm run dev
