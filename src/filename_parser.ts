import {
  DEFAULT_FONT_STYLE,
  DEFAULT_FONT_WEIGHT,
  FONT_STYLES,
  FONT_WEIGHTS,
  FontVariantID,
  FontWeight,
  FontVariant,
} from "./font.ts";

const FONT_STYLE_REGEXPS = FONT_STYLES.map(
  (style) => [new RegExp(style, "i"), style] as const
);

const FONT_WEIGHT_REGEXPS = Object.entries(FONT_WEIGHTS)
  .flatMap(([weight, names]) =>
    names.map((name) => {
      const words = name.split(/\s+/);
      return [words, weight as FontWeight] as const;
    })
  )
  // First test variants whose name has more words (e.g. to avoid matching
  // file "ultra bold" to name "bold" instead of "ultra bold")
  .sort(([wordsA], [wordsB]) => (wordsA.length > wordsB.length ? -1 : 1))
  .map(
    ([words, weight]) =>
      [new RegExp(words.join("[ ._-]?"), "i"), weight] as const
  );

function matchRegexps<T>(
  names: string[],
  regexps: Array<readonly [RegExp, T]>,
  defaultValue: T
): Map<string, T> {
  const namesCopy = new Set(names);
  const map = new Map<string, T>();
  for (const [regexp, style] of regexps) {
    for (const name of namesCopy) {
      if (regexp.test(name)) {
        map.set(name, style);
        namesCopy.delete(name);
      }
    }
  }
  for (const name of namesCopy) {
    map.set(name, defaultValue);
  }
  return map;
}

export interface FilenameParser {
  parse: (names: string[]) => FontVariant[];
}

export class DefaultFilenameParser {
  parse(names: string[]): FontVariant[] {
    const styles = matchRegexps(names, FONT_STYLE_REGEXPS, DEFAULT_FONT_STYLE);
    const weights = matchRegexps(
      names,
      FONT_WEIGHT_REGEXPS,
      DEFAULT_FONT_WEIGHT
    );
    const variants = new Map<string, FontVariant>();
    for (const name of names) {
      const style = styles.get(name)!;
      const weight = weights.get(name)!;
      const id: FontVariantID = `${style}.${weight}`;
      const variant: FontVariant = { name, style, weight, id };
      const collision = variants.get(id);
      if (collision !== undefined) {
        throw new ErrorFontVariantCollision(collision, variant);
      }

      variants.set(id, variant);
    }
    return [...variants.values()];
  }
}

export class ErrorFontVariantCollision extends Error {
  variantA: FontVariant;
  variantB: FontVariant;
  constructor(variantA: FontVariant, variantB: FontVariant) {
    super(
      `files ${variantA.name} and ${variantB.name} both correspond to the same variant ${variantA.id}`
    );
    this.variantA = variantA;
    this.variantB = variantB;
  }
}
