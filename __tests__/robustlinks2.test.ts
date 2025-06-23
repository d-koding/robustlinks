import { RobustLinksV2, ParsedRobustLink, RobustLinkRawAttributes } from '../robustlinks2'; // Adjust the path if needed

describe('RobustLinksV2', () => {
    let robustLinks: RobustLinksV2;

    beforeEach(() => {
        // Initialize a new instance before each test to ensure isolation
        robustLinks = new RobustLinksV2();
    });

    // --- Constructor and Configuration Tests ---
    test('should initialize with default id and version', () => {
        expect(robustLinks.id).toBe('RobustLinksV2:3.0.0');
    });

    test('should initialize with default urimPattern based on self.location.origin', () => {
        // Mock self.location.origin for consistent testing in Node.js environment
        const originalSelf = globalThis.self;
        // @ts-ignore
        globalThis.self = { location: { origin: 'http://localhost' } };
        const instanceWithMockOrigin = new RobustLinksV2();
        expect(instanceWithMockOrigin.urimPattern).toBe('http://localhost/memento/<datetime>/<urir>');
        globalThis.self = originalSelf; // Restore original self
    });

    test('should allow overriding urimPattern via config', () => {
        const config = { urimPattern: 'http://example.com/custom/<datetime>/<urir>' };
        const customRobustLinks = new RobustLinksV2(config);
        expect(customRobustLinks.urimPattern).toBe('http://example.com/custom/<datetime>/<urir>');
    });

    test('should initialize debug to false by default', () => {
        expect(robustLinks.debug).toBe(false);
    });

    test('should allow enabling debug via config', () => {
        const config = { debug: true };
        const debugRobustLinks = new RobustLinksV2(config);
        expect(debugRobustLinks.debug).toBe(true);
    });

    // --- Static Method: isValidAbsoluteUrl Tests ---
    describe('RobustLinksV2.isValidAbsoluteUrl', () => {
        test('should return true for valid HTTP URLs', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('http://example.com')).toBe(true);
            expect(RobustLinksV2.isValidAbsoluteUrl('http://www.example.com/path/to/page?query=1#hash')).toBe(true);
        });

        test('should return true for valid HTTPS URLs', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('https://example.com')).toBe(true);
            expect(RobustLinksV2.isValidAbsoluteUrl('https://sub.domain.co.uk/')).toBe(true);
        });

        test('should return false for relative URLs', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('/path/to/resource')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('relative/path.html')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('index.html')).toBe(false);
        });

        test('should return false for URLs with invalid protocols', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('ftp://example.com')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('mailto:test@example.com')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('javascript:alert(1)')).toBe(false);
        });

        test('should return false for malformed URLs', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('not-a-url')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl(' ')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('http://')).toBe(false); // No hostname
            expect(RobustLinksV2.isValidAbsoluteUrl('://example.com')).toBe(false);
        });
    });

    // --- Static Method: parseDatetime Tests ---
    describe('RobustLinksV2.parseDatetime', () => {
        test('should parse ISO8601 date (YYYY-MM-DD) to noon UTC', () => {
            const dateStr = '2023-01-15';
            const expectedDate = new Date(Date.UTC(2023, 0, 15, 12, 0, 0, 0));
            expect(RobustLinksV2.parseDatetime(dateStr)).toEqual(expectedDate);
        });

        test('should parse ISO8601 datetime (YYYY-MM-DDThh:mm:ssZ) to UTC', () => {
            const datetimeStr = '2023-01-15T14:30:00Z';
            const expectedDate = new Date(Date.UTC(2023, 0, 15, 14, 30, 0, 0));
            expect(RobustLinksV2.parseDatetime(datetimeStr)).toEqual(expectedDate);
        });

        test('should parse Web Archive URI date (YYYYMMDD) to noon UTC', () => {
            const dateStr = '20221123';
            const expectedDate = new Date(Date.UTC(2022, 10, 23, 12, 0, 0, 0));
            expect(RobustLinksV2.parseDatetime(dateStr)).toEqual(expectedDate);
        });

        test('should parse Web Archive URI datetime (YYYYMMDDhhmmss) to UTC', () => {
            const datetimeStr = '20221123100530';
            const expectedDate = new Date(Date.UTC(2022, 10, 23, 10, 5, 30, 0));
            expect(RobustLinksV2.parseDatetime(datetimeStr)).toEqual(expectedDate);
        });

        test('should return null for invalid date formats', () => {
            expect(RobustLinksV2.parseDatetime('2023/01/15')).toBeNull();
            expect(RobustLinksV2.parseDatetime('2023-1-1')).toBeNull();
            expect(RobustLinksV2.parseDatetime('invalid-date')).toBeNull();
            expect(RobustLinksV2.parseDatetime('')).toBeNull();
            expect(RobustLinksV2.parseDatetime('2023-01-15T14:30:00')).toBeNull(); // Missing Z
        });
    });

    // --- Static Method: parseVersionUrl Tests ---
    describe('RobustLinksV2.parseVersionUrl', () => {
        test('should return an empty array for undefined or empty string', () => {
            expect(RobustLinksV2.parseVersionUrl(undefined)).toEqual([]);
            expect(RobustLinksV2.parseVersionUrl('')).toEqual([]);
            expect(RobustLinksV2.parseVersionUrl(' ')).toEqual([]);
        });

        test('should parse single URI snapshot', () => {
            const versionUrl = 'http://snapshot.com/snap1';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([{ uri: 'http://snapshot.com/snap1' }]);
        });

        test('should parse single URI with datetime snapshot', () => {
            const versionUrl = 'http://snapshot.com/snap1 20230101000000';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://snapshot.com/snap1', datetime: '20230101000000' }
            ]);
        });

        test('should parse multiple URI snapshots', () => {
            const versionUrl = 'http://snapshot.com/snap1 http://snapshot.com/snap2';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://snapshot.com/snap1' },
                { uri: 'http://snapshot.com/snap2' }
            ]);
        });

        test('should parse multiple URI with datetime snapshots', () => {
            const versionUrl = 'http://snapshot.com/snap1 20230101000000 http://snapshot.com/snap2 20230202120000';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://snapshot.com/snap1', datetime: '20230101000000' },
                { uri: 'http://snapshot.com/snap2', datetime: '20230202120000' }
            ]);
        });

        test('should handle mixed URI and URI-datetime snapshots', () => {
            const versionUrl = 'http://snapshot.com/snap1 20230101000000 http://snapshot.com/snap2 http://snapshot.com/snap3 20230303000000';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://snapshot.com/snap1', datetime: '20230101000000' },
                { uri: 'http://snapshot.com/snap2' },
                { uri: 'http://snapshot.com/snap3', datetime: '20230303000000' }
            ]);
        });

        test('should skip invalid URIs and log a warning', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const versionUrl = 'http://valid.com/snap1 invalid-uri http://valid.com/snap2';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://valid.com/snap1' },
                { uri: 'http://valid.com/snap2' }
            ]);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                `RobustLinksV2: Skipping invalid URI in data-versionurl: "invalid-uri"`
            );
            consoleWarnSpy.mockRestore();
        });

        test('should skip datetime if not associated with a valid URI or if URI is invalid', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const versionUrl = '20230101000000 http://valid.com/snap1'; // Datetime without preceding valid URI
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://valid.com/snap1' }
            ]);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                `RobustLinksV2: Skipping invalid URI in data-versionurl: "20230101000000"`
            );
            consoleWarnSpy.mockRestore();
        });

        test('should handle extra spaces correctly', () => {
            const versionUrl = '  http://snap1.com  20230101000000   http://snap2.com  ';
            expect(RobustLinksV2.parseVersionUrl(versionUrl)).toEqual([
                { uri: 'http://snap1.com', datetime: '20230101000000' },
                { uri: 'http://snap2.com' }
            ]);
        });
    });

    // --- parseRobustLink Tests ---
    describe('parseRobustLink', () => {
        const validRawAttributes: RobustLinkRawAttributes = {
            href: 'http://example.com/current',
            'data-originalurl': 'http://original.com/page',
            'data-versiondate': '2023-01-01T12:00:00Z',
            'data-versionurl': 'http://archive.org/snapshot1 20230101000000 http://archive.org/snapshot2'
        };

        test('should parse a complete and valid robust link', () => {
            const parsed = robustLinks.parseRobustLink(validRawAttributes, 'Link Text');
            expect(parsed).toEqual({
                href: 'http://example.com/current',
                originalUrl: 'http://original.com/page',
                versionDate: new Date(Date.UTC(2023, 0, 1, 12, 0, 0)),
                versionSnapshots: [
                    { uri: 'http://archive.org/snapshot1', datetime: '20230101000000' },
                    { uri: 'http://archive.org/snapshot2' }
                ],
                linkText: 'Link Text'
            });
        });

        test('should default data-originalurl to href if missing', () => {
            const attributes: RobustLinkRawAttributes = {
                href: 'http://example.com/current',
                'data-versiondate': '2023-01-01'
            };
            const parsed = robustLinks.parseRobustLink(attributes);
            expect(parsed.originalUrl).toBe(attributes.href);
        });

        test('should throw error if href is missing', () => {
            const attributes = { ...validRawAttributes, href: '' };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow("Robust Link parsing failed: 'href' attribute is missing and required.");
        });

        test('should throw error if data-originalurl is missing and href is not absolute', () => {
            const attributes: RobustLinkRawAttributes = {
                href: '/relative/path', // Not absolute
                'data-versiondate': '2023-01-01'
            };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow("Invalid href: \"/relative/path\" is not an absolute URI.");
        });

        test('should throw error if data-versiondate is missing', () => {
            const attributes = { ...validRawAttributes, 'data-versiondate': undefined };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow("Robust Link parsing failed: 'data-versiondate' attribute is missing and required.");
        });

        test('should throw error for invalid href', () => {
            const attributes = { ...validRawAttributes, href: 'invalid-url' };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow('Invalid href: "invalid-url" is not an absolute URI.');
        });

        test('should throw error for invalid data-originalurl', () => {
            const attributes = { ...validRawAttributes, 'data-originalurl': 'invalid-original-url' };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow('Invalid data-originalurl: "invalid-original-url" is not an absolute URI.');
        });

        test('should throw error for invalid data-versiondate format', () => {
            const attributes = { ...validRawAttributes, 'data-versiondate': '2023/01/01' };
            expect(() => robustLinks.parseRobustLink(attributes)).toThrow(/Invalid data-versiondate format:/);
        });

        test('should handle missing data-versionurl gracefully', () => {
            const attributes = { ...validRawAttributes, 'data-versionurl': undefined };
            const parsed = robustLinks.parseRobustLink(attributes);
            expect(parsed.versionSnapshots).toEqual([]);
        });

        test('should include linkText if provided', () => {
            const parsed = robustLinks.parseRobustLink(validRawAttributes, 'My Link');
            expect(parsed.linkText).toBe('My Link');
        });

        test('should set linkText to undefined if not provided', () => {
            const parsed = robustLinks.parseRobustLink(validRawAttributes);
            expect(parsed.linkText).toBeUndefined();
        });

        test('should log debug message when data-originalurl is defaulted if debug is true', () => {
            const debugRobustLinks = new RobustLinksV2({ debug: true });
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            const attributes: RobustLinkRawAttributes = {
                href: 'http://example.com/current',
                'data-versiondate': '2023-01-01'
            };
            debugRobustLinks.parseRobustLink(attributes);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                `[RobustLinksV2 DEBUG] RobustLinksV2: data-originalurl missing, defaulting to href: http://example.com/current`
            );
            consoleLogSpy.mockRestore();
        });
    });

    // --- findAndParseRobustLinks Tests ---
    describe('findAndParseRobustLinks', () => {
        let originalDocument: Document;

        beforeAll(() => {
            // Mock the DOM for testing in Node.js
            // You might need a more sophisticated JSDOM setup for complex DOM interactions
            originalDocument = globalThis.document;
            globalThis.document = {
                body: {} as HTMLElement, // Mock body
                // Mock querySelectorAll to return a NodeList of mock elements
                querySelectorAll: jest.fn().mockReturnValue([])
            } as any;
        });

        afterAll(() => {
            globalThis.document = originalDocument; // Restore original document
        });

        beforeEach(() => {
            jest.clearAllMocks(); // Clear mocks before each test
            // Reset the body element for each test
            globalThis.document.body = {
                querySelectorAll: jest.fn().mockReturnValue([])
            } as any;
        });

        test('should return an empty array if no robust links are found', () => {
            expect(robustLinks.findAndParseRobustLinks()).toEqual([]);
            expect(document.body.querySelectorAll).toHaveBeenCalledWith('a[data-originalurl][data-versiondate]');
        });

        test('should parse a single valid robust link', () => {
            const mockAnchorElement = {
                getAttribute: jest.fn((attr: string) => {
                    switch (attr) {
                        case 'href': return 'http://example.com/valid';
                        case 'data-originalurl': return 'http://original.com/valid';
                        case 'data-versiondate': return '2023-01-01';
                        case 'data-versionurl': return 'http://snap.com/1';
                        default: return null;
                    }
                }),
                textContent: 'Valid Link Text'
            };

            // Mock document.body.querySelectorAll to return our mock element
            (document.body.querySelectorAll as jest.Mock).mockReturnValue([mockAnchorElement]);

            const parsedLinks = robustLinks.findAndParseRobustLinks();
            expect(parsedLinks.length).toBe(1);
            expect(parsedLinks[0].href).toBe('http://example.com/valid');
            expect(parsedLinks[0].originalUrl).toBe('http://original.com/valid');
            expect(parsedLinks[0].versionDate).toEqual(new Date(Date.UTC(2023, 0, 1, 12, 0, 0)));
            expect(parsedLinks[0].versionSnapshots).toEqual([{ uri: 'http://snap.com/1' }]);
            expect(parsedLinks[0].linkText).toBe('Valid Link Text');
        });

        test('should skip invalid robust links and log an error', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const mockInvalidAnchorElement = {
                getAttribute: jest.fn((attr: string) => {
                    switch (attr) {
                        case 'href': return 'invalid-href'; // Invalid URL
                        case 'data-originalurl': return 'http://original.com/valid';
                        case 'data-versiondate': return '2023-01-01';
                        default: return null;
                    }
                }),
                textContent: 'Invalid Link'
            };

            const mockValidAnchorElement = {
                getAttribute: jest.fn((attr: string) => {
                    switch (attr) {
                        case 'href': return 'http://valid.com/page';
                        case 'data-originalurl': return 'http://original.com/page';
                        case 'data-versiondate': return '2024-01-01';
                        default: return null;
                    }
                }),
                textContent: 'Another Valid Link'
            };

            (document.body.querySelectorAll as jest.Mock).mockReturnValue([mockInvalidAnchorElement, mockValidAnchorElement]);

            const parsedLinks = robustLinks.findAndParseRobustLinks();
            expect(parsedLinks.length).toBe(1);
            expect(parsedLinks[0].href).toBe('http://valid.com/page');
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'RobustLinksV2: Could not parse robust link for href "invalid-href". Error: Invalid href: "invalid-href" is not an absolute URI.'
            );
            consoleErrorSpy.mockRestore();
        });

        test('should use a provided rootElement for searching', () => {
            const mockRootElement = {
                querySelectorAll: jest.fn().mockReturnValue([])
            } as any;

            robustLinks.findAndParseRobustLinks(mockRootElement);
            expect(mockRootElement.querySelectorAll).toHaveBeenCalledWith('a[data-originalurl][data-versiondate]');
            // Ensure document.body.querySelectorAll was NOT called if rootElement is provided
            expect(document.body.querySelectorAll).not.toHaveBeenCalled();
        });
    });


    // --- createRobustLinkHtml Tests ---
    describe('createRobustLinkHtml', () => {
        const baseParsedLink: ParsedRobustLink = {
            href: 'http://example.com/current',
            originalUrl: 'http://original.com/page',
            versionDate: new Date(Date.UTC(2023, 0, 1, 12, 0, 0)), // Noon UTC
            versionSnapshots: [],
            linkText: 'My Robust Link'
        };

        test('should create HTML with basic attributes and link text', () => {
            const html = robustLinks.createRobustLinkHtml(baseParsedLink);
            expect(html).toBe('<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01">My Robust Link</a>');
        });

        test('should use href as link text if linkText is undefined', () => {
            const linkWithoutText = { ...baseParsedLink, linkText: undefined };
            const html = robustLinks.createRobustLinkHtml(linkWithoutText);
            expect(html).toBe('<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01">http://example.com/current</a>');
        });

        test('should use href as link text if linkText is an empty string', () => {
            const linkWithoutText = { ...baseParsedLink, linkText: '' };
            const html = robustLinks.createRobustLinkHtml(linkWithoutText);
            expect(html).toBe('<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01">http://example.com/current</a>');
        });

        test('should include data-versionurl for single snapshot (URI only)', () => {
            const linkWithSnapshot: ParsedRobustLink = {
                ...baseParsedLink,
                versionSnapshots: [{ uri: 'http://archive.org/snap1' }]
            };
            const html = robustLinks.createRobustLinkHtml(linkWithSnapshot);
            expect(html).toBe('<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01" data-versionurl="http://archive.org/snap1">My Robust Link</a>');
        });

        test('should include data-versionurl for single snapshot (URI with datetime)', () => {
            const linkWithSnapshot: ParsedRobustLink = {
                ...baseParsedLink,
                versionSnapshots: [{ uri: 'http://archive.org/snap1', datetime: '20230101120000' }]
            };
            const html = robustLinks.createRobustLinkHtml(linkWithSnapshot);
            expect(html).toBe('<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01" data-versionurl="http://archive.org/snap1 20230101120000">My Robust Link</a>');
        });

        test('should include data-versionurl for multiple snapshots', () => {
            const linkWithSnapshots: ParsedRobustLink = {
                ...baseParsedLink,
                versionSnapshots: [
                    { uri: 'http://archive.org/snap1', datetime: '20230101000000' },
                    { uri: 'http://archive.org/snap2' },
                    { uri: 'http://archive.org/snap3', datetime: '20230102123000' }
                ]
            };
            const html = robustLinks.createRobustLinkHtml(linkWithSnapshots);
            expect(html).toBe(
                '<a href="http://example.com/current" data-originalurl="http://original.com/page" data-versiondate="2023-01-01" data-versionurl="http://archive.org/snap1 20230101000000 http://archive.org/snap2 http://archive.org/snap3 20230102123000">My Robust Link</a>'
            );
        });

        test('should handle special characters in URIs by default (not explicitly encoded in this method)', () => {
            // Note: The createRobustLinkHtml method itself does not perform URI encoding.
            // It's assumed the URIs in ParsedRobustLink are already suitable for HTML attributes or will be handled by the browser.
            const linkWithSpecialChars: ParsedRobustLink = {
                ...baseParsedLink,
                href: 'http://example.com/path with spaces?q=test&amp;',
                originalUrl: 'http://original.com/path with spaces?q=test&amp;',
                versionSnapshots: [{ uri: 'http://archive.org/snap/with/spaces and &' }]
            };
            const html = robustLinks.createRobustLinkHtml(linkWithSpecialChars);
            expect(html).toBe(
                '<a href="http://example.com/path with spaces?q=test&amp;" data-originalurl="http://original.com/path with spaces?q=test&amp;" data-versiondate="2023-01-01" data-versionurl="http://archive.org/snap/with/spaces and &">My Robust Link</a>'
            );
        });
    });

    // --- isArchiveUrl Tests ---
    describe('isArchiveUrl', () => {
        test('should return true for known web.archive.org URLs', () => {
            expect(robustLinks.isArchiveUrl('http://web.archive.org/web/20230101120000/http://example.com')).toBe(true);
            expect(robustLinks.isArchiveUrl('https://web.archive.org/web/http://example.com')).toBe(true);
        });

        test('should return true for known archive.is URLs', () => {
            expect(robustLinks.isArchiveUrl('http://archive.is/example.com')).toBe(true);
            expect(robustLinks.isArchiveUrl('https://archive.fo/abc')).toBe(true);
            expect(robustLinks.isArchiveUrl('https://archive.md/123')).toBe(true);
        });

        test('should return true for known Perma.cc URLs', () => {
            expect(robustLinks.isArchiveUrl('https://perma.cc/ABCD-EFGH/')).toBe(true);
            expect(robustLinks.isArchiveUrl('http://perma-archives.org/warc/12345/')).toBe(true);
        });

        test('should return true for other specified archive patterns', () => {
            expect(robustLinks.isArchiveUrl('https://wayback.archive-it.org/all/http://example.com')).toBe(true);
            expect(robustLinks.isArchiveUrl('http://webarchive.nationalarchives.gov.uk/20230101/http://example.com')).toBe(true);
            expect(robustLinks.isArchiveUrl('https://arquivo.pt/wayback/20230101120000/http://example.com')).toBe(true);
        });

        test('should return false for non-archive URLs', () => {
            expect(robustLinks.isArchiveUrl('http://example.com')).toBe(false);
            expect(robustLinks.isArchiveUrl('https://google.com')).toBe(false);
            expect(robustLinks.isArchiveUrl('http://mysite.com/archive')).toBe(false);
        });

        test('should handle variations in protocol (http vs https) correctly', () => {
            expect(robustLinks.isArchiveUrl('http://web.archive.org/web/')).toBe(true);
            expect(robustLinks.isArchiveUrl('https://web.archive.org/web/')).toBe(true);
        });
    });
});