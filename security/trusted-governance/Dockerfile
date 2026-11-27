# Build with: docker build -f security/trusted-governance/Dockerfile security/trusted-governance
# Deployment and secret provisioning are owner-controlled. No PR source execution.
FROM node:24-alpine
WORKDIR /srv/skyinnk-governance
COPY --chown=node:node . ./security/trusted-governance/
USER node
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "security/trusted-governance/server.mjs"]
