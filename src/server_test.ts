import { ConnInfo } from "https://deno.land/std@0.148.0/http/server.ts";
import { assertEquals } from "https://deno.land/std@0.148.0/testing/asserts.ts";
import { ErrorFontVariantCollision } from "./filename_parser.ts";
import { FontVariant } from "./font.ts";

import {
  FontConversionError,
  FontPackagerInput,
  FontPackagerInterface,
  FontPackagerOutput,
} from "./font_packager.ts";
import { HTTPAppServer, HTTPStaticServer } from "./server.ts";

class MockStaticServer implements HTTPStaticServer {
  history: Array<[Request, string]> = [];
  serveDir(request: Request, dir: string): Promise<Response> {
    this.history.push([request, dir]);
    return Promise.resolve(new Response());
  }
}

class MockFontPackager implements FontPackagerInterface {
  history: Array<FontPackagerInput> = [];
  throws?: Error;
  package(request: FontPackagerInput): Promise<FontPackagerOutput> {
    this.history.push(request);
    if (this.throws !== undefined) {
      return Promise.reject(this.throws);
    }
    return Promise.resolve({
      zipStream: {
        read() {
          return Promise.resolve(null);
        },
      },
    });
  }
}

const MOCK_CONN_INFO: ConnInfo = {
  localAddr: { transport: "tcp", hostname: "", port: 3000 },
  remoteAddr: { transport: "tcp", hostname: "", port: 50000 },
};

Deno.test(
  "HTTPAppServer calls static server for all GET requests",
  async () => {
    const staticDir = "/www";
    const staticServer = new MockStaticServer();
    const packager = new MockFontPackager();
    const handler = new HTTPAppServer({
      packager,
      port: 3000,
      staticDir,
      staticServer,
    }).getHandler();
    const test = [
      new Request("http://localhost:3000/"),
      new Request("http://localhost:3000/favicon.ico"),
      new Request("http://localhost:3000/non-existent.html"),
    ];
    for (const request of test) {
      await handler(request, MOCK_CONN_INFO);
      assertEquals(staticServer.history.pop(), [request, staticDir]);
      assertEquals(packager.history.length, 0);
    }
  }
);

Deno.test(
  "HTTPAppServer calls font packager for POSTs to / with multipart form data",
  async () => {
    const staticDir = "/www";
    const staticServer = new MockStaticServer();
    const packager = new MockFontPackager();
    const handler = new HTTPAppServer({
      packager,
      port: 3000,
      staticDir,
      staticServer,
    }).getHandler();
    const name = "My Cool Font";
    const files = Array.from({ length: 5 }).map(
      (_, i) => new File([], `${i}.ttf`, { type: "font/ttf" })
    );
    const body = new FormData();
    body.set("name", name);
    for (const file of files) {
      body.append("files", file);
    }
    const init: RequestInit = { method: "POST", body };
    const request = new Request("http://localhost:3000/", init);
    const response = await handler(request, MOCK_CONN_INFO);
    assertEquals(staticServer.history.length, 0);
    assertEquals(packager.history.length, 1);
    assertEquals(response.headers.get("content-type"), "application/zip");
  }
);

Deno.test(
  "HTTPAppServer handles errors with expected HTTP status",
  async () => {
    const staticDir = "/www";
    const staticServer = new MockStaticServer();
    const packager = new MockFontPackager();
    const handler = new HTTPAppServer({
      packager,
      port: 3000,
      staticDir,
      staticServer,
    }).getHandler();
    const name = "My Cool Font";
    const files = Array.from({ length: 5 }).map(
      (_, i) => new File([], `${i}.ttf`, { type: "font/ttf" })
    );
    const body = new FormData();
    body.set("name", name);
    for (const file of files) {
      body.append("files", file);
    }
    const variant: FontVariant = {
      id: "italic.100",
      style: "italic",
      weight: "100",
      name: "",
    };
    const tests = [
      [new FontConversionError("", ""), 400],
      [new ErrorFontVariantCollision(variant, variant), 400],
      [new Error(), 500],
    ] as const;
    const init: RequestInit = { method: "POST", body };
    for (const [error, expected] of tests) {
      const request = new Request("http://localhost:3000/", init);
      packager.throws = error;
      const response = await handler(request, MOCK_CONN_INFO);
      assertEquals(response.status, expected);
    }
  }
);

Deno.test(
  "HTTPAppServer rejects POSTs to / without multipart form data",
  async () => {
    const staticDir = "/www";
    const staticServer = new MockStaticServer();
    const packager = new MockFontPackager();
    const handler = new HTTPAppServer({
      packager,
      port: 3000,
      staticDir,
      staticServer,
    }).getHandler();
    const name = "My Cool Font";
    const files = Array.from({ length: 5 }).map(
      (_, i) => new File([], `${i}.ttf`, { type: "font/ttf" })
    );
    const tests = [
      [
        new URLSearchParams([
          ["name", name],
          ...files.map((file) => ["files", file.name]),
        ]),
        "application/x-www-form-urlencode",
      ],
      [files[0], "font/ttf"],
    ] as const;
    for (const [body, contentType] of tests) {
      const headers = { "content-type": contentType };
      const init: RequestInit = { method: "POST", body, headers };
      const request = new Request("http://localhost:3000/", init);
      const response = await handler(request, MOCK_CONN_INFO);
      assertEquals(staticServer.history.length, 0);
      assertEquals(packager.history.length, 0);
      assertEquals(response.status, 400);
    }
  }
);

Deno.test("HTTPAppServer marks all other requests as not found", async () => {
  const staticDir = "/www";
  const staticServer = new MockStaticServer();
  const packager = new MockFontPackager();
  const handler = new HTTPAppServer({
    packager,
    port: 3000,
    staticDir,
    staticServer,
  }).getHandler();
  const tests = [
    ["POST", "/test"],
    ["POST", "/favicon.ico"],
    ["POST", "/index.html"],
    ["PUT", "/"],
    ["DELETE", "/"],
    ["PATCH", "/"],
  ];
  for (const [method, route] of tests) {
    const request = new Request("http://localhost:3000" + route, { method });
    const response = await handler(request, MOCK_CONN_INFO);
    assertEquals(staticServer.history.length, 0);
    assertEquals(packager.history.length, 0);
    assertEquals(response.status, 404);
  }
});
