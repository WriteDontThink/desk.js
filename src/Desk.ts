// Internal imports
import DeskConfig from "../types/DeskConfig";
import PageData from "../types/PageData";
import Page from './Page';
import Engine  from "./Engine";
import DeskSnapshot from "../types/DeskSnapshot";
import PageChange from "../types/PageChange";
import EditorAction from "../types/EditorAction";
import { uuid } from './Util';
import { defaultConfig } from "./Defaults";


export default class Desk{
    constructor(config?: DeskConfig){
        if (config == undefined){
            this.config = defaultConfig;
        }
        else {
            this.config = Object.assign(defaultConfig, config);
        }

        // Generate a session key if one wasn't provided
        this.sessionKey = this.config.sessionKey || uuid();

        // Make sure that the holder element exists on the page
        this.editorHolder = document.getElementById(this.config.holder);
        if (this.editorHolder == null){
            console.error(`Couldn't find holder: ${this.config.holder}`)
        }

        this.pages = [];

        // Instantiate the provided pages
        if (this.config.pages != undefined) {
            for (const page of this.config.pages){
                this.pages.push(new Page(this.config, page));
                this.onPage = this.config.onPage;
            }
        }

        // If there are no current pages, create the first page
        if (this.pages.length == 0){
            this.pages.push(new Page(this.config));
            this.onPage = 1;
        }
        //Instantiate the text formatting engine
        this.engine = new Engine(this.config);

        // Render the editor
        this.render();
    }

    private deletePage(page: Page) {
        const pageIdx = this.pages.findIndex((p: Page) => p.id === page.id);
        console.log(`Deleting page ${pageIdx+1}`);
        if (pageIdx === 0){
            // Don't delete the only page in the document
            if (page.contentWrapper.children.length === 0){
                // If this was caused by deletion of the last block on the page, create a new one
                page.newBlock();
            }
        }
        else {
            // Remove the page internally
            this.pages.splice(pageIdx, 1);
            // Remove the page from the DOM
            this.editorHolder.removeChild(page.pageHolder);
        }
    }

    private render(){
        // Debounce change events so they're not overwhelming a listener
        const unwrapChange = this.unwrapChange.bind(this);
        for (let pageIdx in this.pages){
            let pageNum = (+pageIdx)+1;
            const page = this.pages[pageIdx];
            // Check if the page is already rendered
            if (!document.getElementById(page.domID)){
                const renderedPage: HTMLElement = page.render();
                // Pass all keydown and input events on the page to the text formatting engine
                page.contentWrapper.addEventListener('keydown', (e: KeyboardEvent) =>
                                                                                this.engine.onKeydown(e, page));
                // Pass overflow events back to the page manager so we can break the page
                page.contentWrapper.addEventListener('overflow', (e: CustomEvent) =>
                                                                        this.breakPage(page, e.detail));
                // Pass page deletion events to an event listener that will know if it's the first page or not
                page.contentWrapper.addEventListener('delete', (e: CustomEvent) => this.deletePage(page));
                // Pass paste events to the text formatting engine
                page.contentWrapper.addEventListener('paste', (e: ClipboardEvent) =>
                                                                                    this.engine.onPaste(e, page));
                // Listen to change events in onchange
                page.contentWrapper.addEventListener('change', unwrapChange);
                // Listen to mutations and pass them as well to the formatting engine
                const observer = new MutationObserver((mutations) =>
                    this.engine.handleMutation(mutations, page));
                observer.observe(page.contentWrapper, {
                    characterData: true,
                    characterDataOldValue: true,
                    childList: true,
                    subtree: true
                });

                this.editorHolder.appendChild(renderedPage);
                // If this is the page that the user is currently on, and it hasn't been rendered yet, focus on it
                if (pageNum == this.onPage){
                    page.focus();
                }
            }
        }
        // Set the cursor on the current onPage
        const currentBlock = this.currentPage.currentBlock;
        Engine.set(currentBlock);
    }


