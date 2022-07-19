import { StringReader } from "https://deno.land/std@0.148.0/io/mod.ts";

import { FontVariant } from "./font.ts";

export interface CSSBuilder {
  build: (name: string, files: FontVariant[]) => Deno.Reader;
}

export class DefaultCSSBuilder implements CSSBuilder {
  build(name: string, files: FontVariant[]): Deno.Reader {
    const css = files
      .map((file) =>
        `
@font-face {
  font-family: "${name}";
  src: url("./${file.id}.woff2") format("woff2"),
    url("./${file.id}.woff") format("woff"),
    url("./${file.id}.ttf") format("ttf");
  font-style: ${file.style};
  font-weight: ${file.weight};
}
      `.trim()
      )
      .join("\n\n");
    return new StringReader(css);
  }
}
