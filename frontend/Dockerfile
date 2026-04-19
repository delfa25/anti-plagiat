FROM node:18

WORKDIR /app

# Copier uniquement package.json d'abord pour profiter du cache Docker
COPY package.json package-lock.json ./
RUN npm install

# Copier le reste du code
COPY . .

CMD ["npm", "start"]
