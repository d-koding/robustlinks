// robustlinks2.ts
// @author Yorick Chollet <yorick.chollet@gmail.com>
// @author Harihar Shankar <hariharshankar@gmail.com>
// @author Shawn M. Jones <jones.shawn.m@gmail.com>
// @author Dylan O'Connor <dylankconnor@gmail.com>
// @version 3.0.0
// License can be obtained at http://mementoweb.github.io/SiteStory/license.html 

// Determining what is a URL. In this case, either a relative path or a HTTP/HTTPS scheme.

interface RobustLinksConfig {
    id: string;
    urimPattern: string; 
    bannerElementLocation: string;
    bannerLogoLocation: string; 
    showBanner: boolean;
    debug: boolean;
}


class RobustLinksV2 {
    private config: RobustLinksConfig;
    private exclusions: string[];

    /**
     * Creates a new RobustLinks instance with optional configurations.
     * 
     * @param {{id: string, urimPattern: string, bannerElementLocation: string, bannerLogoLocation: string, showBanner: boolean, debug: boolean}} [config]
     * ^^^^^^^^^^^^^^^^^^^^^
     * Configuration options
     */
    constructor(config: RobustLinksConfig) {
        /**
         * Name of the module. 
         * 
         * @type {string}
         */
        
        /**
         * This list includes base URIs of web archives that rewrite memento urls,
         * that already robustify links.
         * 
         * @type {string[]}
         */
        this.exclusions = [
            "https?://web.archive.org/web/*", // Internet Archive
            // "https?://wayback.archive-it.org/11112/*", // PRONI
            "https?://web.archive.bibalex.org/web/*", // Bibliotheca Alexandrina Web Archive
            "https?://www.webarchive.org.uk/wayback/en/archive/*", // UK Web Archive
            "https?://langzeitarchivierung.bib-bvb.de/wayback/*,", // Bayerische Staatsbibliothek 
            "https?://webcitation.org/", // Web Cite
            "https?://webarchive.loc.gov/all/*", // Library of Congress
            "https?://wayback.archive-it.org/all/*", // Archive-It (all collection)
            "https?://wayback.archive-it.org/[0-9]+/*", // Archive-It (any collection), PRONI, NLI
            "https?://webarchive.parliament.uk/[0-9]+/*", // UK Parliament Web Archive (in pywb frame)
            "https?://webarchive.parliament.uk/[0-9]+tf_/*", // UK Parliament Web Archive (outside pywb frame)
            "https?://webarchive.nationalarchives.gov.uk/[0-9]+/*", // UK National Archives Web Archive (in pywb frame)
            "https?://webarchive.nationalarchives.gov.uk/[0-9]+tf_/*", // UK National Archives Web Archive (outside pywb frame)
            "https?://archive.li/*", // Archive.Today
            "https?://archive.vn/*", // Archive.Today
            "https?://archive.fo/*", // Archive.Today
            "https?://archive.md/*", // Archive.Today
            "https?://archive.ph/*", // Archive.Today
            "https?://archive.today/*", // Archive.Today
            "https?://archive.is/*", // Archive.Today
            "https?://waext.banq.qc.ca/wayback/[0-9]+/*", // Bibliothèque et Archives nationale du Québec
            "https?://haw.nsk.hr/arhiva/*", // Croatian Web Archive
            "https?://wayback.webarchiv.cz/wayback/[0-9]+/*", // Webarchiv (the Museum of Czech web)
            "https?://wayback.vefsafn.is/wayback/[0-9]+/*", // Icelandic Web Archive
            "https?://arquivo.pt/wayback/[0-9]+/*", // Arquivo.pt
            "https?://arquivo.pt/wayback/[0-9]+if_/*", // Arquivo.pt (outside pywb frame)
            "https?://perma-archives.org/warc/[0-9]+/*", // Perma.cc (datetime in URI-M)
            "https?://perma.cc/[0-9A-Z]{4}-[0-9A-Z]{4}/*", // Perma.cc (identifier in URI-M)
            "https?://wayback.padicat.cat/wayback/[0-9]+/*", // Catalonia Archive
            "https?://archive.aueb.gr/services/web/[0-9]+/*", // Athens University of Economics and Business (AUEB)
            "https?://digital.library.yorku.ca/wayback/[0-9]+/*", // York University Libraries
            "https?://veebiarhiiv.digar.ee/a/[0-9]+/*", // Estonian Archive
            // "https?://wayback.archive-it.org/10702/*", // National Library of Ireland
            "https?://webarchive.nrscotland.gov.uk/[0-9]+/*", // National Records of Scotland
            "https?://nukrobia.nuk.uni-lj.si:8080/wayback/[0-9]+/*", // Slovenian Archive
            "https?://swap.stanford.edu/[0-9]+/*" // Stanford Web Archive
        ]

        /**
         * 
         * 
         */
        this.config = config;
    }

    /**
     * Checks if a string is a valid absolute HTTP or HTTPS URL.
     * This method is marked as `static` because it doesn't depend on any instance properties
     * and can be called directly on the class (e.g., `RobustLinksV2.isValidAbsoluteUrl(...)`).
     *
     * @param url The string to validate.
     * @returns True if it's a valid absolute HTTP/HTTPS URL, false otherwise.
     */
    private static isValidAbsoluteUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            // Ensure it's http or https protocol and has a non-empty hostname
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.length > 0;
        } catch (e) {
            // If URL constructor throws an error, it's not a valid URL
            return false;
        }
    }



}