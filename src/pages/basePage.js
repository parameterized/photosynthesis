import { UI } from '../ui.js';
import {
    targetWidth, targetHeight,
    pageManager as pm
} from '../index.js';
import { pageCallbackNames } from '../pageManager.js';


export class BasePage {
    constructor(name, isMenu) {
        this.bgColor = isMenu ? color('#7D98A1') : color('#EEF1EF');

        this.ui = new UI();
        this.ui.addText({
            text: name,
            x: targetWidth / 2, y: 60
        });
        if (!isMenu) {
            this.ui.addButton({
                text: 'Back', box: [50, 50, 200, 80],
                action: () => pm.switchPage('menu')
            });
        }

        this.components = [];

        for (let id of pageCallbackNames) {
            if (!this[id]) {
                this[id] = (...args) => this.callback(id, ...args);
            }
        }
    }

    addComponent(c) {
        this.components.push(c);
        return c;
    }

    callback(id, ...args) {
        for (let c of this.components) {
            if (c[id]) { c[id](...args); }
        }
    }

    mousePressed() {
        this.ui.mousePressed();
        this.callback('mousePressed');
    }

    keyPressed() {
        if (keyCode === 27) { // Esc
            pm.switchPage('menu');
        }
        this.callback('keyPressed');
    }

    draw() {
        fill(this.bgColor);
        rect(0, 0, targetWidth, targetHeight);
        this.callback('draw');
        this.ui.draw();
        this.callback('drawOverlay');
    }
}
