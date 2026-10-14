/** Slug helpers: human-readable, URL-safe, collision-safe via random suffix. */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function generateSlug(groomName: string, brideName: string): string {
  const base = slugify(`${groomName}-weds-${brideName}`) || "wedding";
  const suffix = Math.random().toString(36).slice(2, 7); // 5 chars, ~60 bits with base
  return `${base}-${suffix}`;
}
