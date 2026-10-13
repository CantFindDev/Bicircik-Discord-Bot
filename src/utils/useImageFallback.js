const Module = require('module');
const { spawnSync } = require('child_process');

/**
 * Swaps @napi-rs/image for the canvas based Transformer when the native build cannot run on this CPU.
 * Must run before anything requires canvacord. The check runs in a child process because the failure
 * is an illegal instruction signal that kills whichever process loads the module.
 */
module.exports = () => {
    const probe = spawnSync(process.execPath, ['-e', "require('@napi-rs/image')"], { cwd: __dirname, stdio: 'ignore' });
    if (probe.status === 0) return;

    const imagePath = require.resolve('@napi-rs/image');
    const fallback = new Module(imagePath);
    fallback.filename = imagePath;
    fallback.exports = require('./canvasTransformer');
    fallback.loaded = true;
    require.cache[imagePath] = fallback;

    console.log('@napi-rs/image does not run on this CPU, images will be processed with @napi-rs/canvas.');
};
