import DeskConfig from "../types/DeskConfig";
import {defaultConfig} from "./Defaults";
import Page from "./Page";
import DeskSnapshot from "../types/DeskSnapshot";

export default class Desk {
    constructor(config: DeskConfig){
        // Merge the provided configuration
        this.config = Object.assign(defaultConfig, config);
        // Check to make sure that the holder ID exists
        this.holder = document.getElementById(config.holder);
        if (!this.holder){
            throw new Error(`Couldn't find element ${config.holder}`);
        }
        this.pages = [];
        this.render();
    }

    private render(): void {
        // Check if any pages were specified in the config
        if (this.config.pages.length > 0){
            // If they were, load them in one by one
            for (const pageDelta of this.config.pages){
                this.pages.push(new Page(this.config, pageDelta));
            }
        }
        else {
            // Otherwise, create a new page
            const p = new Page(this.config);
            this.pages.push(p)
        }
        // Render all the pages
        for (const page of this.pages){
            page.renderHolder();
            this.holder.appendChild(page.pageHolder);
            page.renderQuill();
            page.quill.on('text-change', (delta) => {
                console.log("Got delta", delta, "on page", page);
            })
        }
    }

    public save(): DeskSnapshot {
        const snapshot = {"pages": []};
        for (let p in this.pages){
            snapshot["pages"][p] = this.pages[p].quill.getContents();
        }
        return snapshot;
    }

    private pages: Page[];
    private holder: HTMLElement;
    private config: DeskConfig;
}