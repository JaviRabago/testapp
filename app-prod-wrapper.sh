#!/bin/sh
# Script para configurar la ruta predeterminada y luego ejecutar la aplicación Node.js

# Configurar la ruta predeterminada para la red de producción
echo "Configurando ruta predeterminada via 172.30.0.2..."
ip route del default 2>/dev/null || true
ip route add default via 172.30.0.2

# Ejecutar la aplicación Node.js
echo "Iniciando aplicación Node.js..."
exec node index.js