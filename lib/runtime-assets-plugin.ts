import { createHash } from 'node:crypto';
import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/** Keep authoring assets intact; share byte-identical runtime textures on Pages. */
export function runtimeAssets(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'profile-runtime-assets',
    apply: 'build',
    config: () => ({ build: { copyPublicDir: false } }),
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle() {
      const source = config.publicDir;
      if (!source) return;
      const excluded = new Set<string>();
      const runtimeFiles = new Set<string>();
      const manifests: {
        file: string;
        manifest: {
          layers: {
            file?: string;
            runtimeFile: string;
          }[];
        };
      }[] = [];
      const scan = async (directory: string) => {
        const entries = await readdir(directory, { withFileTypes: true });
        // Stable traversal keeps shared URLs reproducible across operating systems.
        for (const entry of entries.sort((a, b) =>
          a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
        )) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) await scan(file);
          else if (entry.name === 'manifest.json') {
            const manifest = JSON.parse(await readFile(file, 'utf8'));
            manifests.push({ file, manifest });
            for (const layer of manifest.layers) {
              runtimeFiles.add(path.resolve(directory, layer.runtimeFile));
              if (layer.file) excluded.add(path.resolve(directory, layer.file));
            }
          }
        }
      };
      await scan(path.join(source, 'models'));
      // A source PNG can itself be a runtime texture. Never exclude such a file.
      for (const file of runtimeFiles) excluded.delete(file);
      const canonical = new Map<string, string>();
      const replacements = new Map<string, string>();
      let savedBytes = 0;
      for (const file of [...runtimeFiles].sort()) {
        const data = await readFile(file);
        const key = `${path.extname(file)}:${createHash('sha256').update(data).digest('hex')}`;
        const existing = canonical.get(key);
        if (existing) {
          replacements.set(file, existing);
          excluded.add(file);
          savedBytes += data.byteLength;
        } else canonical.set(key, file);
      }
      const output = path.resolve(config.root, config.build.outDir);
      await cp(source, output, {
        recursive: true,
        filter: (file) =>
          path.basename(file) !== '.DS_Store' && !excluded.has(file),
      });
      for (const { file, manifest } of manifests) {
        const directory = path.dirname(file);
        for (const layer of manifest.layers) {
          const shared = replacements.get(
            path.resolve(directory, layer.runtimeFile),
          );
          if (shared)
            layer.runtimeFile = path
              .relative(directory, shared)
              .split(path.sep)
              .join('/');
        }
        await writeFile(
          path.join(output, path.relative(source, file)),
          JSON.stringify(manifest),
        );
      }
      config.logger.info(
        `Runtime textures: shared ${replacements.size} identical files, saved ${(savedBytes / 1_000_000).toFixed(2)} MB.`,
      );
    },
  };
}
