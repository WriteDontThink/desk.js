import DeskConfig from "../types/DeskConfig";
import Quill from "quill";
import Delta from "quill-delta";
import {createElement, uuid} from "./Util";

export default class Page {
    constructor(config: DeskConfig, initialDelta?: Delta) {
        this.config = config;
        this.id = uuid();
        this.initialDelta = initialDelta;
    }

    public get domID() {
        return `desk-page-${this.id}`;
    }

    /**
     * Use inline styling for a page
     */
    private get CSS(): string {
        // set the height and width that were passed in from the configuration
        let styleString = `height: ${this.config.height}; width: ${this.config.width}; margin-bottom: ${this.config.spacing};`;
        // Assign a margin to each direction
        for (const dir of Object.keys(this.config.margins)){
            styleString += `padding-${dir}: ${this.config.margins[dir]}px;`;
        }
        return styleString;
    }

    render() {
        if (!this.pageElement) {
            this.pageElement = createElement('div', {
                "id": this.domID,
                "style": this.CSS,
                "class": this.config.pageClass
            });
        }
    }

    renderQuill() {
        if (!this.quill) {
            this.quill = new Quill(`#${this.domID}`);
            if (this.initialDelta){
                this.quill.setContents(this.initialDelta);
            }
        }
    }

    public pageElement: HTMLElement;
    public id: string;
    public quill: Quill;
    private config: DeskConfig;
    private readonly initialDelta: Delta;
}