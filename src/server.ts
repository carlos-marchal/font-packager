import * as http from "https://deno.land/std@0.148.0/http/mod.ts";
import { serveDir } from "https://deno.land/std@0.148.0/http/file_server.ts";
import {
  readableStreamFromReader,
  readerFromStreamReader,
} from "https://deno.land/std@0.148.0/streams/mod.ts";

import {
  FontPackagerInterface,
  FontPackagerInput,
  FontConversionError,
} from "./font_packager.ts";
import { ErrorFontVariantCollision } from "./filename_parser.ts";

export interface HTTPStaticServer {
  serveDir(request: Request, dir: string): Promise<Response>;
}

class DefaultHTTPStaticServer implements HTTPStaticServer {
  async serveDir(request: Request, dir: string): Promise<Response> {
    return await serveDir(request, { fsRoot: dir, showDirListing: true });
  }
}

export interface HTTPAppServerOptions {
  packager: FontPackagerInterface;
  port: number;
  staticDir: string;
  staticServer?: HTTPStaticServer;
}

export class HTTPAppServer {
  #packager: FontPackagerInterface;
  #port: number;
  #staticDir: string;
  #staticServer: HTTPStaticServer;
  constructor(options: HTTPAppServerOptions) {
    this.#packager = options.packager;
    this.#port = options.port;
    this.#staticDir = options.staticDir;
    this.#staticServer = options.staticServer ?? new DefaultHTTPStaticServer();
  }

  async #successHandler(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return await this.#staticServer.serveDir(request, this.#staticDir);
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/") {
      return new Response(
        `route ${request.method} ${url.pathname} does not exist`,
        { status: 404 }
      );
    }
    const contentType = request.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data")) {
      return new Response("content needs to be multipart form data", {
        status: 400,
      });
    }

    const body = await request.formData();
    const name = body.get("name") as string;
    const files = body.getAll("files") as File[];
    const input: FontPackagerInput = {
      name: name,
      sources: files.map((file) => ({
        name: file.name,
        stream: readerFromStreamReader(file.stream().getReader()),
      })),
    };
    const { zipStream } = await this.#packager.package(input);
    const filename = input.name.replace(/[ _-]g/, "-").toLowerCase();
    return new Response(readableStreamFromReader(zipStream), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${filename}.zip"`,
      },
    });
  }

  #errorHandler(error: unknown): Response {
    let message: string, status: number;
    if (error instanceof ErrorFontVariantCollision) {
      message = `could not infer different font variants from file names "${error.variantA.name}" and "${error.variantB.name}"`;
      status = 400;
    } else if (error instanceof FontConversionError) {
      message = `font conversion failed for file ${error.file}`;
      status = 400;
    } else {
      message = "internal server error";
      status = 500;
    }
    return new Response(message, { status });
  }

  getHandler(): http.Handler {
    return async (request) => {
      try {
        return await this.#successHandler(request);
      } catch (error: unknown) {
        return this.#errorHandler(error);
      }
    };
  }

  async serve(): Promise<void> {
    return await http.serve(this.getHandler(), { port: this.#port });
  }
}
