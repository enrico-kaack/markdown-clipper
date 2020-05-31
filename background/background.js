if (chrome) {
    chrome.runtime.onMessage.addListener(notify);
    chrome.browserAction.onClicked.addListener(action);
} else {
    browser.runtime.onMessage.addListener(notify);
    browser.browserAction.onClicked.addListener(action);
}

function onError(e) {
    console.error(e);
}

function createReadableVersion(dom) {
    const reader = new Readability(dom);
    const article = reader.parse();
    return article;
}

function convertArticleToMarkdown(article, source) {
    const turndownService = new TurndownService();
    const gfm = turndownPluginGfm.gfm;
    turndownService.use(gfm);
    let markdown = turndownService.turndown(article.content);

    //add summary if exist
    if (!!article.excerpt) {
        markdown = "\n> " + article.excerpt + "\n\n" + markdown;
    }

    //add article titel as header
    markdown = "# " + article.title + "\n" + markdown;

    //add source if exist
    if (!!source) {
        markdown = markdown + "\n\n\n" + "[Source](" + source + ")";
    }

    return markdown;
}

function generateValidFileName(title) {
    //remove < > : " / \ | ? *
    const illegalRe = /[\/\?<>\\:\*\|":]/g;
    const name = title.replace(illegalRe, "");
    return name;
}

async function downloadMarkdown(markdown, article, options) {

    const blob = new Blob([markdown], {type: "text/markdown;charset=utf-8"});
    const url = URL.createObjectURL(blob);

    let filename = await ProcessorHelper.evalTemplate(options.filenameTemplate, options) || '';
    let filenameConflictAction = "uniquify";
    let legalFullPath = util.getValidFilename(options.downloadPath + filename,
        options.filenameReplacedCharacters,
        options.filenameReplacementCharacter);

    if (chrome) {
        chrome.downloads.download({
            url: url,
            filename: legalFullPath,
            saveAs: !options.useTemplate
        }
        ,
            function (id) {
            chrome.downloads.onChanged.addListener((delta) => {
                //release the url for the blob
                if (delta.state && delta.state.current === "complete") {
                    if (delta.id === id) {
                        window.URL.revokeObjectURL(url);
                    }
                }
            });
        } );

    }
    else {
        browser.downloads.download({
            url: url,
            filename: legalFullPath,
            saveAs: !options.useTemplate
        }).then((id) => {
            browser.downloads.onChanged.addListener((delta ) => {
                //release the url for the blob
                if (delta.state && delta.state.current === "complete") {
                    if (delta.id === id) {
                        window.URL.revokeObjectURL(url);
                    }
                }
            });
        }).catch((err) => {
            console.error("Download failed" + err)
        });
    }
}

async function getStoredSettings() {

    const myBrowser = browser ? browser : chrome;

    return myBrowser.storage.local.get()
        .then(function (storedSettings) {
            const defaultSettings = {
                pathTemplate: "archives/{/rl-hostname}/{datetime-iso}/",
                filenameTemplate: "{page-title}_({datetime-iso}).md",
                useTemplate: true
            };
            if (!storedSettings.filenameTemplate || !storedSettings.filenameTemplate) {
                browser.storage.local.set(defaultSettings)
            }
            return storedSettings || defaultSettings
        })
}

async function downloadAndLocalifyImages(reparsedReadbilityDOM, options) {

    let images = reparsedReadbilityDOM.querySelectorAll('img');

    images.forEach(async function (img) {

        const imageFilename = new URL(img.src).pathname.split('/').pop();
        let legalImageFilename = util.getValidFilename(imageFilename, options.filenameReplacedCharacters, options.filenameReplacementCharacter);
        let legalImageFullPath = util.getValidFilename(options.downloadPath + imageFilename, options.filenameReplacedCharacters, options.filenameReplacementCharacter);
        if (chrome) {
            if (chrome) {
                chrome.downloads.download({
                        url: img.src,
                        filename: legalImageFullPath,
                        saveAs: !options.useTemplate
                    }
                    ,
                    function (id) {
                        chrome.downloads.onChanged.addListener((delta) => {
                            //release the url for the blob
                            if (delta.state && delta.state.current === "complete") {
                                if (delta.id === id) {
                                    window.URL.revokeObjectURL(img.src);
                                }
                            }
                        });
                    } );

            } else {
                browser.downloads.download({
                    url: img.src,
                    filename: legalImageFullPath,
                    saveAs: false
                })
                    .then((id) => {
                        chrome.downloads.onChanged.addListener((delta) => {
                            //release the url for the blob
                            if (delta.state && delta.state.current === "complete") {
                                if (delta.id === id) {
                                    window.URL.revokeObjectURL(img.src);
                                }
                            }
                        });
                    }).catch((err) => {
                    console.error("Download failed" + err)
                });
            }

        }

        // set image source to local path so that markdown version will point to the local path
        img.setAttribute('src', legalImageFullPath);
    });

    return reparsedReadbilityDOM
}


//function that handles messages from the injected script into the site
async function notify(message) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(message.dom, "text/html");
    if (dom.documentElement.nodeName === "parsererror") {
        console.error("error while parsing");
    }

    let article = createReadableVersion(dom);
    let storedSettings = await getStoredSettings();

    let options = {
        useTemplate: storedSettings.useTemplate,
        pathTemplate: storedSettings.pathTemplate,
        filenameTemplate: storedSettings.filenameTemplate,
        downloadPath: '', // assigned below because we have to pass in 'options'
        title: article.title,
        saveUrl: message.source,
        saveDate: new Date(),
        info: {
            heading: article.excerpt,
            // lang: '',
            author: article.byline,
            // creator: '',
            publisher: article.siteName
        },
        filenameMaxLength: 192,
        filenameReplacedCharacters: ["~", "+", "\\\\", "?", "%", "*", ":", "|", "\"", "<", ">", "\x00-\x1f", "\x7F", "\\s"],
        filenameReplacementCharacter: '_'
    };

    options.downloadPath = await ProcessorHelper.evalTemplate(storedSettings.pathTemplate, options) || '';

    if(storedSettings.saveImages) {
        const reparsedReadabilityDOM = parser.parseFromString(article.content, "text/html");
        if (reparsedReadabilityDOM.documentElement.nodeName === "parsererror") {
            console.error("error while parsing");
        }
        const newImgDOM = await downloadAndLocalifyImages(reparsedReadabilityDOM, options);
        article.content = newImgDOM.querySelector('body').innerHTML;
    }
    const markdown = convertArticleToMarkdown(article, message.source);
    downloadMarkdown(markdown, article, options).then(function(r) {console.log('Page download completed')}).catch(onError)
}

