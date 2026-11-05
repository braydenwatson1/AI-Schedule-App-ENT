FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node public ./public
COPY --chown=node:node server ./server
RUN mkdir .data && chown node:node .data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4174
EXPOSE 4174
VOLUME ["/app/.data"]
CMD ["node", "server/index.mjs"]
