.DEFAULT_GOAL := help
BUN ?= bun

.PHONY: help install dev dev-web dev-server typecheck lint format-check test e2e browsers check build build-web build-server preview smoke start prod clean

help: ## Mostrar los comandos disponibles
	@awk 'BEGIN {FS = ":.*## "} /^[a-z0-9-]+:.*## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Instalar las versiones exactas de bun.lock
	$(BUN) install --frozen-lockfile

dev: ## Iniciar Vite y Fastify con recarga
	$(BUN) run dev

dev-web: ## Iniciar solo Vite
	$(BUN) run dev:web

dev-server: ## Iniciar solo Fastify con recarga
	$(BUN) run dev:server

typecheck: ## Comprobar tipos del frontend y servidor
	$(BUN) run typecheck

lint: ## Comprobar ESLint
	$(BUN) run lint

format-check: ## Comprobar formato sin modificar archivos
	$(BUN) run format:check

test: ## Ejecutar las pruebas Vitest existentes
	$(BUN) run test

e2e: ## Ejecutar integración y comparación visual en Chromium
	$(BUN) run e2e

browsers: ## Instalar Chromium para Playwright
	$(BUN) x --bun playwright install chromium

check: ## Comprobar tipos, lint, tests, build y formato
	$(BUN) run check
	$(BUN) run format:check

build: ## Compilar frontend y servidor
	$(BUN) run build

build-web: ## Compilar solo el frontend
	$(BUN) run build:web

build-server: ## Compilar solo el servidor
	$(BUN) run build:server

preview: ## Ver el build web local, sin API
	$(BUN) run preview

smoke: ## Comprobar el build existente con upstream simulado
	$(BUN) run smoke:server

start: ## Iniciar el servidor compilado; carga .env
	NODE_ENV=production $(BUN) run start

prod: ## Instalar, compilar, comprobar smoke y servir en primer plano
	$(MAKE) install
	$(MAKE) build
	$(MAKE) smoke
	SERVE_WEB=true $(MAKE) start

clean: ## Borrar solo builds y resultados de pruebas generados
	rm -rf dist dist-server coverage playwright-report test-results
