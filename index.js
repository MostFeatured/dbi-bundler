const getMainContent = require("./getMainContent");

const build = (async ({ dist: rDist = "./dist", main: rMain = "./index.js", downloadPackages = false, createExecutable = false, excludes = [] } = {}) => {

  const path = require("path");
  const dist = path.resolve(process.cwd(), rDist);
  const main = path.resolve(process.cwd(), rMain);
  const executableDir = path.dirname(main);
  const executableName = path.basename(main)
  const bundlePath = path.resolve(executableDir, `./${executableName.split(".").shift()}.bundle.js`)
  const distResultPath = path.resolve(dist, `./${executableName.split(".").shift()}.js`)
  const distMinPath = path.resolve(dist, `./${executableName.split(".").shift()}.min.js`)

  const { execAsync, makeSureFolderExistsSync } = require("stuffs")
  const { readFileSync, writeFileSync, unlinkSync } = require('fs');

  makeSureFolderExistsSync(dist);

  await getMainContent(main, bundlePath);

  require('esbuild').buildSync({
    entryPoints: [bundlePath],
    bundle: true,
    platform: 'node',
    external: [...excludes],
    outfile: bundlePath,
    allowOverwrite: true,
  });

  let out = readFileSync(bundlePath, 'utf-8').toString();
  unlinkSync(bundlePath);

  let outMin = require("uglify-js").minify(out, { compress: true }).code

  writeFileSync(distResultPath, out);
  writeFileSync(distMinPath, outMin);


  excludes?.forEach(p => {
    try {
      const dPath = path.resolve(dist, p);
      makeSureFolderExistsSync(path.dirname(dPath));
      writeFileSync(dPath, readFileSync(path.resolve(process.cwd(), p), "utf-8"));
    } catch { }
  });
  if (!createExecutable) return;
  await execAsync(`npx -y pkg ${path.basename(distResultPath)}`, dist);
});

module.exports.build = build;