/** robustlinks2.ts
 *
 * @overview A general purpose library for handling Robust Link data.
 * Provides tools necessary for creating, augmenting, and parsing Robust
 * Links. 
 * 
 * Currently assumes another client will handle specific data fetching
 * methods for TimeGates and TimeMaps. 
 * 
 * @author Yorick Chollet <yorick.chollet@gmail.com>
 * @author Harihar Shankar <hariharshankar@gmail.com>
 * @author Shawn M. Jones <jones.shawn.m@gmail.com>
 * @author Dylan O'Connor <dylankconnor@gmail.com>
 * @version 3.0.0
 * License can be obtained at http://mementoweb.github.io/SiteStory/license.html
 * 
*/

/**
 * Interface defining the configuration options for RobustLinksV2.
 * All properties are optional as they will have default values set in the constructor.
 */
export interface RobustLinksConfig {
    id?: string;
    urimPattern?: string;
    debug?: boolean;
}

/**
 * Defines the accepted formats for data-versiondate and snapshot datetimes.
 * - YYYY-MM-DD (ISO8601 date)
 * - YYYY-MM-DDThh:mm:ssZ (ISO8601 datetime UTC)
 * - YYYYMMDD (Web Archive URI date)
 * - YYYYMMDDhhmmss (Web Archive URI datetime)
 */
export type RobustLinkDatetimeString = string; // Validation handled by parseDatetime function

/**
 * Represents a single snapshot entry within the data-versionurl attribute.
 */
export interface RobustLinkSnapshot {
    /** The URI of the snapshot. Must be absolute. */
    uri: string;
    /** The datetime the snapshot was created, if provided. Interpreted as noon UTC if date-only. */
    datetime?: RobustLinkDatetimeString;
}

/**
 * Represents the raw HTML data- attributes used for a Robust Link.
 * These are the strings directly read from the DOM.
 */
export interface RobustLinkRawAttributes {
    href: string;
    'data-originalurl'?: string;
    'data-versiondate'?: string;
    'data-versionurl'?: string;
}

/**
 * A more structured and parsed representation of a Robust Link after validation.
 */
export interface ParsedRobustLink {
    /** The default link target URI. */
    href: string;
    /** The URI of the resource that motivates the Robust Link. Always absolute. */
    originalUrl: string;
    /** The intended linking datetime, parsed into a Date object (UTC). */
    versionDate: Date;
    /** An array of parsed snapshot URIs and their datetimes. */
    versionSnapshots: RobustLinkSnapshot[];
    /** The original HTML text content of the <a> tag. */
    linkText?: string;
}


/**
 * The `RobustLinksV2` class provides functionality for managing and configuring
 * robust linking behavior within an application. It includes utilities for
 * validating URLs, managing a list of excluded archive patterns, and parsing
 * and creating Robust Links based on the specification.
 *
 * It can be used as a module to be initialized once and then used throughout
 * your application to manage robust links.
 */
export class RobustLinksV2 {
    // Internal constants for the module -> Not in the constructor because we want to guarantee imutability
    private readonly NAME: string = 'RobustLinksV2';
    private readonly VERSION: string = '3.0.0';

    // Public configurable properties, initialized with defaults
    public id: string;
    public urimPattern: string;
    public debug: boolean;

    // Private properties for internal use
    private _regexps: {
        urimPattern: RegExp;
        absoluteReference: RegExp;
        bodyEnd: RegExp;
    };
    private exclusions: { [key: string]: (url: string) => boolean };


