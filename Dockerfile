FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ARG VITE_USE_MOCKS=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/en >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
