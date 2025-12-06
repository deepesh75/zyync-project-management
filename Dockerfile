FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY src ./src/
COPY tsconfig.json ./
RUN npm ci --production=false && npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
