# HR System — Makefile
# Quick commands for development, testing, and deployment.

.PHONY: dev build test test-e2e docker-build docker-run help

.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start frontend and backend in development mode
	npm run dev

build: ## Build frontend and backend for production
	npm run build

test: ## Run all tests (backend + frontend)
	npm run test:all

test-e2e: ## Run full verification including E2E tests
	npm run verify:e2e

docker-build: ## Build the Docker image
	npm run docker:build

docker-run: ## Run the Docker container with persistent data volume
	npm run docker:run
