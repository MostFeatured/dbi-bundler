const build = (async ({ dist: rDist = "./dist", main: rMain = "./index.js", downloadPackages = false, createExecutable = false, excludes = [] } = {}) => {

  const path = require("path");
  const dist = path.resolve(process.cwd(), rDist);
  const main = path.resolve(process.cwd(), rMain);
  const executableDir = path.dirname(main);
  const executableName = path.basename(main)
  const bundlePath = path.resolve(executableDir, `./${executableName.split(".").shift()}.bundle.js`)
  const distResultPath = path.resolve(dist, `./${executableName.split(".").shift()}.js`)
  const distMinPath = path.resolve(dist, `./${executableName.split(".").shift()}.min.js`)
  const distCMinPath = path.resolve(dist, `./${executableName.split(".").shift()}.cmin.js`)

  const { execAsync, makeSureFolderExistsSync } = require("stuffs")
  const { readFileSync, writeFileSync, unlinkSync } = require('fs');
  const readFolder = require('recursive-readdir');

  makeSureFolderExistsSync(dist);

  let realFile = readFileSync(main, 'utf-8');
  const recImports = [...realFile.matchAll(/recursiveImport\(([^)]+)\);?/g)].map(x => [x, x[1].slice(1, -1)]);

  for (let i = 0; i < recImports.length; i++) {
    const statement = recImports[i][0][0];
    const path = recImports[i][1];
    const _paths = await readFolder(path)
    realFile = realFile.replace(statement, (_paths).map(x => `require('.\/${x.replaceAll("\\", "\/")}')`).join("; \n"));
  }

  realFile = realFile.replace(/( *)recursiveImport,?( *)/g, " ").replace('const { } = require("@mostfeatured/dbi");', "");

  writeFileSync(bundlePath, realFile);

  require('esbuild').buildSync({
    entryPoints: [bundlePath],
    bundle: true,
    platform: 'node',
    external: ['./node_modules/*', './package.json', ...excludes],
    outfile: bundlePath,
    allowOverwrite: true,
  });

  let out = readFileSync(bundlePath, 'utf-8');
  unlinkSync(bundlePath);

  var UglifyJS = require("uglify-js");

  let mIn = out + "";

  [...(new Set([...mIn.matchAll(/require_[^ ]+|__getOwnPropNames|__commonJS/g)].map(x => x[0])))]
    .forEach((tReq) => mIn = mIn.replaceAll(tReq, "_" + Math.floor(Math.random() * 1000000).toString()));

  const result = UglifyJS.minify(mIn, { output: { ast: true } });
  writeFileSync(distMinPath, result.code.replaceAll("\n", "\\n"));

  [...(result.code.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [])].forEach(([all, quato, rInner]) => {
    let nStr = quato;
    const inner = eval(`${all}`);
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i].toString();
      nStr += (
        (z = (c.charCodeAt(0)).toString(16).toUpperCase()),
        (z.length <= 1) ? z = "0" + z : null,
        prefix = /[a-zA-Z0-9]/.test(c) ? "x" : "u0",
        (z.length <= 2 && prefix == "u0") ? z = "0" + z : null,
        `\\${prefix}` + z
      );
    }
    nStr += quato;
    try { if (inner == eval(nStr)) result.code = result.code.replace(all, nStr); } catch {}
  });

  const openArrayMap = {};
  [...(result.code.match(/\.\.\.[a-zA-Z0-9]+/ig) || [])].forEach((a) => {
    const rand = "_" + Math.floor(Math.random() * 10000000000) + "a";
    if (openArrayMap[a]) return;
    openArrayMap[a] = rand;
    result.code = result.code.replaceAll(a, rand);
  });

  [...(result.code.matchAll(/((["'])(?:(?=(\\?))\2.)*?\1)|((\??)\.([a-zA-Z_0-9]+))/gi) || [])].forEach(([_, __, ___, ____, all, question, propName]) => {
    if (!all) return;
    let nStr = `${question ? "?." : ""}[${JSON.stringify(propName)}]`
    result.code = result.code.replace(all, nStr)
  });
  [...(result.code.matchAll(/((["'])(?:(?=(\\?))\2.)*?\1)|((\??)\.([a-zA-Z_0-9]+))/gi) || [])].forEach(([_, __, ___, ____, all, question, propName]) => {
    if (!all) return;
    let nStr = `${question ? "?." : ""}[${JSON.stringify(propName)}]`
    result.code = result.code.replace(all, nStr)
  });
  [...(result.code.matchAll(/((["'])(?:(?=(\\?))\2.)*?\1)|(\{|\,)(([a-zA-Z0-9_]+)\:)/gi) || [])].forEach(([_, __, ___, ____, _z, all, propName]) => {
    if (!all) return;
    let nStr = `[${JSON.stringify(propName)}]:`;
    result.code = result.code.replace(all, nStr)
  });
  [...(result.code.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [])].forEach(([all, quato, rInner]) => {
    let nStr = quato;
    const inner = eval(`${all}`);
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i].toString();
      nStr += (
        (z = (c.charCodeAt(0)).toString(16).toUpperCase()),
        (z.length <= 1) ? z = "0" + z : null,
        prefix = /[a-zA-Z0-9]/.test(c) ? "x" : "u0",
        (z.length <= 2 && prefix == "u0") ? z = "0" + z : null,
        `\\${prefix}` + z
      );
    }
    nStr += quato;
    try { if (inner == eval(nStr)) result.code = result.code.replace(all, nStr); } catch {}
  });
  for (let oName in openArrayMap) {
    const nName = openArrayMap[oName];
    result.code = result.code.replaceAll(nName, oName);
  }
  writeFileSync(distResultPath, out);

  writeFileSync(distCMinPath, result.code.replaceAll("\n", "\\n"));
  const package = require(path.resolve(process.cwd(), "./package.json"));
  delete package.dependencies["uglify-js"];
  delete package.dependencies["esbuild"];
  delete package.dependencies["@mostfeatured/bundler"];
  writeFileSync(path.resolve(dist, "./package.json"), JSON.stringify(package, null, 2));
  excludes?.forEach(p => {
    try {
      const dPath = path.resolve(dist, p);
      makeSureFolderExistsSync(path.dirname(dPath));
      writeFileSync(dPath, readFileSync(path.resolve(process.cwd(), p), "utf-8"));
    } catch { }
  });
  if (!downloadPackages && !createExecutable) return;
  await execAsync("npm i", dist);
  if (!createExecutable) return;
  await execAsync(`npx -y pkg ${path.basename(distResultPath)}`, dist);
});

module.exports.build = build;