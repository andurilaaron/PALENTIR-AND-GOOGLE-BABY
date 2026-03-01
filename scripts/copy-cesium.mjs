import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const dstDir = path.join(projectRoot, "public", "cesium");

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(srcPath, dstPath);
        else fs.copyFileSync(srcPath, dstPath);
    }
}

if (!fs.existsSync(srcDir)) {
    console.error(`Cesium build not found at: ${srcDir}`);
    process.exit(1);
}

copyDir(srcDir, dstDir);
console.log(`Copied Cesium assets to ${dstDir}`);
