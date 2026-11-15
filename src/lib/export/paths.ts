export function safeName(name: string, fallback = 'Untitled'): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  return (cleaned || fallback).slice(0, 120).trim();
}

/** Take `name`, or `name (2)`, `name (3)` … when it is already used in `used` (case-insensitive). */
export function uniqueName(name: string, used: Set<string>): string {
  let n = name;
  let i = 2;
  while (used.has(n.toLowerCase())) n = `${name} (${i++})`;
  used.add(n.toLowerCase());
  return n;
}

/** Path of `to`, relative to the folder that holds the file `from`. Both use "/". */
export function relativePath(from: string, to: string): string {
  const f = from.split('/').slice(0, -1);
  const t = to.split('/');
  let i = 0;
  while (i < f.length && i < t.length - 1 && f[i] === t[i]) i++;
  return [...Array(f.length - i).fill('..'), ...t.slice(i)].join('/');
}

export interface LayoutFolder {
  id: string;
  title: string;
  parentId: string | null;
}
export interface LayoutThread {
  id: string;
  title: string;
  /** folder ids in crawl order */
  folderIds: string[];
}
export interface ItemPath {
  /** primary folder path, "" for the root */
  dir: string;
  /** file name without extension, unique within `dir` */
  base: string;
  /** other folder paths where the thread also lives, each with its own unique base */
  others: { dir: string; base: string }[];
}

export function layout(folders: LayoutFolder[], threads: LayoutThread[]): { folderPath: Map<string, string>; items: Map<string, ItemPath> } {
  const used = new Map<string, Set<string>>(); // dir -> used lower-case names (folders and files)
  const take = (dir: string, name: string) => {
    if (!used.has(dir)) used.set(dir, new Set());
    return uniqueName(name, used.get(dir)!);
  };
  const folderPath = new Map<string, string>();
  const byId = new Map(folders.map((f) => [f.id, f]));
  const resolve = (f: LayoutFolder): string => {
    const known = folderPath.get(f.id);
    if (known !== undefined) return known;
    const parent = f.parentId ? byId.get(f.parentId) : undefined;
    const parentPath = parent ? resolve(parent) : '';
    const p = (parentPath ? parentPath + '/' : '') + take(parentPath, safeName(f.title, 'Folder'));
    folderPath.set(f.id, p);
    return p;
  };
  folders.forEach(resolve);

  const items = new Map<string, ItemPath>();
  for (const t of threads) {
    const dirs = t.folderIds.map((id) => folderPath.get(id)).filter((d): d is string => d !== undefined);
    const [dir = '', ...rest] = dirs;
    const name = safeName(t.title);
    items.set(t.id, {
      dir,
      base: take(dir, name),
      others: rest.map((d) => ({ dir: d, base: take(d, name) })),
    });
  }
  return { folderPath, items };
}

export const join = (dir: string, file: string) => (dir ? `${dir}/${file}` : file);
