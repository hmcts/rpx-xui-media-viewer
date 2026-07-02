FROM hmctsprod.azurecr.io/base/node:20-alpine AS base
LABEL maintainer="HMCTS Expert UI <https://github.com/hmcts>"

ENV PUPPETEER_SKIP_DOWNLOAD=1 \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
  CHROMEDRIVER_SKIP_DOWNLOAD=1 \
  CYPRESS_INSTALL_BINARY=0 \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  PLAYWRIGHT_BROWSERS_PATH=0 \
  SENTRYCLI_SKIP_DOWNLOAD=1 \
  NPM_CONFIG_FUND=false \
  NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_UPDATE_NOTIFIER=false \
  SCARF_ANALYTICS=false

USER root
ENV WORKDIR=/opt/app
RUN corepack enable \
  && apk add --no-cache rsync python3 make g++ \
  && mkdir -p ${WORKDIR}/projects/media-viewer \
  && chown -R hmcts:hmcts ${WORKDIR}
USER hmcts

WORKDIR ${WORKDIR}

COPY --chown=hmcts:hmcts .yarn/ ./.yarn/
COPY --chown=hmcts:hmcts package.json yarn.lock .yarnrc.yml ./
RUN yarn install

COPY --chown=hmcts:hmcts projects/media-viewer/.yarn/ ./projects/media-viewer/.yarn/
COPY --chown=hmcts:hmcts projects/media-viewer/package.json projects/media-viewer/yarn.lock projects/media-viewer/.yarnrc.yml ./projects/media-viewer/
RUN cd projects/media-viewer && yarn install

COPY --chown=hmcts:hmcts ./ /opt/app/

RUN yarn setup \
  && yarn cache clean \
  && cd projects/media-viewer \
  && yarn cache clean

EXPOSE 1337
CMD [ "yarn", "start:api" ]
