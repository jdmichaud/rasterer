FROM nginx:1.29.2

RUN apt update
RUN apt install -y curl xz-utils less

COPY . /usr/share/nginx/html
