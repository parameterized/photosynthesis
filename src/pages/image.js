
import { targetWidth, targetHeight, gfx } from '../index.js';
import { BasePage } from './basePage.js';
import { Uploader } from './components/uploader.js';
import { ImageProcessor } from './components/imageProcessor.js';


export class ImagePage extends BasePage {
    constructor() {
        super('Photosynthesis');
        
        this.imageProcessor = this.addComponent(new ImageProcessor());
        this.uploader = this.addComponent(new Uploader({
            handleImage: img => this.imageProcessor.handleImage(img)
        }));

        // this.ui.addButton({
        //     text: 'Retrain', box: [targetWidth / 2 - 100, targetHeight / 2 - 40, 200, 80],
        //     action: () => {}
        // });
    }

    keyPressed() {
        if (keyCode === 70) { // F
            this.uploader.handleImage(gfx.frog);
        }
        super.keyPressed();
    }
}
