#!/usr/bin/env node

/**
 * Build the platform-map frontend bundle with hashed asset names for caching.
 * Uses esbuild to bundle, then Babel to downlevel to ES5 for LG TV compatibility.
 * 
 * Usage: node scripts/build-frontend.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');
const { downlevelJavaScript, DEFAULT_BABEL_TARGETS } = require('./js-transform');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'frontend', 'src');
const distDir = path.join(projectRoot, 'frontend', 'dist');
const assetsDir = path.join(distDir, 'assets');
const publicAssetsDir = path.join(projectRoot, 'public', 'assets');

// Bundle at a modern target for speed, then downlevel with Babel for legacy screens.
const DEFAULT_ESBUILD_TARGET = (process.env.ESBUILD_TARGET || 'es2017')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const entryPoints = [
    {
        key: 'platformMap',
        entryPath: path.join(srcDir, 'platform-map', 'main.js'),
        cssPath: path.join(srcDir, 'platform-map', 'styles.css'),
        templatePath: path.join(srcDir, 'platform-map', 'index.html'),
        outputHtml: 'platform.map.html'
    }
];

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function contentHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
}

function copyAssets() {
    // Copy map.jpg and Bus_Icon.jpeg from public/assets to dist/assets
    const assetsToCopy = ['map.jpg', 'Bus_Icon.jpeg'];

    for (const asset of assetsToCopy) {
        const srcPath = path.join(publicAssetsDir, asset);
        const destPath = path.join(assetsDir, asset);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied: ${asset}`);
        } else {
            console.warn(`Warning: ${asset} not found at ${srcPath}`);
        }
    }
}

async function buildJs(entry) {
    const result = await esbuild.build({
        entryPoints: [entry.entryPath],
        bundle: true,
        sourcemap: false,
        minify: true,
        write: false,
        outfile: `${entry.key}.js`,
        format: 'iife',
        target: DEFAULT_ESBUILD_TARGET.length ? DEFAULT_ESBUILD_TARGET : ['es5'],
        legalComments: 'none',
    });

    const output = result.outputFiles.find((file) => file.path.endsWith('.js'));
    if (!output) {
        throw new Error(`esbuild produced no JavaScript output for ${entry.key}`);
    }

    const rawCode = Buffer.from(output.contents).toString('utf8');
    const transformed = await downlevelJavaScript(rawCode, { filename: path.basename(entry.entryPath) });
    const buffer = Buffer.from(transformed, 'utf8');
    const hash = contentHash(buffer);
    const fileName = `${entry.key}.${hash}.js`;
    const filePath = path.join(assetsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`Built JS: ${fileName} (${buffer.length} bytes)`);
    console.log(`  Targeting: ${DEFAULT_BABEL_TARGETS}`);

    return fileName;
}

function buildCss(entry) {
    const buffer = fs.readFileSync(entry.cssPath);
    const hash = contentHash(buffer);
    const fileName = `${entry.key}.${hash}.css`;
    const filePath = path.join(assetsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`Built CSS: ${fileName} (${buffer.length} bytes)`);

    return fileName;
}

function writeHtml(entry, assetMap) {
    const template = fs.readFileSync(entry.templatePath, 'utf8');
    const html = template
        .replace(/%APP_JS%/g, `./assets/${assetMap.js}`)
        .replace(/%APP_CSS%/g, `./assets/${assetMap.css}`)
        .replace(/%BUILD_ID%/g, new Date().toISOString());
    fs.writeFileSync(path.join(distDir, entry.outputHtml), html);

    console.log(`Built HTML: ${entry.outputHtml}`);
}

function writeManifest(entryAssets) {
    const manifestPath = path.join(distDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        babelTargets: DEFAULT_BABEL_TARGETS,
        entries: entryAssets,
    }, null, 2));
}

async function main() {
    console.log('=== Platform Map Frontend Build ===\n');

    ensureDir(projectRoot);
    cleanDir(distDir);
    ensureDir(distDir);
    ensureDir(assetsDir);

    const entryAssets = {};

    for (const entry of entryPoints) {
        if (!fs.existsSync(entry.entryPath)) {
            console.warn(`Skipping ${entry.key}: ${entry.entryPath} not found`);
            continue;
        }

        console.log(`\nBuilding: ${entry.key}`);
        const jsFile = await buildJs(entry);
        const cssFile = buildCss(entry);
        writeHtml(entry, { js: jsFile, css: cssFile });
        entryAssets[entry.key] = {
            html: entry.outputHtml,
            js: jsFile,
            css: cssFile
        };
    }

    console.log('\nCopying assets...');
    copyAssets();

    writeManifest(entryAssets);

    console.log('\n=== Build Complete ===');
    console.log(JSON.stringify(entryAssets, null, 2));
}

main().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
