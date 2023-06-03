import { utils, ease } from '../../utils.js';
import {
    targetWidth, targetHeight, imageRes
} from '../../index.js';
import { UI } from '../../ui.js';

export class ImageProcessor {
    // For level of detail bar
    tValue = 0;
    tValueFree = 0;

    constructor(args) {
        // [box, res]
        args = args || {};
        this.box = args.box || utils.getBoxFromCenter(targetWidth * 3 / 4, targetHeight / 2, 512, 512);
        this.res = args.res || imageRes;

        this.image = createImage(this.res, this.res);
        this.image.loadPixels();

        this.baseDecomp = this.getEmptyDecomp();
        this.newDecomp = this.getEmptyDecomp(true);

        this.ui = new UI();
    }

    getEmptyDecomp(fillDefault) {
        let decomp = [];
        for (let n = 0; n <= floor(log(this.res) / log(2)); n++) {
            let levelRes = 2 ** n;
            let level = {
                res: levelRes,
                color: {
                    array: new Float32Array(4 * levelRes ** 2),
                    mean: new Float32Array(4),
                    std: new Float32Array(4)
                },
                delta: {
                    array: new Float32Array(4 * levelRes ** 2),
                    mean: new Float32Array(4),
                    std: new Float32Array(4)
                }
            }
            if (fillDefault) {
                // Set more interesting defaults
                level.color.mean.fill(128);
                // level.color.std.fill(50);
                level.delta.std.fill(30);
            }
            decomp.push(level);
        }
        return decomp;
    }

    handleImage(newImage) {
        // Compute cumulative sum for faster region averaging

        let cumSum = new Uint32Array(newImage.pixels.length);
        for (let c = 0; c < 4; c++) {
            for (let i = 0; i < this.res; i++) {
                for (let j = 0; j < this.res; j++) {
                    let index = (i * this.res + j) * 4 + c;
                    cumSum[index] = newImage.pixels[index];
                    if (i > 0) {
                        let indexUp = ((i - 1) * this.res + j) * 4 + c;
                        cumSum[index] += cumSum[indexUp];
                    }
                    if (j > 0) {
                        let indexLeft = (i * this.res + j - 1) * 4 + c;
                        cumSum[index] += cumSum[indexLeft];
                    }
                    if (i > 0 && j > 0) {
                        let indexUpLeft = ((i - 1) * this.res + j - 1) * 4 + c;
                        cumSum[index] -= cumSum[indexUpLeft];
                    }
                }
            }
        }

        // Generate hierarchical decomposition of newImage.

        for (let n=0; n < this.baseDecomp.length; n++) {
            let level = this.baseDecomp[n];
            for (let c = 0; c < 4; c++) {
                // Set color mean (same for each level)
                level.color.mean[c] = cumSum[cumSum.length - 4 + c] / (this.res ** 2);
                // Set delta mean if first level
                if (n == 0) {
                    level.delta.mean[c] = level.color.mean[c];
                }

                // Get color/delta values and stds
                for (let i = 0; i < level.res; i++) {
                    for (let j = 0; j < level.res; j++) {
                        // Get level pixel's bounding box in base resolution
                        // i0 is included, i1 is excluded by 1 pixel
                        let i0 = floor(i * this.res / level.res);
                        let j0 = floor(j * this.res / level.res);
                        let i1 = floor((i + 1) * this.res / level.res);
                        let j1 = floor((j + 1) * this.res / level.res);
                        // (Base res indices)
                        // Sum from (0, 0) to bottom right of level pixel
                        let indexDownRight = (
                            (i1 - 1) * this.res + j1 - 1
                        ) * 4 + c;
                        let sumColor = cumSum[indexDownRight];
                        // Subtract from (0, 0) to outside top right of level pixel
                        if (i0 > 0) {
                            let indexUpRight = (
                                (i0 - 1) * this.res + j1 - 1
                            ) * 4 + c;
                            sumColor -= cumSum[indexUpRight];
                        }
                        // Subtract from (0, 0) to outside bottom left of level pixel
                        if (j0 > 0) {
                            let indexDownLeft = (
                                (i1 - 1) * this.res + j0 - 1
                            ) * 4 + c;
                            sumColor -= cumSum[indexDownLeft];
                        }
                        // Account for doubly subtracted area
                        if (i0 > 0 && j0 > 0) {
                            let indexUpLeft = (
                                (i0 - 1) * this.res + j0 - 1
                            ) * 4 + c;
                            sumColor += cumSum[indexUpLeft];
                        }
    
                        // Convert to average
                        let numPixels = (i1 - i0) * (j1 - j0);
                        let levelIndex = (i * level.res + j) * 4 + c;
                        let colorVal = sumColor / numPixels
                        level.color.array[levelIndex] = colorVal;

                        // Get delta
                        let delta = colorVal;
                        if (n > 0) {
                            let lowerLevelRes = this.baseDecomp[n - 1].res;
                            let lowerLevelIndex = (
                                floor(i * lowerLevelRes / level.res) * lowerLevelRes
                                + floor(j * lowerLevelRes / level.res)
                            ) * 4 + c;
                            delta = (
                                level.color.array[levelIndex]
                                - this.baseDecomp[n - 1].color.array[lowerLevelIndex]
                            );
                        }
                        level.delta.array[levelIndex] = delta;
                        
                        // Add to std
                        level.color.std[c] += (colorVal - level.color.mean[c]) ** 2;
                        level.delta.std[c] += (delta - level.delta.mean[c]) ** 2;
                    }
                }

                // Finish std calculations
                level.color.std[c] = level.res == 1 ? 0 : (
                    sqrt(level.color.std[c] / (level.res ** 2 - 1))
                );
                level.delta.std[c] = level.res == 1 ? 0 : (
                    sqrt(level.delta.std[c] / (level.res ** 2 - 1))
                );

                // Copy mean and std to newDecomp
                this.newDecomp[n].color.mean[c] = level.color.mean[c];
                this.newDecomp[n].color.std[c] = level.color.std[c];
                this.newDecomp[n].delta.mean[c] = level.delta.mean[c];
                this.newDecomp[n].delta.std[c] = level.delta.std[c];
            }
        }
    }