    /**
     * Save the current state of the editor. If num is not specified, save all pages
     *
     * @param num: If provided, save just a given page instead of all pages.
     */
    public save(num?: number): DeskSnapshot {
        const currPageSnapshots = {};
        if (num === undefined) {
            for (let pageTrack in this.pages) {
                const pageNum = (+pageTrack) + 1;
                const page = this.pages[pageTrack];
                currPageSnapshots[pageNum] = this.buildSnapshot(page);
            }
        }
        else {
            if (this.validatePageNumber(num)){
                currPageSnapshots[num] = this.buildSnapshot(num);
            }
            else{
                return {pages: {}};
            }
        }
        return {pages: currPageSnapshots};
    }

    public get currentPage(): Page {
        return this.pages[this.onPage - 1];
    }

    /**
     * A function that validates that a page number is in the current pages.
     * Returns true if it is, throws a console error and returns false if not
     */
    private validatePageNumber(pageNum: number): boolean {
        if (pageNum > 0){
            if (pageNum <= this.pages.length){
                return true;
            }
        }
        console.error(`Invalid page number: ${pageNum}`);
        return false;
    }

    private static serializeBlock(blockElem: HTMLElement): string {
        let blockInner = blockElem.innerHTML;
        // Remove zero width characters
        if (blockInner === "&#8203;"){
            blockInner = "";
        }
        return blockInner;
    }

    /**
     * Build a snapshot of a given page. If blockNumbers or blockUIDs is defined, return just those blocks. From
     * the page snapshot. Otherwise, return all pages
     *
     * @param page The page to build a snapshot of. Either a page number >= 1, a string page UID, or a page object
     * @param blockNumbers: A set of block indexes
     */
    private buildSnapshot(page: number | string | Page, blockNumbers?: number[]):
        PageData {

        let pageObj;
        if (typeof(page) == "number"){
            if (this.validatePageNumber(page)){
                pageObj = this.pages[page-1];
            }
            else{
                return;
            }
        }
        else if (typeof(page) == "string"){
            pageObj = this.pages.find((value: Page) => value.id === page);
            if (pageObj == undefined){
                console.error(`Couldn't find page with ID ${page}`);
                return;
            }
        }
        else if (page instanceof Page){
            pageObj = page;
        }
        else{
            console.error(`Unrecognized page type ${typeof(page)}`, page);
            return;
        }
        // Clean the page before serializing any of the blocks
        pageObj.clean();
        // Get the blocks from the page
        const blocks = {};
        if (blockNumbers != undefined && blockNumbers.length > 0){
            blockNumbers.forEach(function(i: number){
               // Since the page has just been cleaned, there's no longer a guarantee that this block
               // exists, so we should make sure that it does
               const blockElem = pageObj.getBlock(i);
               if (blockElem){
                   blocks[i] = Desk.serializeBlock(blockElem);
               }
            });
        }
        else{
            for (let blockG in pageObj.blocks){
                const i = (+blockG);
                if (!isNaN(i)){
                    blocks[i] = Desk.serializeBlock(pageObj.getBlock(i));
                }
            }
        }
        const snapshot: PageData = {id: pageObj.id, blocks: blocks};
        // Return the resulting snapshot
        return snapshot;
    }


    private breakPage(page: Page, nextPageContent){
        const pageIdx: number = this.pages.findIndex((p: Page) => p.id === page.id);
        const pageNum = pageIdx + 1;
        const newPage = new Page(this.config, { blocks: nextPageContent });
        this.onPage = pageNum + 1;
        // Check to see if a page already exists with the page number following pageNum
        if (this.pages.length > pageNum){
            // If it does, push the pending page content onto that page
            const nextPage = this.pages[pageNum];
            for (let block of nextPageContent){
                nextPage.insertBlock(0, block);
            }
        }
        else {
            // If not, create a new page
            this.insertPageAt(pageNum, newPage);
        }
        // Focus on the new page
        this.currentPage.focus();
        // Dispatch a change snapshot that includes the pages that changed
        this.onChange([{pageNum: pageNum}, {pageNum: pageNum + 1}]);
    }

