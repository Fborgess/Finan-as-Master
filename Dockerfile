FROM node:22-slim

WORKDIR /app

# instalacao de dependencias com cache
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

EXPOSE 8080

# o servidor usa o PORT fornecido pelo Cloud Run
CMD ["npm", "start"]