FROM debian:bookworm-slim AS runtime
WORKDIR /app

COPY backend/target/release/hr_system_backend /usr/local/bin/hr_system_backend
COPY frontend/dist /app/frontend/dist
COPY backend/hr_system.db /app/backend/hr_system.db

ENV PORT=3000
ENV HR_SYSTEM_DB_PATH=/app/backend/hr_system.db
ENV HR_SYSTEM_FRONTEND_DIST=/app/frontend/dist

EXPOSE 3000

CMD ["hr_system_backend"]
