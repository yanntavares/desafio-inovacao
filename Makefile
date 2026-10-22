.PHONY: setup up down logs test test-pg e2e migrate revision

-include .env
POSTGRES_USER ?= handoff
POSTGRES_PASSWORD ?= handoff
DB_PORT ?= 5432

setup:
	cp -n .env.example .env || true

up: setup
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f api worker

test:
	cd backend && uv run pytest -q

# suíte no PostgreSQL do compose, num banco separado (a fixture apaga as tabelas)
test-pg:
	docker compose up -d --wait db
	docker compose exec -T db createdb -U $(POSTGRES_USER) handoff_teste 2>/dev/null || true
	cd backend && TEST_DATABASE_URL=postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(DB_PORT)/handoff_teste uv run pytest -q

migrate:
	docker compose exec api alembic upgrade head

# make revision m="descricao"
revision:
	docker compose exec api alembic revision --autogenerate -m "$(m)"

e2e: ## testes do front no navegador (Playwright); a stack precisa estar no ar (make up)
	cd e2e && npm install --no-audit --no-fund && npx playwright test
