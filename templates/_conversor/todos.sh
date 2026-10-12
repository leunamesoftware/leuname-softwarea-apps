#!/bin/sh
# Reconverte todos os sites antigos (rode depois de mexer no aplicar.py, nucleo.js ou comum.json).
H=${H:-/home/claude/leuname-software/pacotes-hotmart}
cd "$(dirname "$0")"
while read antigo json id; do
  python3 aplicar.py "$H/$antigo/site-completo" "$json" "$id" | head -1
done <<LISTA
pizzeria-premium pizzaria.json pizzaria
panaderia-premium padaria.json padaria
restaurante-premium restaurante.json restaurante
fruteria-premium fruteria.json hortifruti
clinica-dental-premium clinica-dental.json clinica-odontologica
veterinaria-premium veterinaria.json veterinaria
pet-shop-premium pet-shop.json pet-shop
hotel-premium hotel.json hotel
muebles-decoracion-premium muebles.json moveis-decoracao
electronica-premium electronica.json eletronicos
energia-solar-premium energia-solar.json energia-solar
mudanzas-transportes-premium mudancas.json mudancas
concesionaria-premium concessionaria.json concessionaria
LISTA
