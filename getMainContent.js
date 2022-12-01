const { promises } = require("fs");
const readFolder = require('recursive-readdir');

module.exports = async function getMainContent(mainPath, bundlePath) {
  let realFile = await promises.readFile(mainPath, 'utf-8');
  const recImports = [...realFile.matchAll(/recursiveImport\(([^)]+)\);?/g)].map(x => [x, x[1].slice(1, -1)]);

  for (let i = 0; i < recImports.length; i++) {
    const statement = recImports[i][0][0];
    const path = recImports[i][1];
    const _paths = await readFolder(path)
    realFile = realFile.replace(statement, (_paths).map(x => 
      x.replaceAll("\\", "\/").includes("\/-") ? null : `require('.\/${x.replaceAll("\\", "\/")}')`
      ).filter(x => x).join("; \n"));
  }

  realFile = realFile.replace(/( *)recursiveImport,?( *)/g, " ").replace('const { } = require("@mostfeatured/dbi");', "");

  await promises.writeFile(bundlePath, realFile);
  return realFile;
}