    update(dt) {
        this.tValueFree += dt;
        this.tValue = ease.outQuad(
            utils.pingPong(this.tValueFree * 0.5)
        );

        // Resample newDecomp at tValue
        // Using lower level's color and current level's delta std
        let decompIndex = round(this.tValue * (this.newDecomp.length - 1));
        let newLevel = this.newDecomp[decompIndex];
        for (let c = 0; c < 4; c++) {
            for (let i = 0; i < newLevel.res; i++) {
                for (let j = 0; j < newLevel.res; j++) {
                    let levelIndex = (i * newLevel.res + j) * 4 + c;
                    if (decompIndex == 0) {
                        newLevel.color.array[levelIndex] = newLevel.color.mean[c];
                    } else {
                        let lowerLevel = this.newDecomp[decompIndex - 1];
                        let lowerLevelIndex = (
                            floor(i * lowerLevel.res / newLevel.res) * lowerLevel.res
                            + floor(j * lowerLevel.res / newLevel.res)
                        ) * 4 + c;
                        newLevel.color.array[levelIndex] = (
                            lowerLevel.color.array[lowerLevelIndex]
                            + newLevel.delta.std[c] * random(-1, 1)
                        );
                    }

                    // Always sample alpha as 255
                    if (c == 3) {
                        newLevel.color.array[levelIndex] = 255;
                    }
                }
            }
        }

        // Updpate image from newDecomp at tValue
        for (let i = 0; i < this.res; i++) {
            for (let j = 0; j < this.res; j++) {
                for (let c = 0; c < 4; c++) {
                    let index = (i * this.res + j) * 4 + c;
                    let levelIndex = (
                        floor(i * newLevel.res / this.res) * newLevel.res
                        + floor(j * newLevel.res / this.res)
                    ) * 4 + c;
                    this.image.pixels[index] = newLevel.color.array[levelIndex];
                }
            }
        }

        this.image.updatePixels();
    }

    draw() {
        image(this.image, ...this.box);

        // Level of detail bar
        fill('#0099ff');
        let b = this.box;
        let bx = b[0], by = b[1], bw = b[2], bh = b[3];
        rect(bx, by + bh + 20, bw * this.tValue, 20);

        this.ui.draw();
    }
}
