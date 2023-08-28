<img src="https://github.com/BagToad/Zendesk-Link-Collector/blob/d05f079bb994524c10e1cb0766ec593d7b3817d0/icons/zlc-icon-128x128.png" align="right">

# Zendesk Link Collector 

This is a browser extension that collects links from a Zendesk ticket according to custom Regular Expression (regex) values. This tool's purpose is to help Zendesk users more easily handle _long_ tickets where links and/or attachments are key information.

## Installation
This extension can be installed from the [Firefox addons store](https://addons.mozilla.org/en-CA/firefox/addon/zendesk-link-collector/) or the [Chrome web store](https://chrome.google.com/webstore/detail/zendesk-link-collector/nckhapficnbbmcpapjnnegpagfcbjpja).

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/nckhapficnbbmcpapjnnegpagfcbjpja?logo=Google%20Chrome)](https://chrome.google.com/webstore/detail/zendesk-link-collector/nckhapficnbbmcpapjnnegpagfcbjpja) [![Mozilla Add-on Version](https://img.shields.io/amo/v/zendesk-link-collector?logo=Firefox)](https://addons.mozilla.org/en-CA/firefox/addon/zendesk-link-collector/)

You can also manually [install it from the source code](#chrome-manual-installation).

## Configuration
Access the configuration page to set link regex patterns you would like to aggregate from tickets.

### Google Chrome
- Right-click the extension icon 👉 `options`.

OR

- Visit `chrome://extensions/`
- Click on the extension's **Details**.
- Click on **Extension options**.

### Firefox
- Visit `about:addons`
- Find the extension and click **`...`** 👉 `Preferences`

## Features

### Links
- Links are aggregated according to custom regex patterns.
- No other chaos from the ticket is included in the link, only actual links are considered (`a` anchor elements).
    - Links can optionally display "context" when the "Show context?" checkbox option selected. This shows the surrounding text beside the link (the context is the parent HTML element of the `a` element).  
- Scroll to a link's source comment by clicking the spyglass icon (🔍) beside a link.

![image](https://github.com/BagToad/Zendesk-Link-Collector/assets/47394200/f3731ef8-83f5-4419-b266-7a51ec70837c)


### Attachments
- Attachments are aggregated.
- Scroll to an attachment's source comment by clicking the spyglass icon beside a link.

![image](https://github.com/BagToad/Zendesk-Link-Collector/assets/47394200/f80331fa-e72a-4df0-8970-ac2e4033c4d4)

### Chrome Manual Installation
1.  Clone the repository or download and extract the ZIP file to your local machine.
2.  Open `chrome://extensions` in your Google Chrome browser.
3.  Turn on `Developer mode` by clicking the toggle in the top-right corner.
4.  Click on the `Load unpacked` button and select the folder where you extracted the ZIP file.


