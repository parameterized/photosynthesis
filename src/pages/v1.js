
import { targetWidth, targetHeight, gfx, imageRes } from '../index.js';
import { BasePage } from './basePage.js';
import { Uploader } from './components/uploader.js';
import { utils, ease } from "../utils.js";


export class V1Page extends BasePage {
    // For level of detail bar
    tValue = 0;
    tValueFree = 0;

    constructor() {
        super('Photosynthesis');

        this.box = utils.getBoxFromCenter(targetWidth * 3 / 4, targetHeight / 2, 512, 512);
        this.res = imageRes;

        // Initialize V1Synth
        let pg = pyscript.interpreter.globals;
        let V1Synth = pg.get('V1Synth');
        this.v1_synth = V1Synth(this.res);
        window.v1_synth = this.v1_synth;

        // Load synth image
        this.synthImage = createImage(this.res, this.res);
        this.synthImage.loadPixels();
        utils.copyPixels(
            this.v1_synth.get_flat_synth_image(),
            this.synthImage.pixels,
        );
        this.synthImage.updatePixels();

        // Add uploader
        this.uploader = this.addComponent(new Uploader({
            // handleImage: img => this.handleImage(img)
            handleImage: img => this.v1_synth.handle_upload(img.pixels)
        }));
    }

    keyPressed() {
        super.keyPressed();

        if (keyCode === 70) { // F
            this.uploader.handleImage(gfx.frog);
        }
    }

    update(dt) {
        this.tValueFree += dt;
        this.tValue = ease.outQuad(
            utils.pingPong(this.tValueFree * 0.5)
        );

        this.v1_synth.update_synth(this.tValue);

        // Set to image generated in Python
        utils.copyPixels(
            this.v1_synth.get_flat_synth_image(),
            this.synthImage.pixels,
        );
        this.synthImage.updatePixels();
    }

    draw() {
        super.draw();

        image(this.synthImage, ...this.box);

        // Level of detail bar
        fill('#0099ff');
        let b = this.box;
        let bx = b[0], by = b[1], bw = b[2], bh = b[3];
        rect(bx, by + bh + 20, bw * this.tValue, 20);
    }
}
