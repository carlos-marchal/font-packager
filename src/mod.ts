import * as path from "https://deno.land/std@0.148.0/path/mod.ts";

import { DefaultCommandRunner } from "./command_runner.ts";
import { DefaultCSSBuilder } from "./css_builder.ts";
import { DefaultFilenameParser } from "./filename_parser.ts";
import { FontPackagerService } from "./font_packager.ts";
import { HTTPAppServer } from "./server.ts";

const DEFAULT_PORT = 3000;
function getPort(): number {
  const envPort = Deno.env.get("PORT");
  if (envPort === undefined) {
    return DEFAULT_PORT;
  }
  const parsedPort = Number.parseInt(envPort, 10);
  return Number.isInteger(parsedPort) ? parsedPort : DEFAULT_PORT;
}

const filenameParser = new DefaultFilenameParser();
const commandRunner = new DefaultCommandRunner();
const cssBuilder = new DefaultCSSBuilder();
const packager = new FontPackagerService({
  filenameParser,
  commandRunner,
  cssBuilder,
});

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const staticDir = path.join(moduleDir, "..", "html");
const server = new HTTPAppServer({ packager, port: getPort(), staticDir });
await server.serve();
