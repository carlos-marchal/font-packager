export const FONT_STYLES = ["italic", "normal"] as const;

export type FontStyle = typeof FONT_STYLES[number];

export const DEFAULT_FONT_STYLE: FontStyle = "normal";

export const FONT_WEIGHTS = {
  "100": ["100", "thin", "hairline"],
  "200": ["200", "extra light", "ultra light"],
  "300": ["300", "light"],
  "400": ["400", "regular"],
  "500": ["500", "medium"],
  "600": ["600", "semi bold", "demi bold"],
  "700": ["700", "bold"],
  "800": ["800", "extra bold", "ultra bold"],
  "900": ["900", "black", "heavy"],
};

export type FontWeight = keyof typeof FONT_WEIGHTS;

export const DEFAULT_FONT_WEIGHT: FontWeight = "400";

export type FontVariantID = `${FontStyle}.${FontWeight}`;

export interface FontVariant {
  name: string;
  style: FontStyle;
  weight: FontWeight;
  id: FontVariantID;
}
