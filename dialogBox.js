/* eslint-disable no-console */
/* eslint-env browser, es6 */
/* exported DialogBox */
/**
 * HTML5 Dialog Box
 */
export class DialogBox {
	/**
	 * A callback that has an html element as it's parameter
	 * 
	 * @callback dialogConstructorCallback
	 * @param {Element} div
	 */
	/**
	 * @typedef {{class: string, id: string, body: dialogConstructorCallback, buttons: dialogConstructorCallback, openOnCreation: boolean, modal: boolean}} dialogSettings
	 */
	/**
	 * Creates a dialog box.
	 * @param {dialogSettings} initSettings 
	 */
	constructor(initSettings){
		this.listeners = {};
		/** Dialog Settings
		 * @type {dialogSettings} */
		this.settings = {
			class:"dialogBox",
			id:false,
			body:(div) => {
				div.createChildNode("div","Test Dialog");
			},
			buttons:(div) => {
				var button = div.createChildNode("button","Ok");
				button.onclick = (e) => {
					this.close(e);
				};
				var cancel = div.createChildNode("button","Cancel");
				cancel.onclick = (e) => {
					this.close(e);
				};
			},
			openOnCreation:false,
			modal:false
		};
		for (let setting in initSettings) {
			this.settings[setting] = initSettings[setting];
		}
		/** The element that contains the body and buttons elements. */
		this.container = document.createElement("div");
		this.container.className = "dialogContainer";
		let htmlContent = this.container.createChildNode("div",{class:this.settings.class},(div)=>{
			this.settings.id ? div.id = this.settings.id : null;
		});
		/** The body div of the dialog. */
		this.body = htmlContent.createChildNode("div",{class:"dialogBody"});
		this.settings.body.call(this,this.body);
		/** The buttons div of the dialog. */
		this.buttons = htmlContent.createChildNode("div",{class:"dialogButtons"});
		this.settings.buttons.call(this,this.buttons);
		/** The div that contains all dialog elements. */
		this.html = document.createElement("div");
		this.html.className = this.settings.modal ? "dialogModal dialogModalActive" : "dialogModal dialogModalInactive";
		this.html.appendChild(this.container);
		if (this.settings.openOnCreation) this.open();
	}
	/** Opens the dialog box 
	 * @param {(KeyboardEvent|MouseEvent)} eventTrigger - The event that was used to open the dialog.
	*/
	open(eventTrigger = undefined) {
		try{
			document.body.appendChild(this.html);
			let checkFunc = (e) => {
				if (eventTrigger && !eventTrigger.target.isSameNode(e.target)){
					if (e.type == "keydown" && e.keyCode == 27 || e.type == "click" && (!this.html.contains(e.target) || (!this.settings.modal && this.container.isSameNode(e.target)))) {
						this.close(e);
					}
				}
			};
			document.addEventListener("keydown",checkFunc);
			document.addEventListener("click",checkFunc);
			this.addEventListener("close",() => {
				document.removeEventListener("keydown",checkFunc);
				document.removeEventListener("click",checkFunc);
			});
			let event = new CustomEvent("open",{detail:{usingEvent:eventTrigger}});
			this.dispatchEvent(event);
		} catch(err) {
			console.error(err);
		}
		
	}
	/**
	 * Closes the dialog box
	 * @param {KeyboardEvent|MouseEvent} e - The event that was used to close the dialog.
	 */
	close(e) {
		document.body.removeChild(this.html);
		let event = new CustomEvent("close",{detail:{usingEvent:e}});
		this.dispatchEvent(event);
	}

	addEventListener(type, callback) {
		if (!(type in this.listeners)) {
			this.listeners[type] = [];
		}
		this.listeners[type].push(callback);
	}

	removeEventListener(type, callback) {
		if (!(type in this.listeners)) {
			return;
		}
		var stack = this.listeners[type];
		for (var i = 0, l = stack.length; i < l; i++) {
			if (stack[i] === callback){
				stack.splice(i, 1);
				return;
			}
		}
	}

	dispatchEvent(event){
		if (!(event.type in this.listeners)) {
		return true;
		}
		var stack = this.listeners[event.type].slice();
	
		for (var i = 0, l = stack.length; i < l; i++) {
		stack[i].call(this, event);
		}
		return !event.defaultPrevented;
	}
}