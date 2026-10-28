import { appSettings } from "./AppSettings.js";

export class Toaster extends EventTarget{
    /** @type {HTMLDivElement} */
    elem;
    /** @type {HTMLDivElement} */
    toastElem;
    /** @type {{type:string,message:string}[]} */
    messages = [];
    transitionTime = 250;
    toastShowTime = 5000;
    toastShowQuickTime = 2000;
    /** @type {number} */
    longTimeout;
    /** @type {number} */
    quickTimeout;
    active = false;
    /**
     * 
     * @param {HTMLElement} div 
     */
    constructor(div){
        super();
        this.elem = div.createChildNode("div",{class:"toasterContainer"});
        this.toastElem = this.elem.createChildNode("div",{class:`toast`});
        this.toastElem.addEventListener("click",()=>{
            this.unsetToast();
        })
    }
    /**
     * 
     * @param {string} type 
     * @param {string} message 
     */
    push(type,message) {
        if (appSettings.settings.enableToast) {
            this.messages.push({type,message});
            if (!this.active) {
                this.active = true;
                this.setToast(this.messages.shift());
            }
        }
    }
    unsetToast() {
        if (this.active) {
            clearTimeout(this.quickTimeout);
            clearTimeout(this.longTimeout);
            this.toastElem.classList.remove("toastin");
            setTimeout(()=>{
                this.toastElem.innerHTML = "";
                if (this.messages.length > 0) {
                    this.setToast(this.messages.shift())
                } else {
                    this.active = false;
                }
            },this.transitionTime)
        }
    }
    /**
     * 
     * @param {{type:string,message:string}} toast 
     */
    setToast(toast) {
        this.toastElem.innerHTML = toast.message;
        this.toastElem.className = "toast";
        this.toastElem.classList.add("toastin");
        this.toastElem.classList.add(toast.type);
        this.longTimeout = setTimeout(()=>{
            this.unsetToast();
        },this.toastShowTime-this.transitionTime);
        this.quickTimeout = setTimeout(()=>{
            if (this.messages.length > 0) {
                clearTimeout(this.longTimeout);
                this.unsetToast();
            }
        },this.toastShowQuickTime-this.transitionTime);
    }
}