const build = (async ({ dist: rDist = "./dist", main: rMain = "./index.js", downloadPackages = false, createExecutable = false } = {  }) => {
  const path = require("path");
  const dist = path.resolve(process.cwd(), rDist);
  const main = path.resolve(process.cwd(), rMain);
  const executableDir = path.dirname(main);
  const executableName = path.basename(main)
  const bundlePath = path.resolve(executableDir, `./${executableName.split(".").shift()}.bundle.js`)
  const distResultPath = path.resolve(dist, `./${executableName.split(".").shift()}.js`)
  const distMinPath = path.resolve(dist, `./${executableName.split(".").shift()}.min.js`)
  const { execAsync } = require("stuffs")
  const { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } = require('fs');
  const readFolder = require('recursive-readdir');

  let realFile = readFileSync(main, 'utf-8');
  const recImports = [...realFile.matchAll(/recursiveImport\(([^)]+)\);?/g)].map(x => [x, x[1].slice(1, -1)]);
  for (let i = 0; i < recImports.length; i++) {
    const statement = recImports[i][0][0];
    const path = recImports[i][1];
    const _paths = await readFolder(path)
    realFile = realFile.replace(statement, (_paths).map(x => `require('.\/${x.replaceAll("\\", "\/")}')`).join("; "));
  }
  realFile = realFile.replace("recursiveImport", "");
  realFile = realFile.replace('const {  } = require("@mostfeatured/dbi");', "");
  writeFileSync(bundlePath, realFile)
  require('esbuild').buildSync({
    entryPoints: [bundlePath],
    bundle: true,
    platform: 'node',
    external: ['./node_modules/*'],
    outfile: bundlePath,
    allowOverwrite: true,
  });
  const out = readFileSync(bundlePath, 'utf-8');
  unlinkSync(bundlePath);
  var UglifyJS = require("uglify-js");
  const result = UglifyJS.minify(out);
  if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
  writeFileSync(distResultPath, out);
  writeFileSync(distMinPath, result.code.replaceAll("\n", "\\n"));
  const package = require("./package.json");
  delete package.dependencies["uglify-js"];
  delete package.dependencies["esbuild"];
  writeFileSync('./dist/package.json', JSON.stringify(package, null, 2));
  if (!downloadPackages && !createExecutable) return;
  await execAsync("npm i", dist);
  if (!createExecutable) return;
  await execAsync("npm install -g pkg", dist);
  await execAsync(`pkg ${path.basename(distResultPath)}`, dist)
});

module.exports.build = build;