FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]
