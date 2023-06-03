import { ease } from './utils.js';
import { targetWidth } from './index.js';

import { MenuPage } from './pages/menu.js';
import { ImagePage } from './pages/image.js';

export let pageCallbackNames = [
    'mousePressed', 'mouseReleased', 'mouseWheel', 'keyPressed',
    'update', 'draw', 'dragOver', 'dragLeave', 'drop'
];


export class PageManager {
    switchT = 1;

    constructor() {
        this.pageClasses = {
            menu: MenuPage,
            image: ImagePage
        };
        this.pages = {
            menu: new this.pageClasses.menu()
        };
        this.activePage = this.pages.menu;

        // Pass callbacks to active page
        for (let id of pageCallbackNames) {
            if (!this[id]) {
                this[id] = (...args) => this.callback(id, ...args);
            }
        }
    }

    callback(id, ...args) {
        let f = this.activePage[id];
        if (f && this.switchT >= 1) {
            f.call(this.activePage, ...args);
        }
    }

    switchPage(id) {
        if (this.pages[id] === this.activePage) { return; }
        if (this.pageClasses[id] && !this.pages[id]) {
            this.pages[id] = new this.pageClasses[id]();
        }
        this.lastPage = this.activePage;
        this.activePage = this.pages[id];
        this.switchT = 0;
    }

    update(dt) {
        this.switchT += dt;
        this.callback('update', dt);
    }

    draw() {
        if (this.switchT < 1) {
            let t = ease.inOutCubic(this.switchT);
            for (let [i, v] of Object.entries([this.lastPage, this.activePage])) {
                push();
                if (this.activePage === this.pages.menu) {
                    translate(i === '0' ? t * targetWidth : (-1 + t) * targetWidth, 0);
                } else {
                    translate(i === '0' ? -t * targetWidth : targetWidth * (1 - t), 0);
                }
                if (v.draw) { v.draw(); }
                pop();
            }
        } else {
            this.callback('draw');
        }
    }
}
