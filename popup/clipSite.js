if (chrome) {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var id = tabs[0].id;
        var url = tabs[0].url;
          chrome.tabs.executeScript(id, {
              file: "/contentScript/pageScrapper.js"
          }, function() {
              console.log("Successfully injected");
          });
    });
} else {
    browser.tabs.query({currentWindow: true, active: true})
    .then((tabs) => {
      var id = tabs[0].id;
      var url = tabs[0].url;
        browser.tabs.executeScript(id, {
            file: "/contentScript/pageScraper.js"
        }),then( () => {
            console.log("Successfully injected");
        }).catch( (error) => {
            console.error(error);
        });
      });
}


