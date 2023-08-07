# Zendesk Link Collector ![icon](icons/zlc-icon-32x32.png)



This is a WIP browser extension that collects links from a Zendesk ticket according to custom regex values.

## Features

- Links are defined using custom regex.
- Links that match patterns are grouped by the pattern they match in the extension UI. 
- No other chaos from the ticket is included in the link, only actual links are considered (`a` elements).
    - Links can optionally display "context" in the extention UI. This shows the surrounding text beside the link (the context is the parent element of the `a` element).  
- Scroll to a link's location by clicking the spyglass icon beside a link.

![Screen Shot 2023-08-04 at 4 46 24 PM](https://github.com/BagToad/Zendesk-Link-Collector/assets/47394200/21817b0d-2728-474b-be91-9cc750b704e6)

## Installation
### Chrome
1.  Clone the repository or download and extract the ZIP file to your local machine.
2.  Open `chrome://extensions` in your Google Chrome browser.
3.  Turn on `Developer mode` by clicking the toggle in the top-right corner.
4.  Click on the `Load unpacked` button and select the folder where you extracted the ZIP file.