function action(){
    if (chrome) {
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
            let id = tabs[0].id;
            chrome.tabs.executeScript(id, {
                file: "/contentScript/pageScraper.js"
            }, function() {
                console.log("Successfully injected");
            });

        });
    } else {
        browser.tabs.query({currentWindow: true, active: true})
            .then((tabs) => {
                let id = tabs[0].id;
                browser.tabs.executeScript(id, {
                    file: "/contentScript/pageScraper.js"
                }).then( () => {
                    console.log("Successfully injected");
                }).catch( (error) => {
                    console.error(error);
                });
            });
    }
}

//---------------------//
// Filename Templating //
//---------------------//

// code below taken from SingleFile (https://github.com/gildas-lormeau/SingleFile) and slightly edited
// used with permission (also it's AGPL licensed)

const DEFAULT_REPLACED_CHARACTERS = ["~", "+", "\\\\", "?", "%", "*", ":", "|", "\"", "<", ">", "\x00-\x1f", "\x7F"];
const DEFAULT_REPLACEMENT_CHARACTER = "_";

const URL = window.URL;
const DOMParser = window.DOMParser;
const Blob = window.Blob;
const FileReader = window.FileReader;
const fetch = window.fetch;
const crypto = window.crypto;
const TextDecoder = window.TextDecoder;
const TextEncoder = window.TextEncoder;
const util = {
    parseURL(resourceURL, baseURI) {
        if (baseURI === undefined) {
            return new URL(resourceURL);
        } else {
            return new URL(resourceURL, baseURI);
        }
    },
    resolveURL(resourceURL, baseURI) {
        return this.parseURL(resourceURL, baseURI).href;
    },
    getValidFilename(filename, replacedCharacters = DEFAULT_REPLACED_CHARACTERS, replacementCharacter = DEFAULT_REPLACEMENT_CHARACTER) {
        replacedCharacters.forEach(replacedCharacter => filename = filename.replace(new RegExp("[" + replacedCharacter + "]+", "g"), replacementCharacter));
        filename = filename
            .replace(/\.\.\//g, "")
            .replace(/^\/+/, "")
            .replace(/\/+/g, "/")
            .replace(/\/$/, "")
            .replace(/\.$/, "")
            .replace(/\.\//g, "." + replacementCharacter)
            .replace(/\/\./g, "/" + replacementCharacter);
        return filename;
    },
    async digest(algo, text) {
        try {
            const hash = await crypto.subtle.digest(algo, new TextEncoder("utf-8").encode(text));
            return hex(hash);
        } catch (error) {
            return "";
        }
    },
    truncateText(content, maxSize) {
        const blob = new Blob([content]);
        const reader = new FileReader();
        reader.readAsText(blob.slice(0, maxSize));
        return new Promise((resolve, reject) => {
            reader.addEventListener("load", () => {
                if (content.startsWith(reader.result)) {
                    resolve(reader.result);
                } else {
                    this.truncateText(content, maxSize - 1).then(resolve).catch(reject);
                }
            }, false);
            reader.addEventListener("error", reject, false);
        });
    }
};


// ---------------
// ProcessorHelper
// ---------------
const DATA_URI_PREFIX = "data:";

class ProcessorHelper {
    static async evalTemplate(template = "", options, content, dontReplaceSlash) {
        console.log('evaluating template, starting template: ', template)
        const date = options.saveDate;
        console.log('options.saveUrl: ', options.saveUrl)
        const url = util.parseURL(options.saveUrl);
        console.log('parsed URL: ', url)
        template = await evalTemplateVariable(template, "page-title", () => options.title || "No title", dontReplaceSlash, options.filenameReplacementCharacter);
        console.log('evaluating template after page-title: ', template)
        template = await evalTemplateVariable(template, "page-heading", () => options.info.heading || "No heading", dontReplaceSlash, options.filenameReplacementCharacter);
        // template = await evalTemplateVariable(template, "page-language", () => options.info.lang || "No language", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "page-description", () => options.info.description || "No description", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "page-author", () => options.info.author || "No author", dontReplaceSlash, options.filenameReplacementCharacter);
        // template = await evalTemplateVariable(template, "page-creator", () => options.info.creator || "No creator", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "page-publisher", () => options.info.publisher || "No publisher", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "datetime-iso", () => date.toISOString(), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "date-iso", () => date.toISOString().split("T")[0], dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "time-iso", () => date.toISOString().split("T")[1].split("Z")[0], dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "date-locale", () => date.toLocaleDateString(), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "time-locale", () => date.toLocaleTimeString(), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "day-locale", () => String(date.getDate()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "month-locale", () => String(date.getMonth() + 1).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "year-locale", () => String(date.getFullYear()), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "datetime-locale", () => date.toLocaleString(), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "datetime-utc", () => date.toUTCString(), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "day-utc", () => String(date.getUTCDate()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "month-utc", () => String(date.getUTCMonth() + 1).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "year-utc", () => String(date.getUTCFullYear()), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "hours-locale", () => String(date.getHours()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "minutes-locale", () => String(date.getMinutes()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "seconds-locale", () => String(date.getSeconds()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "hours-utc", () => String(date.getUTCHours()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "minutes-utc", () => String(date.getUTCMinutes()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "seconds-utc", () => String(date.getUTCSeconds()).padStart(2, "0"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-hash", () => url.hash.substring(1) || "No hash", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-host", () => url.host.replace(/\/$/, "") || "No host", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-hostname", () => url.hostname.replace(/\/$/, "") || "No hostname", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-href", () => decode(url.href) || "No href", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-referrer", () => decode(options.referrer) || "No referrer", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-password", () => url.password || "No password", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-pathname", () => decode(url.pathname).replace(/^\//, "").replace(/\/$/, "") || "No pathname", dontReplaceSlash === undefined ? true : dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-port", () => url.port || "No port", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-protocol", () => url.protocol || "No protocol", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-search", () => url.search.substring(1) || "No search", dontReplaceSlash, options.filenameReplacementCharacter);
        const params = url.search.substring(1).split("&").map(parameter => parameter.split("="));
        for (const [name, value] of params) {
            template = await evalTemplateVariable(template, "url-search-" + name, () => value || "", dontReplaceSlash, options.filenameReplacementCharacter);
        }
        template = template.replace(/{\s*url-search-[^}\s]*\s*}/gi, "");
        template = await evalTemplateVariable(template, "url-username", () => url.username || "No username", dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "tab-id", () => String(options.tabId || "No tab id"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "tab-index", () => String(options.tabIndex || "No tab index"), dontReplaceSlash, options.filenameReplacementCharacter);
        template = await evalTemplateVariable(template, "url-last-segment", () => decode(getLastSegment(url, options.filenameReplacementCharacter)) || "No last segment", dontReplaceSlash, options.filenameReplacementCharacter);
        if (content) {
            template = await evalTemplateVariable(template, "digest-sha-256", async () => util.digest("SHA-256", content), dontReplaceSlash, options.filenameReplacementCharacter);
            template = await evalTemplateVariable(template, "digest-sha-384", async () => util.digest("SHA-384", content), dontReplaceSlash, options.filenameReplacementCharacter);
            template = await evalTemplateVariable(template, "digest-sha-512", async () => util.digest("SHA-512", content), dontReplaceSlash, options.filenameReplacementCharacter);
        }
        console.log('returning this template: ', template.trim())
        return template.trim();

        function decode(value) {
            try {
                return decodeURI(value);
            } catch (error) {
                return value;
            }
        }
    }

}

// ----
// Util
// ----

function normalizeURL(url) {
    if (!url || url.startsWith(DATA_URI_PREFIX)) {
        return url;
    } else {
        return url.split("#")[0];
    }
}

async function evalTemplateVariable(template, variableName, valueGetter, dontReplaceSlash, replacementCharacter) {
    let maxLength;
    if (template) {
        const regExpVariable = "{\\s*" + variableName.replace(/\W|_/g, "[$&]") + "\\s*}";
        let replaceRegExp = new RegExp(regExpVariable + "\\[\\d+\\]", "g");
        if (template.match(replaceRegExp)) {
            const matchedLength = template.match(replaceRegExp)[0];
            maxLength = Number(matchedLength.match(/\[(\d+)\]$/)[1]);
            if (isNaN(maxLength) || maxLength <= 0) {
                maxLength = null;
            }
        } else {
            replaceRegExp = new RegExp(regExpVariable, "g");
        }
        if (template.match(replaceRegExp)) {
            let value = await valueGetter();
            if (!dontReplaceSlash) {
                value = value.replace(/\/+/g, replacementCharacter);
            }
            if (maxLength) {
                value = await util.truncateText(value, maxLength);
            }
            return template.replace(replaceRegExp, value);
        }
    }
    return template;
}

function getLastSegment(url, replacementCharacter) {
    let lastSegmentMatch = url.pathname.match(/\/([^/]+)$/), lastSegment = lastSegmentMatch && lastSegmentMatch[0];
    if (!lastSegment) {
        lastSegmentMatch = url.href.match(/([^/]+)\/?$/);
        lastSegment = lastSegmentMatch && lastSegmentMatch[0];
    }
    if (!lastSegment) {
        lastSegmentMatch = lastSegment.match(/(.*)\.[^.]+$/);
        lastSegment = lastSegmentMatch && lastSegmentMatch[0];
    }
    if (!lastSegment) {
        lastSegment = url.hostname.replace(/\/+/g, replacementCharacter).replace(/\/$/, "");
    }
    lastSegmentMatch = lastSegment.match(/(.*)\.[^.]+$/);
    if (lastSegmentMatch && lastSegmentMatch[1]) {
        lastSegment = lastSegmentMatch[1];
    }
    lastSegment = lastSegment.replace(/\/$/, "").replace(/^\//, "");
    return lastSegment;
}


function log(...args) {
    console.log("markdown-clipper ", ...args); // eslint-disable-line no-console
}
