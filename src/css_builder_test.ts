import { assertEquals } from "https://deno.land/std@0.148.0/testing/asserts.ts";
import { readAll } from "https://deno.land/std@0.148.0/streams/mod.ts";

import { DefaultCSSBuilder } from "./css_builder.ts";

Deno.test("DefaultCSSBuilder snapshot test", async () => {
  const builder = new DefaultCSSBuilder();
  const stream = builder.build("Sample Font", [
    { id: "normal.400", name: "normal", style: "normal", weight: "400" },
    { id: "italic.400", name: "italic", style: "italic", weight: "400" },
    { id: "normal.700", name: "normal_bold", style: "normal", weight: "700" },
    { id: "italic.700", name: "italic_bold", style: "italic", weight: "700" },
  ]);
  const actual = new TextDecoder().decode(await readAll(stream));
  const expected = `
    @font-face {    
      font-family: "Sample Font";    
      src: url("./normal.400.woff2") format("woff2"),    
        url("./normal.400.woff") format("woff"),    
        url("./normal.400.ttf") format("ttf");    
      font-style: normal;    
      font-weight: 400;    
    }

    @font-face {    
      font-family: "Sample Font";    
      src: url("./italic.400.woff2") format("woff2"),    
        url("./italic.400.woff") format("woff"),    
        url("./italic.400.ttf") format("ttf");    
      font-style: italic;    
      font-weight: 400;    
    }    
        
    @font-face {    
      font-family: "Sample Font";    
      src: url("./normal.700.woff2") format("woff2"),    
        url("./normal.700.woff") format("woff"),    
        url("./normal.700.ttf") format("ttf");    
      font-style: normal;    
      font-weight: 700;    
    }    
        
    @font-face {    
      font-family: "Sample Font";    
      src: url("./italic.700.woff2") format("woff2"),    
        url("./italic.700.woff") format("woff"),    
        url("./italic.700.ttf") format("ttf");    
      font-style: italic;    
      font-weight: 700;    
    }
  `;
  assertEquals(
    actual.replace(/\s+/g, " ").trim(),
    expected.replace(/\s+/g, " ").trim()
  );
});