    /**
     * Creates a new RobustLinksV2 instance with optional configurations.
     * Default values are provided for all configurable properties.
     *
     * @param {RobustLinksConfig} [config] - Optional configuration options to override defaults.
     */
    constructor(config?: RobustLinksConfig) {

        /**
         * Identification for the Robust Links instance, name:version
         * Not intended to be overwritten by a config object
         *
         * @type {string}
         */
        this.id = `${this.NAME}:${this.VERSION}`;

        /**
         * A local constant computed to dynamically determine the base URL of
         * the web application that RobustLinks is running on.
         *
         * This is an internally derived object and not meant to be overridden.
         *
         * @type {string}
         */
        const origin = typeof self !== 'undefined' && self.location && self.location.origin ? self.location.origin : '';

        /**
         * Defines the Uniform Resource Identifier-M Pattern.
         * This pattern is crucial for identifying and constructing
         * memento URIs.
         *
         * Defaults to a webserver with a predefined memento pathway
         *
         * @type {string}
         */
        this.urimPattern = `${origin}/memento/<datetime>/<urir>`;

        /**
         * A private object that holds a collection of functions
         * each designed to test whether or not a link should be
         * included or ignored by the RobustLinksV2 system
         *
         * @type { [key: string]: (url: string) => boolean }
         */
        this.exclusions = {
            // Converts patterns like "https?://web.archive.org/web/*" into actual RegExp objects.
            isKnownArchive: (url: string) => {
                const archivePatterns = [
                    "https?://web.archive.org/web/",
                    "https?://web.archive.bibalex.org/web/",
                    "https?://www.webarchive.org.uk/wayback/en/archive/",
                    "https?://langzeitarchivierung.bib-bvb.de/wayback/",
                    "https?://webcitation.org/",
                    "https?://webarchive.loc.gov/all/",
                    "https?://wayback.archive-it.org/all/",
                    "https?://wayback.archive-it.org/[0-9]+/",
                    "https?://webarchive.parliament.uk/[0-9]+/",
                    "https?://webarchive.parliament.uk/[0-9]+tf_/",
                    "https?://webarchive.nationalarchives.gov.uk/[0-9]+/",
                    "https?://webarchive.nationalarchives.gov.uk/[0-9]+tf_/",
                    "https?://archive.li/",
                    "https?://archive.vn/",
                    "https?://archive.fo/",
                    "https?://archive.md/",
                    "https?://archive.ph/",
                    "https?://archive.today/",
                    "https?://archive.is/",
                    "https?://waext.banq.qc.ca/wayback/[0-9]+/",
                    "https?://haw.nsk.hr/arhiva/",
                    "https?://wayback.webarchiv.cz/wayback/[0-9]+/",
                    "https?://wayback.vefsafn.is/wayback/[0-9]+/",
                    "https?://arquivo.pt/wayback/[0-9]+/",
                    "https?://arquivo.pt/wayback/[0-9]+if_/",
                    "https?://perma-archives.org/warc/[0-9]+/",
                    "https?://perma.cc/[0-9A-Z]{4}-[0-9A-Z]{4}/",
                    "https?://wayback.padicat.cat/wayback/[0-9]+/",
                    "https?://archive.aueb.gr/services/web/[0-9]+/",
                    "https?://digital.library.yorku.ca/wayback/[0-9]+/",
                    "https?://veebiarhiiv.digar.ee/a/[0-9]+/",
                    "https?://webarchive.nrscotland.gov.uk/[0-9]+/",
                    "https?://nukrobia.nuk.uni-lj.si:8080/wayback/[0-9]+/",
                    "https?://swap.stanford.edu/[0-9]+/"
                ];

                return archivePatterns.some(pattern => {
                    let processedPattern = pattern;

                    // 1. Escape literal dots. All dots in your provided patterns are literal,
                    //    meaning they should match a period character, not "any character".
                    processedPattern = processedPattern.replace(/\./g, '\\.');

                    // 2. The `https?` part already correctly uses `?` as a quantifier.
                    //    No specific replacement needed for `?` if it's meant as a quantifier.
                    //    DO NOT use `replace(/\?/g, '.')` as it changes its meaning.

                    // 3. For parts like `[0-9]+` or `[0-9A-Z]{4}-[0-9A-Z]{4}`,
                    //    the `[`, `]`, `{`, `}`, `+`, `-` inside these are intended to be regex metacharacters
                    //    and should be passed as is to `new RegExp`.
                    //    `processedPattern` should already have them.

                    const regex = new RegExp(`^${processedPattern}`, 'i'); // Anchor to start, case-insensitive

                    return regex.test(url);
                });
            }
        };

        /**
         * Whether or not to show debug messages in the console.
         * Defaults to false.
         *
         * @type {boolean}
         */
        this.debug = false;

        // Overwrite defaults with any provided configuration
        if (config instanceof Object) {
            for (const [key, value] of Object.entries(config)) {
                // Type assertion to allow dynamic assignment, assuming config keys match public properties
                if (Object.prototype.hasOwnProperty.call(this, key)) {
                     (this as any)[key] = value;
                }
            }
        }

        // ----INTERNAL PROPERTIES-----
        /**
         * This section of the constructor initializes _regexps, a private object that
         * stores regular expression patterns essential for RobustLinksV2's core functionality.
         * These patterns are used internally to identify, parse, and manipulate URLs and HTML content.
         * Not needed at the moment, but could be useful in the FUTURE
         *
         * @type {{ urimPattern: RegExp; absoluteReference: RegExp; bodyEnd: RegExp; }}
         */
        this._regexps = {
            urimPattern: new RegExp(`^${this.urimPattern.replace('<datetime>', '(\\d{14})').replace('<urir>', '(.*)')}$`),
            // This regex will match absolute HTTP/HTTPS URLs in src, href, or content attributes.
            // It captures: (1) prefix, (2) tag/attribute info, (3) the URL, (4) suffix
            absoluteReference: new RegExp(`(<(iframe|a|meta|link|script).*?\\s+(src|href|content|url)\\s*=\\s*["']?)(https?:\/\/[^'"\\s]+)(.*?>)`, 'ig'),
            bodyEnd: new RegExp('<\/(body|html)>', 'i')
        };
    }

