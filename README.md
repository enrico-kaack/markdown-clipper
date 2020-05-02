# markdown-clipper

This is a Firefox and Google Chrome extension to clip websites and download them into a readable markdown file.

It uses the following libraries:
- [Readability.js](https://github.com/mozilla/readability) by Mozilla in version from commit [52ab9b5c8916c306a47b2119270dcdabebf9d203](https://github.com/mozilla/readability/commit/52ab9b5c8916c306a47b2119270dcdabebf9d203). This library is also used for the Firefox Reader View and it simplifies the page so that only the important parts are clipped. (Licensed under Apache License Version 2.0)
- [Turndown v6.0.0](https://github.com/domchristie/turndown) & [turndown-plugin-gfm v1.0.1](https://github.com/domchristie/turndown-plugin-gfm) by Dom Christie  is used to convert the simplified HTML (from Readability.js) into markdown. (Licensed under MIT License)

# Installation
The plugin is available for [Firefox](https://addons.mozilla.org/de/firefox/addon/markdown-clipper/) and [Google Chrome](https://chrome.google.com/webstore/detail/markdown-clipper/cjedbglnccaioiolemnfhjncicchinao).

# Permissions
- Access tabs: used to access the website content when the icon in the browser bar is clicked.
- Manage Downloads: neccessary to be able to download the markdown file.

--- 
The icon was created using [Favicon.io](https://favicon.io)
