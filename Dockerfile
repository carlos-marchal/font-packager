FROM denoland/deno:1.23.4
RUN apt-get update && apt-get upgrade && apt-get install -y sfnt2woff-zopfli woff2
WORKDIR /app
COPY . .
RUN deno cache src/*.ts
CMD [ "deno", "run", "-A", "src/mod.ts" ]