import DeskConfig from "../types/DeskConfig";
import {uuid} from "./Util";

const defaultConfig: DeskConfig = {
    holder: "desk-editor",
    height: "1056px",
    width: "815px",
    pages: [],
    onPage: 1,
    onChange: (() => {}),
    spacing: "20px",
    margins: {
        "left": 15,
        "right": 15,
        "top": 15,
        "bottom": 15
    },
    blockClass: "desk-block",
    pageClass: "desk-page",
    saveOnChange: false,
    genUID: uuid,
};

export {defaultConfig};