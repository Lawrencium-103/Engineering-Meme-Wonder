/**
 * Minimal hyperscript for building Satori element trees without React.
 * Mirrors the approach already used in src/lib/pass.ts and src/lib/og.ts.
 */
export type El = { type: string; props: Record<string, unknown> };

export function h(
  type: string,
  style: Record<string, unknown> | null,
  children?: unknown,
): El {
  const props: Record<string, unknown> = {};
  if (style) props.style = style;
  if (children !== undefined) props.children = children;
  return { type, props };
}

/** Satori needs src/width/height on props (NOT style) for <img>. */
export function img(
  src: string,
  width: number,
  height: number,
  style?: Record<string, unknown>,
): El {
  const props: Record<string, unknown> = { src, width, height };
  if (style) props.style = style;
  return { type: "img", props };
}

/** An absolutely-positioned, centred, full-width block used for flyer text. */
export function block(
  top: number,
  children: unknown,
  extra?: Record<string, unknown>,
): El {
  return h(
    "div",
    {
      position: "absolute",
      top,
      left: 0,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...extra,
    },
    children,
  );
}
