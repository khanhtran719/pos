FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs

ARG APP
RUN npm run build:${APP}

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

ARG APP
COPY --from=build /app/dist/apps/${APP} ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
