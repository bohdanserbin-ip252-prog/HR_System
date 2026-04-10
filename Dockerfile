FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM rust:1.94-bookworm AS backend-builder
WORKDIR /app

COPY backend/Cargo.toml backend/Cargo.lock backend/
COPY backend/src backend/src
RUN cargo build --manifest-path backend/Cargo.toml --release --locked

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/backend/target/release/hr_system_backend /usr/local/bin/hr_system_backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV PORT=3000
ENV HR_SYSTEM_DB_PATH=/data/hr_system.db
ENV HR_SYSTEM_FRONTEND_DIST=/app/frontend/dist

EXPOSE 3000

CMD ["hr_system_backend"]
