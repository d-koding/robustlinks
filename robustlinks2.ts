// robustlinks2.ts
// @author Yorick Chollet <yorick.chollet@gmail.com>
// @author Harihar Shankar <hariharshankar@gmail.com>
// @author Shawn M. Jones <jones.shawn.m@gmail.com>
// @author Dylan O'Connor <dylankconnor@gmail.com>
// @version 3.0.0
// License can be obtained at http://mementoweb.github.io/SiteStory/license.html 

// Determining what is a URL. In this case, either a relative path or a HTTP/HTTPS scheme.

interface RobustLinksConfig {
    // --TODO-- Add appropriate properties here, for example:
    // baseUrl: string;
    // enableLogging?: boolean;
}

class RobustLinksV2 {
    private config: RobustLinksConfig;

    constructor(config: RobustLinksConfig) {
        this.config = config;
    }

    

}