import * as path from "https://deno.land/std@0.148.0/path/mod.ts";
import { copy } from "https://deno.land/std@0.148.0/streams/conversion.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.148.0/testing/asserts.ts";

import { DefaultCommandRunner } from "./command_runner.ts";
import { DefaultCSSBuilder } from "./css_builder.ts";
import { DefaultFilenameParser } from "./filename_parser.ts";
import { FontPackagerService, FontSource } from "./font_packager.ts";

// As this service is basically glue between its components, and needs the
// filesystem to run, we will just check it directly in an integration test
Deno.test(
  "FontPackagerService integration test",
  { ignore: Deno.env.get("INTEGRATION_TEST") === undefined },
  async () => {
    const commandRunner = new DefaultCommandRunner();
    const cssBuilder = new DefaultCSSBuilder();
    const filenameParser = new DefaultFilenameParser();
    const packager = new FontPackagerService({
      commandRunner,
      cssBuilder,
      filenameParser,
    });

    const fontName = "Testy Font";
    const sources: FontSource[] = [];
    const files: Deno.FsFile[] = [];
    const modulePath = path.fromFileUrl(import.meta.url);
    const testDirPath = path.join(modulePath, "..", "..", "test");

    const tmpDirPath = await Deno.makeTempDir({
      prefix: "font-packager-test-",
    });

    try {
      for await (const entry of Deno.readDir(testDirPath)) {
        const filePath = path.join(testDirPath, entry.name);
        const file = await Deno.open(filePath, { read: true });
        files.push(file);
        sources.push({ name: entry.name, stream: file });
      }
      const { zipStream } = await packager.package({ name: fontName, sources });

      const zipPath = path.join(tmpDirPath, "output.zip");
      const zipFile = await Deno.open(zipPath, { create: true, write: true });
      await copy(zipStream, zipFile);
      zipFile.close();
      await new DefaultCommandRunner().run(tmpDirPath, ["unzip", "output.zip"]);
      let rootZIPDir: string | undefined;

      for await (const entry of Deno.readDir(tmpDirPath)) {
        if (entry.name === "output.zip") {
          continue;
        }
        assert(entry.isDirectory);
        assertEquals(rootZIPDir, undefined);
        rootZIPDir = path.join(tmpDirPath, entry.name);
      }
      assertNotEquals(rootZIPDir, undefined);

      const outputFiles: string[] = [];
      for await (const entry of Deno.readDir(rootZIPDir!)) {
        assert(entry.isFile);
        outputFiles.push(entry.name);
      }

      const expected = [
        "font.css",
        "normal.300.ttf",
        "normal.300.woff",
        "normal.300.woff2",
        "normal.400.ttf",
        "normal.400.woff",
        "normal.400.woff2",
      ];
      assertEquals(outputFiles.length, expected.length);
      assertArrayIncludes(outputFiles, expected);
    } finally {
      console.log("here");
      await Deno.remove(tmpDirPath, { recursive: true });
      for (const file of files) {
        file.close();
      }
    }
  }
);
