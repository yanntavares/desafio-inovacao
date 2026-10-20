.PHONY: setup up down logs test migrate revision

setup:
	cp -n .env.example .env || true

up: setup
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f api worker

test:
	cd backend && pytest -q

migrate:
	docker compose exec api alembic upgrade head

# make revision m="descricao"
revision:
	docker compose exec api alembic revision --autogenerate -m "$(m)"
