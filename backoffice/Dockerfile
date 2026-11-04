FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY server.mjs seed.mjs ./
COPY lib ./lib
COPY public ./public

ENV PORT=8080
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 8080
CMD ["node", "server.mjs"]
