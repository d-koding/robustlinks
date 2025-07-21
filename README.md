# Robust Links V2 [WIP]

Are you an author of web pages and you don't want your links to die? The `RobustLinksV2` library provides a powerful and flexible way to combat "link rot" and "content drift" by augmenting your web links with archival metadata and functionality.

This library helps ensure that even if an original web resource changes or disappears, visitors to your page can still access a preserved version of the content as it was intended at the time of linking. This is achieved by leveraging the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) infrastructure, which aggregates web archives from around the world.

![](https://robustlinks.mementoweb.org/demo/robustlinks_demo_light.gif)
*(Note: The GIF shows a previous version's UI, but the core concept of augmented links remains.)*

### See it in Action!

<a href="demo/index.html" style="
    display: inline-block;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    background-color: #007bff;
    border: none;
    border-radius: 5px;
    text-decoration: none;
    text-align: center;
    transition: background-color 0.3s;
">
    Go to the Live Demo
</a>


## Key Concepts

Robust Links enhance standard `<a>` tags with specific `data-*` attributes:

* `data-originalurl`: The original, canonical URI of the resource being linked.
* `data-versiondate`: The intended date of linking to the resource, representing the state the linker wants the visitor to experience.
* `data-versionurl`: (Optional) The URI of one or more pre-existing snapshots of the resource, often from a web archive.

## Installation and Setup

To integrate `RobustLinksV2` into your webpage:

1.  **Download the files:** Obtain the compiled `robustlinks2.js` and `robustlinks2.css` files.
2.  **Place them in your project:** A common setup is to place `robustlinks2.js` in a `js/` directory.
3.  **Include in your HTML:** Add the following lines to the `<head>` section of your HTML source:

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Robust Links Page</title>
    </head>
    <body>
        <!-- Your page content -->

        <!-- RobustLinksV2 JavaScript (place before closing </body> for optimal loading) -->
        <script type="module" src="js/robustlinks2.js"></script>

        <!-- Your initialization script -->
        <script type="module">
            import { RobustLinksV2 } from './js/robustlinks2.js'; // Adjust path as needed

            document.addEventListener('DOMContentLoaded', () => {
                // Initialize RobustLinksV2 with your desired configuration
                new RobustLinksV2({
                    // Your configuration options go here (see below)
                });
            });
        </script>
    </body>
    </html>
    ```

## RobustLinksConfig Options

The `RobustLinksV2` class is initialized with a configuration object (`RobustLinksConfig`) to customize its behavior:

```typescript
interface RobustLinksConfig {
    id?: string; // An identifier for the RobustLinksV2 instance.
    debug?: boolean; // Enables debug logging to the console. Defaults to `false`.
    timeGate?: string; // The base URL for the Memento TimeGate. Defaults to "[https://web.archive.org/](https://web.archive.org/)".
    enableDropdown?: boolean; // Enables or disables the dropdown menu for robustified links. Defaults to `false`.
    dropdownArrowColor?: string; // The color of the dropdown arrow icon (influences CSS). Defaults to "#333".
    dropdownArrowSize?: string; // The size (e.g., "1em", "12px") of the dropdown arrow icon (influences CSS). Defaults to "6px".
    dropdownArrowHtml?: string; // Custom HTML string to use for the dropdown arrow icon (e.g., SVG markup). If not provided, a Unicode arrow (▼) is used.
    autoInit?: boolean | { // Enables or configures automatic robust link creation on initialization. Defaults to `true`.
        selector?: string; // CSS selector for links to robustify. Defaults to `a:not([data-originalurl])`.
        rootElement?: HTMLElement; // The DOM element to search within. Defaults to `document.body`.
        dataProducer?: (anchor: HTMLAnchorElement, index: number) => { // Custom function to provide robust link data.
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkSnapshot[];
            newHref?: string;
        } | null | undefined;
    };
}
```

## FUTURE WORK
 * Serverside fetching for more accurate version dates
 *
 * Configurable fallback for versiondate, other parameters
 *
 * End goal of library:
 * Instantiate class, add a config, and let it go to work
 *
 * Reconstructive-esque page with documentation, github page, and examples
 *
 * Robust Links can check to see how many robustified links are alive or dead
 *
 * Attach an event handler on a higher level element that will reinstantiate after
 * a certain amount of time
 * 
 * Current issue with dataproducer: How complex should it be to use something other than
 * the archve? Right now it takes a lot of coding but it could be nice to just enter an
 * archive name and be done.

## Add Robust Links To Your Webpages [LEGACY]

Simply append the following lines to the `<head>` section of your HTML source:

```html
<!-- RobustLinks CSS -->
<link rel="stylesheet" type="text/css" href="https://doi.org/10.25776/z58z-r575" />
<!-- RobustLinks Javascript -->
<script type="text/javascript" src="https://doi.org/10.25776/h1fa-7a28"></script>
```

## RobustLinks Menu [LEGACY]

After adding the Robust Links JavaScript source to your HTML file, a new link icon will appear next to all the robustified links in the page. Clicking the down arrow in this icon will pop up a menu with the following items:

* `Current version of page`: Clicking this menu item will take you to the original url provided in the `data-originalurl` attribute.

* `Version archived on <date>`: Clicking this menu item will redirect you to the memento url provided in the `data-versionurl` attribute.

* `Version archived near <date>`: When clicking this menu item, the JavaScript library will use the datetime provided in the `data-versiondate` attribute along with the original url and redirect you to the closest memento around that datetime using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) service.


## Example [LEGACY]
- [Before](http://robustlinks.mementoweb.org/demo/uri_references.html)
- [After](http://robustlinks.mementoweb.org/demo/uri_references_js.html)

## License [LEGACY]
See the [license](http://mementoweb.github.io/SiteStory/license.html).

