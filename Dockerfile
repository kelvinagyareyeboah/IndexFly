# Step 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Step 2: Build the Go backend
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod ./
RUN go mod download || true
COPY backend/ ./
# Copy the built frontend assets to the dist folder inside backend
COPY --from=frontend-builder /app/frontend/dist ./dist
RUN go build -o main .

# Step 3: Run the application
FROM alpine:latest
WORKDIR /app
COPY --from=backend-builder /app/backend/main ./main
COPY --from=backend-builder /app/backend/sample_docs ./sample_docs
COPY --from=backend-builder /app/backend/dist ./dist

EXPOSE 8080
ENV PORT=8080

CMD ["./main"]
