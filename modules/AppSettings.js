
class AppSettings {
    /** @type {AppSettingsObj} */
    settings;
    constructor () {
        let template = AppSettings.getTemplate();
        let storedSettings = window.localStorage.getItem("settings");
        if (storedSettings) {
            this.settings = {...template, ...JSON.parse(storedSettings)};
        } else {
            this.settings = AppSettings.getTemplate();
        }
        this.store();
    }
    store() {
        window.localStorage.setItem("settings",JSON.stringify(this.settings));
    }
    /**
     * 
     * @returns {AppSettingsObj}
     */
    static getTemplate () {
        return {
            displayMode:"auto",
            timer:"normal",
            shareLink:true,
            showGuesses:true,
            showAccuracy:false,
        }
    }
}

export const appSettings = new AppSettings();

/**
 * @typedef {object} AppSettingsObj
 * @prop {"auto"|"light"|"dark"} displayMode - Sets the app's display mode
 * @prop {"normal"|"short"|"none"} timer - Displays the timer in this fashion
 * @prop {boolean} shareLink - Appends the link in share texts
 * @prop {boolean} showGuesses - Shows guesses on keyboard element
 * @prop {boolean} showAccuracy - Shows accuracy on keyboard element
 * @prop {boolean} enableToast - Enables toast notifications during gameplay
 */