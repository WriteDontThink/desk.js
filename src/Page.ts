// Internal imports
import PageData from "../types/PageData";
import DeskConfig from "../types/DeskConfig";
import * as Util from './Util';
// External imports
import BlockData from "../types/BlockData";
import Quill from "quill";

// The class name for a page in the DOM
const pageClass = "desk-page";


class Page {
    /**
     * Create a new page
     *
     * @param config: The configuration of the desk
     * @param data: Any data that the page is being instantiated with
     */
    constructor(config: DeskConfig, data?: PageData){
        this.config = config;
        // If the page wasn't passed a UID, generate a v4 UUID
        if (data == undefined){
            this.uid = config.genUID();
            this.initialBlocks = [];
        }
        else{
            this.uid = data.uid || config.genUID();
            this.initialBlocks = data.blocks || {};
        }
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

    public get domID(): string{
        return `desk-page-${this.uid}`;
    }

    /**
     * Render the blocks in a page, and bind an abstract page to the DOM.
     * Should only be called once per page per document
     *
     */
    public renderHolder() {
        /**
         * Render in the page ID and CSS styles given by document defaults. Create a wrapper inside the page
         * which will have contenteditable enabled. Overflow will be detected when a the wrapper is larger than
         * the containing page
         * ---------------
         * |   Page      |
         * | -------------
         * | | Wrapper   |
         * | | --------- |
         * | | | Block | |
         * | | --------- |
         * | |           |
         * | ------------|
         * --------------|
         */
        if (this.pageHolder == undefined) {
            // Create the main page
            this.pageHolder = Util.createElement('div', {
                "id": this.domID,
                "style": this.CSS,
                "class": pageClass
            });
        }
    }

    public renderQuill(){
        if (!this.quill){
            // Bind quill to that page
            this.quill = new Quill(`#${this.domID}`);
        }
    }


    public countWords() {
        let wC = 0;
        for (let childG in this.contentWrapper.children){
            let child = this.contentWrapper.children[childG];
            if (child && child.textContent) {
                let words = this.contentWrapper.children[childG].textContent.split(" ");
                words.forEach((word) => {
                    // We don't want to count spaces or zero-width characters as words
                    if (word && word != " " && word.length > 0){
                        // Check for a zero width character
                        if (word.charCodeAt(0) != 8203){
                            wC++;
                        }
                    }
                })
            }
        }
        this.wordCount = wC;
    }

    public pageHolder: HTMLElement;
    public contentWrapper: HTMLElement;
    public quill: Quill;
    public uid: string;
    public wordCount: number;
    private config: DeskConfig;
    private initialBlocks: { [index: number]: BlockData };
}

export default Page;

export { pageClass };