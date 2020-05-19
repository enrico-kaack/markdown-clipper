
console.log('in the options.js file in markdown-saver...1')

/*
 Store the currently selected settings using browser.storage.local.
 */
function storeSettings() {

    function getSaveImages() {
        const saveImages = document.querySelector("#save-images");
        return saveImages.checked;
    }
    function getUseTemplate() {
        const useTemplate = document.querySelector("#use-template");
        return useTemplate.checked;
    }
    function getPathTemplate() {
        const pathTemplate = document.querySelector("#path-template");
        return pathTemplate.value;
    }
    function getFilenameTemplate() {
        const filenameTemplate = document.querySelector("#filename-template");
        return filenameTemplate.value;
    }

    browser.storage.local.set({
        saveImages: getSaveImages(),
        useTemplate: getUseTemplate(),
        pathTemplate: getPathTemplate(),
        filenameTemplate: getFilenameTemplate()
    });
}

/*
 Update the options UI with the settings values retrieved from storage,
 or the default settings if the stored settings are empty.
 */
function restoreOptions(restoredSettings) {

    // document.querySelector("#use-template-show").innerText = restoredSettings.useTemplate || false;
    document.querySelector("#use-template").checked = restoredSettings.useTemplate || false;
    // document.querySelector("#save-images-show").innerText = restoredSettings.saveImages || false;
    document.querySelector("#save-images").checked = restoredSettings.saveImages || false;
    // document.querySelector("#path-template-show").innerText = restoredSettings.pathTemplate || 'markdown-clipper/';
    document.querySelector("#path-template").value = restoredSettings.pathTemplate || 'markdown-clipper/';
    // document.querySelector("#filename-template-show").innerText = restoredSettings.filenameTemplate || 'filename.md';
    document.querySelector("#filename-template").value = restoredSettings.filenameTemplate || 'filename.md';
}

function onError(e) {
    console.error(e);
}

/*
 On opening the options page, fetch stored settings and update the UI with them.
 */
const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(restoreOptions, onError);

/*
 On clicking the save button, save the currently selected settings.
 */
document.querySelector("form").addEventListener("submit", storeSettings);
// document.addEventListener('DOMContentLoaded', restoreOptions);
