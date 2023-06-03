import { utils } from '../../utils.js';
import { 
    targetWidth, targetHeight, imageRes
} from '../../index.js';

export class Uploader {
    constructor(args) {
        /**
         * Component for processing uploaded images
         * (adding background, resizing)
         * and sending the result to a callback function
         *
         * args: dictionary with:
         *  handleImage: function(img)
         * and optionally
         *  box: [x, y, w, h]
         *  res: int
         */
        this.imageCB = args.handleImage;
        this.box = args.box || utils.getBoxFromCenter(targetWidth / 4, targetHeight / 2, 512, 512);
        this.res = args.res || imageRes;
    }

    handleFile(file) {
        if (file.type === 'image') {
            loadImage(file.data, img => this.handleImage(img));
        }
    }

    handleImage(img) {
        // white bg if transparent
        let g = createGraphics(img.width, img.height);
        g.background(255);
        g.image(img, 0, 0);
        this.image = g.get();
        this.scaledImage = this.image.get();
        this.scaledImage.resize(this.res, this.res);
        this.scaledImage.loadPixels();
        this.imageCB(this.scaledImage);
    }

    dragOver() {
        this.dropHovering = true;
    }

    dragLeave() {
        this.dropHovering = false;
    }

    drop(file) {
        this.handleFile(file);
    }

    mousePressed() {
        if (utils.mouseInRect(this.box)) {
            let input = createFileInput(file => {
                this.handleFile(file);
            });
            input.elt.accept = '.png,.jpg';
            input.elt.click();
            input.remove();
        }
    }

    draw() {
        let hovering = false
        if (utils.mouseInRect(this.box)) {
            utils.setPointer();
            hovering = true;
        }

        if (this.scaledImage) {
            image(this.scaledImage, ...this.box);
        } else {
            fill(200);
            rect(...this.box);

            fill(140);
            let b = this.box;
            let bx = b[0], by = b[1], bw = b[2], bh = b[3];
            push();
            translate(bx + bw / 2, by + bh / 2);
            if (hovering) { scale(1.2); }
            rect(-40, -10, 80, 20);
            rect(-10, -40, 20, 80);
            pop();

            textAlign(CENTER, TOP);
            textSize(36);
            text('Choose an image\nor drag & drop', bx + bw / 2, by + bh / 2 + 80);
        }
    }

    drawOverlay() {
        if (this.dropHovering) {
            fill(255, 96);
            rect(0, 0, targetWidth, targetHeight);
        }
    }
}