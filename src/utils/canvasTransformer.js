const { createCanvas, loadImage, ImageData } = require('@napi-rs/canvas');

const defaultQuality = 90;

/**
 * The part of the @napi-rs/image Transformer that canvacord calls, drawn with @napi-rs/canvas instead.
 * Used only where the native @napi-rs/image build cannot run on the host CPU.
 */
class Transformer {
    /** @param {Buffer} source Encoded image bytes in any format @napi-rs/canvas can decode. */
    constructor(source) {
        this.source = source;
        this.pixelCanvas = null;
        this.cropArea = null;
    }

    /** Builds a transformer from raw RGBA pixels instead of an encoded image. */
    static fromRgbaPixels(pixels, width, height) {
        const transformer = new Transformer(null);
        transformer.pixelCanvas = createCanvas(width, height);
        transformer.pixelCanvas
            .getContext('2d')
            .putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
        return transformer;
    }

    /** Limits the output to the given rectangle of the source image. */
    crop(x, y, width, height) {
        this.cropArea = { x, y, width, height };
        return this;
    }

    /** Draws the source, cropped when a crop was requested, onto a fresh canvas. */
    async toCanvas() {
        const image = this.pixelCanvas ?? await loadImage(this.source);
        const area = this.cropArea ?? { x: 0, y: 0, width: image.width, height: image.height };

        const canvas = createCanvas(area.width, area.height);
        canvas
            .getContext('2d')
            .drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
        return canvas;
    }

    async png() {
        return (await this.toCanvas()).encode('png');
    }

    /** @param {number} [quality] 0 to 100; anything that is not a number falls back to the default. */
    async jpeg(quality) {
        return (await this.toCanvas()).encode('jpeg', typeof quality === 'number' ? quality : defaultQuality);
    }

    /** @param {number} [quality] 0 to 100; anything that is not a number falls back to the default. */
    async webp(quality) {
        return (await this.toCanvas()).encode('webp', typeof quality === 'number' ? quality : defaultQuality);
    }

    async avif() {
        return (await this.toCanvas()).encode('avif');
    }
}

module.exports = { Transformer };
