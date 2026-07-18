FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
# Run migrations + seed + start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node -e \"const{execSync}=require('child_process');try{execSync('node dist/seed.js',{stdio:'inherit'})}catch(e){}\" && node dist/index.js"]
