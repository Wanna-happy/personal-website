FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.mjs"]
