function notifyExtension() {
    var content = document.documentElement.outerHTML;
    if (chrome) {
        chrome.runtime.sendMessage({"dom": content, "source": window.location.href});
    } else {
        browser.runtime.sendMessage({"dom": content, "source": window.location.href});
    }
}

notifyExtension();
