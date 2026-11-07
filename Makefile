.PHONY: dev test seed reset

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

test:
	cd backend && pytest -q
	cd frontend && npm run typecheck && npm run lint && npm test -- --runInBand

seed:
	cd backend && python -m scripts.seed_demo

reset:
	docker compose down -v
