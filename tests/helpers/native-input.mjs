import { execFileSync } from 'node:child_process';
export const xdo = (...args) => execFileSync('xdotool', args.map(String), { encoding: 'utf8' }).trim();
export const move = (id, x, y) => xdo('mousemove', '--sync', '--window', id, Math.round(x), Math.round(y));
export function nativeWindow(session) {
  const ids = xdo('search', '--onlyvisible', '--pid', session.child.pid).split(/\s+/);
  const id = ids.find(id => /WIDTH=(\d+)/.exec(xdo('getwindowgeometry', '--shell', id))?.[1] > 400);
  if (!id) throw new Error('No visible Obsidian X11 window');
  xdo('windowactivate', '--sync', id);
  return id;
}
