import { pageManager as pm } from '../index.js';
import { BasePage } from './basePage.js';


export class MenuPage extends BasePage {
    constructor() {
        super('Photosynthesis', true);

        let c1 = color('#EEF1EF');
        let c2 = color('#A9B4C2');
        let bw = 250;

        this.ui.addButton({
            text: 'V1', box: [160, 160, bw, 80],
            action: () => {pm.switchPage('v1'); },
            c1: c1, c2: c2
        });
        // this.ui.addButton({
        //     text: 'V2', box: [160, 270, bw, 80],
        //     action: () => pm.switchPage('v2'),
        //     c1: c1, c2: c2
        // });
    }
}
