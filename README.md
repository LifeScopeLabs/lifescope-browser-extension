# [LIFESCOPE-BROWSER-EXTENSION](https://github.com/LifeScopeLabs/lifescope-browser-extension)

## [Repository](https://github.com/LifeScopeLabs/lifescope-browser-extension)

(development phase, medium priority)

* Regularly post browser history into LIFESCOPE schema
* Capture web history on a url, site visit, or domain basis
* Scrape important info (like netflix or hulu history)
* Surface metadata (oEmbed, Embedly)
* Capture and store location data

### Requirements
- **MVP**:  Reconnect current extension to the LIFESCOPE API.
- Remove CoffeeScript and convert to a Universal Browser Extension.
- Add Scraping for selected domains.
- Record locations.

### Dependencies
- Vue/Nuxt compatible
- CoffeeScript (To be removed)

### Examples
- [Universal Browser Extension Dev Example](https://www.smashingmagazine.com/2017/04/browser-extension-edge-chrome-firefox-opera-brave-vivaldi/)
- [Mozilla WebExtensions Standards](https://developer.mozilla.org/en-US/Add-ons/WebExtensions)
- https://github.com/martinsbalodis/web-scraper-chrome-extension
- https://github.com/mrhegemon/chrome-export-history

**Opt in to browser history collection and scraping on supported sites.**

![browserextscrape]

**Review and edit your collected history.**

![browserext]

## Data Collection Sources

| Data Source | Status | Data Collected |
|--|--|--|
| URL History | beta | events, content |
| Location History | development | locations |
| **Scrape** Netflix | planned | events, content |
| **Scrape** Hulu | planned | events, content |
| **Scrape** Amazon Prime | planned | events, content |
| **Scrape** HBO GO | planned | events, content |
| **Scrape** YouTube | planned | events, content |

## Developer Setup

1. Clone this repo
2. Install the repo's directory as an extension

[browserext]:https://lifescopelabs.github.io/assets/screenshots/browser-plugin-screenshot.png
[browserextscrape]:https://lifescopelabs.github.io/assets/screenshots/browser-extensions.png
