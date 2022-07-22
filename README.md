## Font packager

[![CI](https://img.shields.io/github/workflow/status/carlos-marchal/font-packager/CI?label=Build%2C%20test%20%26%20deploy&style=for-the-badge)](https://github.com/carlos-marchal/font-packager/actions/workflows/ci.yaml)

Font Packager is a web based tool that converts TTF fonts to web formats (WOFF, WOFF2)
and bundles them with generated CSS.

This project is both a challenge to myself to deploy a Deno based service, and
a helpful tool when creating websites that use custom fonts.

The repo is configured to automatically generate and publish a Dockerized version of the
application. You should be able to get it running on your machine just by running:

```sh
docker run -p 3000:3000 ghcr.io/carlos-marchal/font-packager:latest
```

To run all tests, use the following command:

```sh
docker run -e INTEGRATION_TESTS=true ghcr.io/carlos-marchal/font-packager:latest deno test -A
```

The only configuration it accepts right now is an environment variable for `PORT`, which
defaults to `3000`.

If run directly without Docker, the binaries in `sfnt2woff-zopfli` and `woff2` need to be installed
and available.