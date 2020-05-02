
console.log('in the options.js file in markdown-saver...1')
// function saveOptions(e) {
//     console.log('does it show up')
//     browser.storage.sync.set({
//         // filepath: document.querySelector("#filepath").value,
//         // saveimages: document.querySelector("#saveimages").value,
//         color: document.querySelector("#color").value
//     });
//     e.preventDefault();
// }
//
// function restoreOptions() {
//
//     // var gettingItem = browser.storage.sync.get('filepath');
//     // gettingItem.then((res) => {
//     //     document.querySelector("#filepath").value = res.filepath || '';
//     // });
//     //
//     // var gettingItem = browser.storage.sync.get('saveimages');
//     // gettingItem.then((res) => {
//     //     document.querySelector("#saveimages").value = res.saveimages || true;
//     // });
//
//     console.log(browser.storage.sync)
//     var gettingItem = browser.storage.sync.get('color');
//     // console.log(gettingItem)
//     gettingItem.then((res) => {
//         document.querySelector("#color-show").value = res.color || 'Firefox red';
//     });
// }
//
// document.addEventListener('DOMContentLoaded', restoreOptions);
// document.querySelector("form").addEventListener("submit", saveOptions);


/*
 Store the currently selected settings using browser.storage.local.
 */
function storeSettings() {

    function getSince() {
        const since = document.querySelector("#color");
        return since.value;
    }
    function getFilenameTemplate() {
        const filenameTemplate = document.querySelector("#filename-template");
        return filenameTemplate.value;
    }
    function getSaveImages() {
        const saveImages = document.querySelector("#save-images");
        return saveImages.checked;
    }
    const saveImages = getSaveImages();
    const filenameTemplate = getFilenameTemplate();
    // const dataTypes = getTypes();
    console.log('saving saveImages: ', saveImages)
    browser.storage.local.set({
        filenameTemplate,
        saveImages

        // dataTypes
    });
}

/*
 Update the options UI with the settings values retrieved from storage,
 or the default settings if the stored settings are empty.
 */
function restoreOptions(restoredSettings) {

    console.log('in the updateUI function')
    // console.log('restoredSettings: ', restoredSettings)
    // console.log('restoredSettings.saveImages: ', restoredSettings.saveImages)
    // console.log('doc querysel save images: ', document.querySelector("#save-images"))
    // console.log('doc querysel filename-template: ', document.querySelector("#filename-template"))
    // console.log(document.querySelector("#filename-template-show"));
    console.log('in the updateUI function')
    document.querySelector("#filename-template-show").innerText = restoredSettings.filenameTemplate || 'filename.md';
    document.querySelector("#filename-template").value = restoredSettings.filenameTemplate || 'filename.md';
    document.querySelector("#save-images-show").innerText = restoredSettings.saveImages || false;
    document.querySelector("#save-images").checked = restoredSettings.saveImages || false;
    // const selectList = document.querySelector("#since");
    // selectList.value = restoredSettings.since;
    //
    // const checkboxes = document.querySelectorAll(".data-types [type=checkbox]");
    // for (let item of checkboxes) {
    //     if (restoredSettings.dataTypes.indexOf(item.getAttribute("data-type")) != -1) {
    //         item.checked = true;
    //     } else {
    //         item.checked = false;
    //     }
    // }
}

function onError(e) {
    console.error(e);
}


console.log('in the options.js file in markdown-saver...2')

// document.querySelector("#color").value = "test"; //restoredSettings.color || 'Firefox red';

/*
 On opening the options page, fetch stored settings and update the UI with them.
 */
// document.addEventListener("DOMContentLoaded", restoreOptions)

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(restoreOptions, onError);

/*
 On clicking the save button, save the currently selected settings.
 */
document.querySelector("form").addEventListener("submit", storeSettings);
// document.addEventListener('DOMContentLoaded', restoreOptions);
