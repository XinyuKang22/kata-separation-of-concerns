FROM node:16.16.0

WORKDIR /app/node-services/file-handler

ADD file-handler/package.json .
ADD file-handler/yarn.lock .

RUN yarn install --frozen-lockfile

ADD file-handler .

RUN yarn build

ENTRYPOINT ["yarn", "run", "run"]