# LifeScope Browser Extension

This browser extension allows you to make LifeScope Events and Content from your browsing history.
Once installed, you can add domains that you want LifeScope to track to a Whitelist.
If the browser supports the history API, the extension will automatically parse your history on the whitelisted domains and create Events for each time you visited those pages.
It will also record any future visits to pages under those domains.

# Supported Browsers

Currently, the extension has been built and tested for:

* Chrome
* Firefox

We are planning to include support for other browsers in the future. 

# Building the extension

Since each browser handles extensions differently, there are separate build commands for each.
Run 

`npm run build:<browser>`

to build the extension for that browser. The files will be placed in /dist/<browser>.

The current valid build commands are:

* `npm run build:chrome`
* `npm run build:firefox`

These commands will place the built files in dist/<browser>.

To zip up the files for submission to extension/add-on stores, run

`gulp bundle:<browser>`

e.g.

* `gulp bundle:chrome`
* `gulp bundle:firefox`

This command will place the .zip file in dist/