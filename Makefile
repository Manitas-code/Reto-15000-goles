.DEFAULT_GOAL := help
BUN ?= bun
DOCKER ?= docker
COMPOSE_PROJECT ?= $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME),goalday-$(shell pwd | cksum | awk '{print $$1}'))
COMPOSE = $(DOCKER) compose --project-name $(COMPOSE_PROJECT)
CLOUDFLARED ?= cloudflared
TUNNEL_URL ?= http://127.0.0.1:5173

.PHONY: help install dev dev-web dev-server typecheck lint format-check test e2e offline browsers check build build-web build-server preview smoke start prod clean docker-dev docker-prod docker-build docker-down docker-logs docker-smoke cloudflare

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

offline: ## Abrir web y API simulada sin Supabase; SOURCE=dev o prod
	$(BUN) run offline

e2e-prod: ## Comprobar el build existente en navegador con API simulada
	SOURCE=prod $(BUN) run e2e

e2e-docker: ## Compilar y comprobar una imagen aislada en navegador
	SOURCE=docker $(BUN) run e2e

evidence: ## Capturar las siete páginas y un vídeo de navegación del build
	$(BUN) scripts/evidence.mjs

report: ## Servir el informe HTML de RUN_DIR en un puerto local libre
	$(BUN) --no-env-file scripts/report.mjs

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


docker-dev: ## Levantar Vite y API en Docker con recarga
	$(COMPOSE) --profile development up --build development

docker-prod: ## Compilar y levantar web y API en Docker en segundo plano
	$(COMPOSE) --profile production up --build -d production

docker-build: ## Compilar la imagen de producción sin iniciar contenedores
	$(COMPOSE) build production

docker-down: ## Detener los contenedores del proyecto, conservando dependencias
	$(COMPOSE) --profile development --profile production down

docker-logs: ## Seguir los logs de los contenedores del proyecto
	$(COMPOSE) --profile development --profile production logs -f


docker-smoke: ## Comprobar la imagen de producción con upstream simulado
	$(COMPOSE) run --rm --no-deps -v "$(CURDIR)/scripts/smoke-server.mjs:/app/scripts/smoke-server.mjs:ro" production bun scripts/smoke-server.mjs

cloudflare: ## Abrir un túnel HTTPS a la web activa (por defecto puerto 5173)
	$(CLOUDFLARED) tunnel --url "$(TUNNEL_URL)" --http-host-header localhost
