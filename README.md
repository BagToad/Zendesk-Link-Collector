# Zendesk Link Collector ![icon](icons/zlc-icon-32x32.png)

This is a browser extension that collects links from a Zendesk ticket according to custom regex values. This tool's purpose is to help Zendesk users more easily handle _long_ tickets where links and/or attachments are key information.

## Features

### Links
- Links are aggregated according to custom RegEx patterns.
- No other chaos from the ticket is included in the link, only actual links are considered (`a` elements).
    - Links can optionally display "context". This shows the surrounding text beside the link (the context is the parent element of the `a` element).  
- Scroll to a link's source comment by clicking the spyglass icon beside a link.

![image](https://github.com/BagToad/Zendesk-Link-Collector/assets/47394200/f3731ef8-83f5-4419-b266-7a51ec70837c)


### Attachments
- Attachments are aggregated.
- Scroll to an attachment's source comment by clicking the spyglass icon beside a link.

![image](https://github.com/BagToad/Zendesk-Link-Collector/assets/47394200/f80331fa-e72a-4df0-8970-ac2e4033c4d4)


## Installation
### FireFox
Download and install [directly from the addons store](https://addons.mozilla.org/en-CA/firefox/addon/zendesk-link-collector/).

### Chrome
Download and install [directly from the chrome web store](https://chrome.google.com/webstore/detail/zendesk-link-collector/nckhapficnbbmcpapjnnegpagfcbjpja).

### Chrome Manual Installation
1.  Clone the repository or download and extract the ZIP file to your local machine.
2.  Open `chrome://extensions` in your Google Chrome browser.
3.  Turn on `Developer mode` by clicking the toggle in the top-right corner.
4.  Click on the `Load unpacked` button and select the folder where you extracted the ZIP file.


