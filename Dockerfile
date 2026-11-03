FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build


FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3005

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3005

CMD ["node", ".output/server/index.mjs"]