    public insertPageAt(pageIdx: number, page?: Page): boolean {
        if (this.pages.length < pageIdx || pageIdx <  0){
            return false;
        }
        else {
            if (this.pages.length == pageIdx){
                // Insert a page directly after the current page
                this.pages.push(page);
            }
            else {
                this.pages.splice(pageIdx, 0, page);
            }
            this.render();
        }
    }

    public findPageIdx(pageId: string): number | null {
        const foundIndex = this.pages.findIndex((p: Page) => p.id === pageId);
        if (foundIndex >= 0){
            return foundIndex;
        }
        else {
            return null;
        }
    }

    public findPageNum(pageId: string): number | null {
        const foundPageIdx = this.findPageIdx(pageId);
        if (foundPageIdx){
            return foundPageIdx + 1;
        }
        else {
            return null;
        }
    }

    public setPageContent(pageId: string, blocks: Object){
        // If the blocks are empty, set a single zero width block
        if (Object.keys(blocks).length == 0){
            blocks = {
                0: "&#8203;"
            }
        }
        const foundPageIdx = this.findPageIdx(pageId);
        if (foundPageIdx != null){
            const pageObj = this.pages[foundPageIdx];
            // Clear the blocks currently on the page
            pageObj.contentWrapper.textContent = '';
            // Insert each block onto the page
            for (let blockK of Object.keys(blocks)){
                const block: string = blocks[blockK];
                pageObj.insertBlock((+blockK), block);
            }
        }
        else {
            console.error(`Couldn't find page with ID ${pageId}`);
            return null;
        }
    }

    public insertNewPageAt(index: number, page: PageData){
        const newPage = new Page(this.config, page);
        this.insertPageAt(index, newPage);
    }

    public insertPageBefore(beforePageId: string, page: PageData){
        const beforePage = this.findPageIdx(beforePageId);
        this.insertNewPageAt(beforePage, page);

    }

    public insertPageAfter(afterPageId: string, page: PageData){
        const afterPage = this.findPageIdx(afterPageId);
        this.insertNewPageAt(afterPage+1, page);
    }


    private unwrapChange(e: CustomEvent){
        const pageNum = this.pages.findIndex((p: Page) => p.id === e.detail.page.id) + 1;
        this.onChange([{pageNum: pageNum, blocks: e.detail.blocks}]);
    }

    private onChange(pagesChanged: PageChange[]){
        let snapshot;
        // Check if we should handle all pages
        if (this.config.saveOnChange){
            snapshot = this.save();
        }
        else{
            // TODO: handle page deletion
            const pageSnapshots = {};
            for (let pageChanged of pagesChanged){
                pageSnapshots[pageChanged.pageNum] = this.buildSnapshot(pageChanged.pageNum, pageChanged.blocks);
            }
            snapshot = {pages: pageSnapshots};
        }

        if (this.config.onChange != undefined) {
            this.config.onChange(snapshot);
        }
    }

    /**
     * Return the word count of either a specific page, or the entire editor
     *
     * @param pageId Optionally supply the UID of a specific page to get the word count for
     * @param pageNum Optionally supply the number of a specific page to get the word count for
     */
    public wordCount(pageId?: string, pageNum?: number): number {
        if (pageId != undefined) {
            return this.pages[this.findPageIdx(pageId)].wordCount;
        }
        else if (pageNum != undefined) {
            return this.pages[pageNum - 1].wordCount;
        }
        else {
            let wordCount = 0;
            this.pages.map((p: Page) => wordCount+=p.wordCount);
            return wordCount;
        }
    }

    public get shortcuts(){
        return this.engine.shortcuts;
    }

    /**
     * Execute an action in the text formatting engine
     * @param action
     */
    public executeAction(action: EditorAction){
        Engine.executeAction(action);
    }

    public sessionKey: string;
    public onPage: number;
    public pages: Page[];
    private engine: Engine;
    private editorHolder: HTMLElement;
    private config: DeskConfig;
}
