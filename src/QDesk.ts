import {defaultConfig} from "./Defaults";
import DeskConfig from "../types/DeskConfig";
import Page from "./Page";


export default class QDesk{
    constructor(config: DeskConfig) {
        if (config == undefined) {
            config = defaultConfig
        } else {
            // Set configuration defaults. The default values for these are detailed in DeskConfig.ts
            config.holder = config.holder || defaultConfig.holder;
            config.height = config.height || defaultConfig.height;
            config.width = config.width || defaultConfig.width;
            config.pages = config.pages || defaultConfig.pages;
            config.onPage = config.onPage || defaultConfig.onPage;
            config.onChange = config.onChange || defaultConfig.onChange;
            config.margins = config.margins || defaultConfig.margins;
            config.spacing = config.spacing || defaultConfig.spacing;
            config.baseShortcuts = config.baseShortcuts || defaultConfig.baseShortcuts;
            config.extraShortcuts = config.extraShortcuts || defaultConfig.extraShortcuts;
            config.blockClass = config.blockClass || defaultConfig.blockClass;
            config.saveOnChange = config.saveOnChange || defaultConfig.saveOnChange;
            config.genUID = config.genUID || defaultConfig.genUID;
            config.debounceChanges = config.debounceChanges || defaultConfig.debounceChanges;
            config.pageClass = config.pageClass || defaultConfig.pageClass;
            config.pageWrapperClass = config.pageWrapperClass || defaultConfig.pageWrapperClass;
            config.sessionKey = config.sessionKey || defaultConfig.sessionKey;
        }
        this.config = config;

        // Make sure that the holder element exists on the page
        this.editorHolder = document.getElementById(this.config.holder);
        if (this.editorHolder == null){
            console.error(`Couldn't find holder: ${config.holder}`)
        }

        this.pages = [];
        this.render();
    }

    private render(): void {
      this.pages.push(new Page(this.config));
      for (const page of this.pages){
            console.log("Rendering page", page);
            page.renderHolder();
            this.editorHolder.appendChild(page.pageHolder);
            page.renderQuill();
        }
    }

    private editorHolder: HTMLElement;
    private config: DeskConfig;
    private pages: Page[];
}