    // ---- EXTERNAL FUNCTIONS ----

    /**
     * Generates a Memento URI (URI-M) using the configured `urimPattern`.
     * This method creates a URI that points to a specific historical version
     * of an original resource at a given datetime. It's often a "TimeGate" URI
     * used to negotiate the best available memento.
     *
     * @param originalUrl The URI of the original resource (URI-R). Must be an absolute HTTP/HTTPS URL.
     * @param dateTime The desired historical datetime for the memento.
     * @returns A string representing the Memento URI.
     * @throws {Error} if the originalUrl is not a valid absolute HTTP/HTTPS URL.
     */
    public createMementoUri(originalUrl: string, dateTime: Date): string {
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            this.logDebug(`RobustLinksV2: originalUrl "${originalUrl}" is not a valid absolute HTTP/HTTPS URL for Memento URI creation.`);
            throw new Error(`Invalid originalUrl: "${originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        }

        const datetimeString = this.formatDateTime(dateTime);

        // Per RFC 7089 (Memento protocol), the URI-R in the URI-M is the original URI itself,
        // without further encoding, as it's part of the path, but the server handles its parsing.
        // So, direct replacement is usually fine.
        const mementoUri = this.urimPattern
            .replace('<datetime>', datetimeString)
            .replace('<urir>', originalUrl);

        this.logDebug(`RobustLinksV2: Created Memento URI: ${mementoUri} for originalUrl: ${originalUrl} at datetime: ${dateTime.toISOString()}`);

        return mementoUri;
    }

    /**
     * Checks if a string is a valid absolute HTTP or HTTPS URL.
     * This method is marked as `static` because it doesn't depend on any instance properties
     * and can be called directly on the class (e.g., `RobustLinksV2.isValidAbsoluteUrl(...)`).
     *
     * @param url The string to validate.
     * @returns True if it's a valid absolute HTTP/HTTPS URL, false otherwise.
     */
    public static isValidAbsoluteUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            // Ensure it's http or https protocol and has a non-empty hostname
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.length > 0;
        } catch (e) {
            // If URL constructor throws an error, it's not a valid URL
            return false;
        }
    }

    /**
     * Parses a datetime string according to the Robust Links specification rules.
     * Handles both ISO8601 and Web Archive URI formats, and correctly interprets
     * date-only strings as noon UTC.
     * @param datetimeStr The datetime string to parse.
     * @returns A Date object representing the parsed datetime, or null if invalid.
     */
    public static parseDatetime(datetimeStr: RobustLinkDatetimeString): Date | null {
        // ISO8601 Date: YYYY-MM-DD
        const isoDateMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateMatch) {
            // Interpret as noon UTC
            return new Date(Date.UTC(
                parseInt(isoDateMatch[1]), // Year
                parseInt(isoDateMatch[2]) - 1, // Month (0-indexed)
                parseInt(isoDateMatch[3]), // Day
                12, 0, 0, 0 // Noon UTC
            ));
        }

        // ISO8601 Datetime: YYYY-MM-DDThh:mm:ssZ
        const isoDatetimeMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/);
        if (isoDatetimeMatch) {
            return new Date(Date.UTC(
                parseInt(isoDatetimeMatch[1]),
                parseInt(isoDatetimeMatch[2]) - 1,
                parseInt(isoDatetimeMatch[3]),
                parseInt(isoDatetimeMatch[4]),
                parseInt(isoDatetimeMatch[5]),
                parseInt(isoDatetimeMatch[6])
            ));
        }

        // Web Archive URI Date: YYYYMMDD
        const waDateMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (waDateMatch) {
            // Interpret as noon UTC
            return new Date(Date.UTC(
                parseInt(waDateMatch[1]),
                parseInt(waDateMatch[2]) - 1,
                parseInt(waDateMatch[3]),
                12, 0, 0, 0
            ));
        }

        // Web Archive URI Datetime: YYYYMMDDhhmmss
        const waDatetimeMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        if (waDatetimeMatch) {
            return new Date(Date.UTC(
                parseInt(waDatetimeMatch[1]),
                parseInt(waDatetimeMatch[2]) - 1,
                parseInt(waDatetimeMatch[3]),
                parseInt(waDatetimeMatch[4]),
                parseInt(waDatetimeMatch[5]),
                parseInt(waDatetimeMatch[6])
            ));
        }

        return null; // Invalid format
    }

    /**
     * Parses the data-versionurl string into an array of RobustLinkSnapshot objects.
     * @param versionUrlString The raw string value of the data-versionurl attribute.
     * @returns An array of RobustLinkSnapshot.
     */
    public static parseVersionUrl(versionUrlString: string | undefined): RobustLinkSnapshot[] {
        if (!versionUrlString) {
            return [];
        }

        const snapshots: RobustLinkSnapshot[] = [];
        // Split by space, then filter out empty strings to handle multiple spaces
        const parts = versionUrlString.split(' ').filter(part => part.length > 0);
        let i = 0;

        while (i < parts.length) {
            const uri = parts[i];
            // Check if the current part is a valid URI
            if (!RobustLinksV2.isValidAbsoluteUrl(uri)) {
                // If it's not a valid URI, it might be a malformed datetime or just junk.
                // We'll skip it and log a warning if debug is enabled.
                // For a robust implementation, you might want to throw an error here,
                // or have a stricter ABNF-based parser.
                console.warn(`RobustLinksV2: Skipping invalid URI in data-versionurl: "${uri}"`);
                i++;
                continue;
            }

            // Check if the next part looks like a datetime
            const nextPart = parts[i + 1];
            const isDatetime = nextPart && RobustLinksV2.parseDatetime(nextPart) !== null;

            if (isDatetime) {
                snapshots.push({ uri, datetime: nextPart });
                i += 2; // Consume URI and datetime
            } else {
                snapshots.push({ uri });
                i += 1; // Consume only URI
            }
        }
        return snapshots;
    }

    /**
     * Takes an object representing the raw HTML attributes of an <a> element
     * and returns a parsed and validated ParsedRobustLink object.
     *
     * This method implements the logic for handling missing attributes as per
     * Section 3.5 "Missing attribute information" of the specification.
     *
     * @param rawAttributes The raw attributes from an HTML <a> element.
     * @param defaultLinkText Optional text content of the <a> tag, used for the `linkText` property.
     * @returns A ParsedRobustLink object.
     * @throws {Error} if required attributes are missing or invalid, even after attempting defaults.
     */
    public parseRobustLink(rawAttributes: RobustLinkRawAttributes, defaultLinkText?: string): ParsedRobustLink {
        let { href, 'data-originalurl': originalUrl, 'data-versiondate': versionDateStr, 'data-versionurl': versionUrlStr } = rawAttributes;

        // Apply default for data-originalurl if missing (Section 3.5)
        if (!originalUrl && href) {
            if (this.debug) {
                this.logDebug(`RobustLinksV2: data-originalurl missing, defaulting to href: ${href}`);
            }
            originalUrl = href; // Use href as data-originalurl if not provided
        }

        // --- Basic validation of required attributes after defaulting ---
        if (!href) {
            throw new Error("Robust Link parsing failed: 'href' attribute is missing and required.");
        }
        if (!originalUrl) {
            throw new Error("Robust Link parsing failed: 'data-originalurl' (or default from href) is missing and required.");
        }
        if (!versionDateStr) {
            // For data-versiondate, the spec allows client applications to attempt to determine a plausible value
            // if not provided, e.g., document creation/last modification date.
            // For this draft, we will currently treat it as a hard error if not present,
            // or you could add a fallback (e.g., to current date, though this is less precise).
            // For now, let's make it throw if not provided, to keep it explicit.
            throw new Error("Robust Link parsing failed: 'data-versiondate' attribute is missing and required.");
        }

        // --- URI Absolute Validation ---
        if (!RobustLinksV2.isValidAbsoluteUrl(href)) {
            throw new Error(`Invalid href: "${href}" is not an absolute URI.`);
        }
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            throw new Error(`Invalid data-originalurl: "${originalUrl}" is not an absolute URI.`);
        }

        // --- Parse and Validate data-versiondate ---
        const parsedVersionDate = RobustLinksV2.parseDatetime(versionDateStr);
        if (!parsedVersionDate) {
            throw new Error(`Invalid data-versiondate format: "${versionDateStr}". Must follow ISO8601 or Web Archive URI datetime formats.`);
        }

        // --- Parse and Validate data-versionurl ---
        const parsedVersionSnapshots = RobustLinksV2.parseVersionUrl(versionUrlStr);
        // `parseVersionUrl` already handles basic URI validity for snapshots.
        // If it encounters malformed parts, it warns and skips.

        return {
            href,
            originalUrl,
            versionDate: parsedVersionDate,
            versionSnapshots: parsedVersionSnapshots,
            linkText: defaultLinkText
        };
    }

    /**
     * Discovers all robust links within a given HTML element (or the entire document body)
     * and parses them into ParsedRobustLink objects.
     * Invalid robust links found will be logged as errors and skipped.
     *
     * @param rootElement The HTML element to search within. Defaults to `document.body`.
     * @returns An array of ParsedRobustLink objects found.
     */
    public findAndParseRobustLinks(rootElement?: HTMLElement): ParsedRobustLink[] {
        const links: ParsedRobustLink[] = [];
        const scope = rootElement || document.body;
        const anchorElements = scope.querySelectorAll('a[data-originalurl][data-versiondate]'); // Select only potential robust links

        anchorElements.forEach(anchor => {
            const href = anchor.getAttribute('href');
            const dataOriginalUrl = anchor.getAttribute('data-originalurl');
            const dataVersionDate = anchor.getAttribute('data-versiondate');
            const dataVersionUrl = anchor.getAttribute('data-versionurl');
            const linkText = anchor.textContent || undefined; // Get link text, default to undefined if empty

            const rawAttributes: RobustLinkRawAttributes = {
                href: href || '', // Ensure href is always a string for the interface
                'data-originalurl': dataOriginalUrl || undefined,
                'data-versiondate': dataVersionDate || undefined,
                'data-versionurl': dataVersionUrl || undefined
            };

            try {
                const parsedLink = this.parseRobustLink(rawAttributes, linkText);
                links.push(parsedLink);
            } catch (error: any) {
                console.error(`RobustLinksV2: Could not parse robust link for href "${href || 'N/A'}". Error: ${error.message}`);
                // Continue to the next link
            }
        });

        return links;
    }

    /**
     * Generates an HTML <a> tag string for a given ParsedRobustLink object.
     * This can be used to programmatically create Robust Links for insertion into the DOM.
     * @param parsedLink The ParsedRobustLink object to convert into HTML.
     * @returns A string representing the HTML <a> tag.
     */
    public createRobustLinkHtml(parsedLink: ParsedRobustLink): string {
        // Format versionDate to YYYY-MM-DD for data-versiondate attribute
        // Note: Date.toISOString() gives YYYY-MM-DDTHH:mm:ss.sssZ, we only want the date part.
        const versionDateStr = parsedLink.versionDate.toISOString().split('T')[0];

        let versionUrlAttr = '';
        if (parsedLink.versionSnapshots && parsedLink.versionSnapshots.length > 0) {
            // Format versionSnapshots into the space-separated string for data-versionurl
            const snapshotParts = parsedLink.versionSnapshots.map(s => {
                // Encode URI components to ensure valid HTML attribute value, especially if URIs contain spaces or special chars
                return `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`;
            });
            versionUrlAttr = ` data-versionurl="${snapshotParts.join(' ')}"`;
        }

        // Use linkText if provided, otherwise default to href
        const linkText = parsedLink.linkText || parsedLink.href;

        // Construct the HTML string. Ensure attributes are properly quoted.
        return `<a href="${parsedLink.href}" data-originalurl="${parsedLink.originalUrl}" data-versiondate="${versionDateStr}"${versionUrlAttr}>${linkText}</a>`;
    }

    /**
     * Determines if a given URL is considered an "archive URL" based on predefined patterns.
     * This uses the `isKnownArchive` exclusion rule.
     * @param url The URL to check.
     * @returns True if the URL matches a known archive pattern, false otherwise.
     */
    public isArchiveUrl(url: string): boolean {
        return this.exclusions.isKnownArchive(url);
    }

    /**
     * Updates an existing HTML <a> element to become a Robust Link by setting
     * its data-originalurl, data-versiondate, and optionally data-versionurl attributes.
     * It can also optionally update the href attribute.
     *
     * @param anchorElement The HTMLAnchorElement to update.
     * @param options An object containing the necessary data to make the link robust.
     * - originalUrl: The URI of the resource that motivates the Robust Link. Must be absolute.
     * - versionDate: The intended linking datetime.
     * - versionSnapshots: Optional array of parsed snapshot URIs and their datetimes.
     * - newHref: Optional string to set as the new href attribute for the anchor.
     * @throws {Error} if inputs are invalid or required data is missing.
     */
    public updateAnchorToRobustLink(
        anchorElement: HTMLAnchorElement,
        options: {
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkSnapshot[];
            newHref?: string;
        }
    ): void {
        if (!anchorElement || !(anchorElement instanceof HTMLAnchorElement)) {
            throw new Error("Invalid anchorElement provided. Must be an HTMLAnchorElement.");
        }
        if (!RobustLinksV2.isValidAbsoluteUrl(options.originalUrl)) {
            throw new Error(`Invalid originalUrl: "${options.originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        }
        if (!(options.versionDate instanceof Date) || isNaN(options.versionDate.getTime())) {
            throw new Error("Invalid versionDate provided. Must be a valid Date object.");
        }

        anchorElement.setAttribute('data-originalurl', options.originalUrl);

        // Format versionDate to YYYY-MM-DD for data-versiondate attribute
        const versionDateStr = options.versionDate.toISOString().split('T')[0];
        anchorElement.setAttribute('data-versiondate', versionDateStr);

        if (options.versionSnapshots && options.versionSnapshots.length > 0) {
            const snapshotParts = options.versionSnapshots.map(s => `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`);
            anchorElement.setAttribute('data-versionurl', snapshotParts.join(' '));
        } else {
            anchorElement.removeAttribute('data-versionurl');
        }

        if (options.newHref) {
            if (RobustLinksV2.isValidAbsoluteUrl(options.newHref)) {
                anchorElement.setAttribute('href', options.newHref);
            } else {
                this.logDebug(`RobustLinksV2: newHref "${options.newHref}" is not a valid absolute HTTP/HTTPS URL. Href not updated.`);
            }
        }

        this.logDebug(`RobustLinksV2: Updated <a> tag with href "${anchorElement.href}" to robust link.`);
    }

    /**
     * Iterates through all <a> tags matching a given CSS selector and transforms them
     * into robust links using data provided by a callback function.
     *
     * @param selector The CSS selector string (e.g., 'a', 'a.my-class') to select elements.
     * @param dataProducer A callback function that receives each HTMLAnchorElement and its
     * index, and returns an object containing the originalUrl, versionDate,
     * and optional versionSnapshots and newHref for that link.
     * If the function returns null or undefined, the link is skipped.
     * @param rootElement The HTML element to search within. Defaults to `document.body`.
     * @returns An array of HTMLAnchorElements that were successfully made robust.
     */
    public makeAllLinksRobust(
        selector: string,
        dataProducer: (anchor: HTMLAnchorElement, index: number) => {
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkSnapshot[];
            newHref?: string;
        } | null | undefined,
        rootElement?: HTMLElement
    ): HTMLAnchorElement[] {
        this.logDebug(`RobustLinksV2: Attempting to make all links matching selector "${selector}" robust.`);
        const updatedLinks: HTMLAnchorElement[] = [];
        const scope = rootElement || document.body;
        const anchorElements = scope.querySelectorAll<HTMLAnchorElement>(selector);

        anchorElements.forEach((anchor, index) => {
            try {
                const linkData = dataProducer(anchor, index);
                if (linkData) {
                    this.updateAnchorToRobustLink(anchor, linkData);
                    updatedLinks.push(anchor);
                } else {
                    this.logDebug(`RobustLinksV2: Skipping link "${anchor.href}" as dataProducer returned null/undefined.`);
                }
            } catch (error: any) {
                console.error(`RobustLinksV2: Error making link with href "${anchor.href}" robust. Error: ${error.message}`);
            }
        });

        this.logDebug(`RobustLinksV2: Successfully made ${updatedLinks.length} links robust.`);
        return updatedLinks;
    }

    // ------ INTERNAL FUNCTIONS --------

    /**
     * Formats a Date object into the 14-digit YYYYMMDDhhmmss UTC string required for Memento URIs.
     * This is a helper for createMementoUri.
     * @param date The Date object to format.
     * @returns A 14-digit datetime string (e.g., "20231026143000").
     */
    private formatDateTime(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    /**
     * Logs a debug message to the console if `this.debug` is true.
     * @param message The message to log.
     * @param optionalParams Optional additional parameters to log.
     */
    private logDebug(message: string, ...optionalParams: any[]): void {
        if (this.debug) {
            console.log(`[${this.NAME} DEBUG] ${message}`, ...optionalParams);
        }
    }


}