FROM node:lts-alpine

# make the 'app' folder the current working directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package*.json ./

# install project dependencies
RUN npm install
# VM doesnt have enough RAM
ENV NODE_OPTIONS=--max_old_space_size=2048

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY . .

# build app for production with minification
RUN npm run build -- --mode production

RUN ls /app/dist

FROM nginx

COPY nginx.config /etc/nginx/conf.d/default.conf
COPY --from=0 /app/dist /usr/share/nginx/html
RUN ls /usr/share/nginx/html