# ─────────────────────────────────────────────
# Stage 1: Build React/Vite app
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files trước để cache npm install
COPY package.json package-lock.json ./

# Cài dependencies
RUN npm ci --silent

# Copy toàn bộ source
COPY . .

# Build production bundle
# VITE_API_BASE_URL sẽ được truyền từ docker-compose lúc build
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Serve bằng Nginx
# ─────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Xóa config mặc định, thay bằng config tuỳ chỉnh
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output vào thư mục nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
