import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.148.0/testing/asserts.ts";

import {
  DefaultFilenameParser,
  ErrorFontVariantCollision,
} from "./filename_parser.ts";

Deno.test("DefaultFilenameParser works with all combinations", () => {
  const test = new Map([
    ["normal font thin", "normal.100"],
    ["normal font extra light", "normal.200"],
    ["normal font light", "normal.300"],
    ["normal font normal", "normal.400"],
    ["normal font medium", "normal.500"],
    ["normal font semi bold", "normal.600"],
    ["normal font bold", "normal.700"],
    ["normal font extra bold", "normal.800"],
    ["normal font black", "normal.900"],
    ["italic font thin", "italic.100"],
    ["italic font extra light", "italic.200"],
    ["italic font light", "italic.300"],
    ["italic font normal", "italic.400"],
    ["italic font medium", "italic.500"],
    ["italic font semi bold", "italic.600"],
    ["italic font bold", "italic.700"],
    ["italic font extra bold", "italic.800"],
    ["italic font black", "italic.900"],
  ]);
  const parser = new DefaultFilenameParser();
  const result = parser.parse([...test.keys()]);
  for (const { name, id } of result) {
    assertEquals(id, test.get(name));
  }
});

Deno.test(
  "DefaultFilenameParser works with different separators and orders",
  () => {
    const tests = [
      ["FontBold_italic", "italic.700"],
      ["Font_bold_italic", "italic.700"],
      ["font_boldItalic", "italic.700"],
      ["Font bold italic", "italic.700"],
      ["Font_bold_italic", "italic.700"],
      ["italic-bold-Font", "italic.700"],
      ["BOLD   Font_italic", "italic.700"],
    ];
    const parser = new DefaultFilenameParser();
    for (const [name, expected] of tests) {
      assertEquals(parser.parse([name])[0].id, expected);
    }
  }
);

Deno.test(
  "DefaultFilenameParser missing descriptions default to 400 and normal",
  () => {
    const tests = [
      ["font italic", "italic.400"],
      ["Font bold", "normal.700"],
      ["font", "normal.400"],
    ];
    const parser = new DefaultFilenameParser();
    for (const [name, expected] of tests) {
      assertEquals(parser.parse([name])[0].id, expected);
    }
  }
);

Deno.test("DefaultFilenameParser throws error on conflict", () => {
  const test = ["font_ultra_bold", "font_extra_bold"];
  const parser = new DefaultFilenameParser();
  assertThrows(() => parser.parse(test), ErrorFontVariantCollision);
});
