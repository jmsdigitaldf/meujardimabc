# Use a imagem oficial do Node.js 20 (Alpine para tamanho reduzido e segurança)
FROM node:20-alpine

# Define o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copia os arquivos de manifesto de dependências
COPY package*.json ./

# Instala apenas as dependências necessárias para produção
RUN npm ci --omit=dev

# Copia o restante do código do projeto para o contêiner
COPY . .

# Expõe a porta do servidor Express
EXPOSE 4173

# Configura as variáveis de ambiente padrão
ENV PORT=4173
ENV NODE_ENV=production

# Inicia o servidor Node.js
CMD ["npm", "start"]
