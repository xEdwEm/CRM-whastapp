FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
ARG ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ARG META_APP_SECRET=placeholder-meta-secret
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_LOCALE=en

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV META_APP_SECRET=$META_APP_SECRET
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_APP_LOCALE=en

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/src/i18n ./src/i18n

EXPOSE 3000
CMD ["node", "server.js"]
