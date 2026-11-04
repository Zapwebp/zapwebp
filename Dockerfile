FROM node:22-alpine AS dependencies
WORKDIR /app
RUN npm install --global pnpm@11.9.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --prod --frozen-lockfile --filter zapwebp-workspace...

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/core ./packages/core
COPY --from=dependencies /app/packages/api ./packages/api
COPY package.json server.js ./
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
