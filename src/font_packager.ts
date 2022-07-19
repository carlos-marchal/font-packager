import * as path from "https://deno.land/std@0.148.0/path/mod.ts";
import { copy } from "https://deno.land/std@0.148.0/streams/conversion.ts";

import { CommandExecutionError, CommandRunner } from "./command_runner.ts";
import { CSSBuilder } from "./css_builder.ts";
import { FilenameParser } from "./filename_parser.ts";
import { FontVariant } from "./font.ts";

export interface FontSource {
  name: string;
  stream: Deno.Reader;
}

export interface FontPackagerInput {
  name: string;
  sources: FontSource[];
}

export interface FontPackagerOutput {
  zipStream: Deno.Reader;
}

export interface FontPackagerInterface {
  package: (request: FontPackagerInput) => Promise<FontPackagerOutput>;
}

export interface FontPackagerOptions {
  commandRunner: CommandRunner;
  filenameParser: FilenameParser;
  cssBuilder: CSSBuilder;
}

interface Font {
  variant: FontVariant;
  source: FontSource;
}

export class FontPackagerService implements FontPackagerInterface {
  #commandRunner: CommandRunner;
  #filenameParser: FilenameParser;
  #cssBuilder: CSSBuilder;
  constructor(options: FontPackagerOptions) {
    this.#commandRunner = options.commandRunner;
    this.#filenameParser = options.filenameParser;
    this.#cssBuilder = options.cssBuilder;
  }

  async package(input: FontPackagerInput): Promise<FontPackagerOutput> {
    const fonts = this.#getFontInfo(input.sources);
    const cwd = await Deno.makeTempDir({ prefix: "font-packager-" });
    try {
      const zipName = input.name.replace(/[ _-]g/, "-").toLowerCase();
      const zipBuildPath = path.join(cwd, zipName);
      await Deno.mkdir(zipBuildPath);
      await Promise.all([
        this.#convertFonts(zipBuildPath, fonts),
        this.#writeCSSFile(zipBuildPath, input.name, fonts),
      ]);
      const zipStream = await this.#makeZIPStream(cwd, zipName);
      return { zipStream };
    } catch (error: unknown) {
      await Deno.remove(cwd, { recursive: true });
      throw error;
    }
  }

  #getFontInfo(sources: FontSource[]): Font[] {
    const names = sources.map((source) => source.name);
    const variants = this.#filenameParser.parse(names);
    const fonts: Font[] = Array.from({ length: variants.length });
    for (const [i, variant] of variants.entries()) {
      fonts[i] = { variant, source: sources[i] };
    }
    return fonts;
  }

  async #convertFonts(dirPath: string, fonts: Font[]) {
    await Promise.all(
      fonts.map(async (font) => {
        const fontPath = path.join(dirPath, font.variant.id + ".ttf");
        const file = await Deno.open(fontPath, { create: true, write: true });
        try {
          await copy(font.source.stream, file);
        } finally {
          file.close();
        }
      })
    );

    await Promise.all(
      fonts.map(async (font) => {
        const file = path.join(dirPath, font.variant.id + ".ttf");
        try {
          await Promise.all([
            this.#commandRunner.run(dirPath, ["sfnt2woff-zopfli", file]),
            this.#commandRunner.run(dirPath, ["woff2_compress", file]),
          ]);
        } catch (error: unknown) {
          if (error instanceof CommandExecutionError) {
            throw new FontConversionError(font.variant.name, error.stederr);
          }
          throw error;
        }
      })
    );
  }

  async #writeCSSFile(dirPath: string, fontName: string, fonts: Font[]) {
    const cssPath = path.join(dirPath, "font.css");
    const fontVariants = fonts.map((font) => font.variant);
    const cssData = this.#cssBuilder.build(fontName, fontVariants);
    const cssFile = await Deno.open(cssPath, { create: true, write: true });
    try {
      await copy(cssData, cssFile);
    } finally {
      cssFile.close();
    }
  }

  async #makeZIPStream(cwd: string, zipName: string): Promise<Deno.Reader> {
    const zipPath = path.join(cwd, `${zipName}.zip`);
    await this.#commandRunner.run(cwd, ["zip", "-r", zipPath, zipName]);
    const zipFile = await Deno.open(zipPath, { read: true });

    return {
      async read(buffer): Promise<null | number> {
        const read = await zipFile.read(buffer);
        if (read === null) {
          zipFile.close();
          Deno.remove(cwd, { recursive: true });
        }
        return read;
      },
    };
  }
}

export class FontConversionError extends Error {
  file: string;
  stderr: string;
  constructor(file: string, stderr: string) {
    super(`error converting font file ${file}:\n${stderr}`);
    this.file = file;
    this.stderr = stderr;
  }
}
