FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]

