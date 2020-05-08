import DeskConfig from "../types/DeskConfig";
import {defaultConfig} from "./Defaults";
import Page from "./Page";


export default class Desk {
    constructor(config: DeskConfig) {
        // Load in the defaults and the given config
        this.config = Object.assign(defaultConfig, config);
        // Check to make sure that the holder exists
        this.holder = document.getElementById(this.config.holder);
        if (!this.holder) {
            throw new Error(`Couldn't find element with ID "${this.config.holder}"`);
        }
        this.pages = [];
        if (this.config.pages && this.config.pages.length > 1) {
            for (let pageDelta of this.config.pages) {
                this.pages.push(new Page(this.config, pageDelta));
            }
        }
        else {
            this.pages.push(new Page(this.config));
        }
        this.render();
    }


    private render() {
        console.log("In render");
        for (let page of this.pages) {
            console.log("Rendering page", page);
            if (!page.pageElement) {
                page.render();
                console.log("Rendered page", page.pageElement);
                this.holder.appendChild(page.pageElement);
                page.renderQuill();
            }
        }
    }

    public pages: Page[];
    private holder: HTMLElement;
    private config: DeskConfig;
}