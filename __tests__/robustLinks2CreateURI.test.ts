import { RobustLinksV2 } from '../robustlinks2'; // Adjust the path if needed

describe('RobustLinksV2 - createMementoUri', () => {
    let robustLinks: RobustLinksV2;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    // Store original globalThis.self to restore after tests
    const originalSelf = globalThis.self;

    beforeEach(() => {
        // Mock self.location.origin for consistent testing, as urimPattern defaults to it.
        // @ts-ignore - TS might complain about modifying globalThis.self
        globalThis.self = { location: { origin: 'http://localhost:8080' } };
        robustLinks = new RobustLinksV2();

        // Spy on console.log and console.error to check debug output and errors
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore original globalThis.self
        globalThis.self = originalSelf;
        // Restore console spies
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('should generate a correct Memento URI for a simple original URL and datetime', () => {
        const originalUrl = 'http://example.com/document.html';
        const dateTime = new Date(Date.UTC(2023, 4, 15, 12, 30, 45)); // May 15, 2023 12:30:45 UTC
        const expectedUri = 'http://localhost:8080/memento/20230515123045/http://example.com/document.html';

        const result = robustLinks.createMementoUri(originalUrl, dateTime);
        expect(result).toBe(expectedUri);
    });

    test('should generate a correct Memento URI for an original URL with query parameters and hash', () => {
        const originalUrl = 'https://www.test-site.org/page?id=123&name=value#section-anchor';
        const dateTime = new Date(Date.UTC(2024, 0, 1, 0, 0, 0)); // January 1, 2024 00:00:00 UTC
        const expectedUri = 'http://localhost:8080/memento/20240101000000/https://www.test-site.org/page?id=123&name=value#section-anchor';

        const result = robustLinks.createMementoUri(originalUrl, dateTime);
        expect(result).toBe(expectedUri);
    });

    test('should generate a correct Memento URI when urimPattern is customized', () => {
        const customRobustLinks = new RobustLinksV2({
            urimPattern: 'https://myarchive.net/timegate/<datetime>/resource/<urir>'
        });
        const originalUrl = 'http://custom.example.com/resource';
        const dateTime = new Date(Date.UTC(2022, 11, 31, 23, 59, 59)); // Dec 31, 2022 23:59:59 UTC
        const expectedUri = 'https://myarchive.net/timegate/20221231235959/resource/http://custom.example.com/resource';

        const result = customRobustLinks.createMementoUri(originalUrl, dateTime);
        expect(result).toBe(expectedUri);
    });

    test('should throw an error if originalUrl is not a valid absolute HTTP/HTTPS URL', () => {
        const invalidUrl = 'not-a-valid-url';
        const dateTime = new Date(); // Any date
        expect(() => {
            robustLinks.createMementoUri(invalidUrl, dateTime);
        }).toThrow('Invalid originalUrl: "not-a-valid-url" is not an absolute HTTP/HTTPS URI.');
    });

    test('should throw an error if originalUrl is a relative URL', () => {
        const relativeUrl = '/some/path/document.pdf';
        const dateTime = new Date(); // Any date
        expect(() => {
            robustLinks.createMementoUri(relativeUrl, dateTime);
        }).toThrow('Invalid originalUrl: "/some/path/document.pdf" is not an absolute HTTP/HTTPS URI.');
    });

    test('should throw an error for a non-HTTP/HTTPS protocol in originalUrl', () => {
        const ftpUrl = 'ftp://data.example.com/file.zip';
        const dateTime = new Date(); // Any date
        expect(() => {
            robustLinks.createMementoUri(ftpUrl, dateTime);
        }).toThrow('Invalid originalUrl: "ftp://data.example.com/file.zip" is not an absolute HTTP/HTTPS URI.');
    });

    test('should log debug message when URI is created if debug is true', () => {
        const debugRobustLinks = new RobustLinksV2({ debug: true });
        const originalUrl = 'http://debug.example.com/test';
        const dateTime = new Date(Date.UTC(2023, 0, 1, 0, 0, 0)); // Jan 1, 2023 00:00:00 UTC

        debugRobustLinks.createMementoUri(originalUrl, dateTime);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining(`[RobustLinksV2 DEBUG] RobustLinksV2: Created Memento URI: http://localhost:8080/memento/20230101000000/http://debug.example.com/test for originalUrl: http://debug.example.com/test at datetime: 2023-01-01T00:00:00.000Z`)
        );
    });

    test('should log debug message when originalUrl is invalid if debug is true', () => {
        const debugRobustLinks = new RobustLinksV2({ debug: true });
        const invalidUrl = 'bad-input';
        const dateTime = new Date();

        try {
            debugRobustLinks.createMementoUri(invalidUrl, dateTime);
        } catch (e) {
            // Expected to throw, so catch it to allow assertion on log spy
        }

        expect(consoleLogSpy).toHaveBeenCalledWith(
            `[RobustLinksV2 DEBUG] RobustLinksV2: originalUrl "bad-input" is not a valid absolute HTTP/HTTPS URL for Memento URI creation.`
        );
        // Ensure error was also thrown
        expect(() => debugRobustLinks.createMementoUri(invalidUrl, dateTime)).toThrow();
    });

    test('should not log debug message when debug is false', () => {
        robustLinks.debug = false; // Ensure debug is off
        const originalUrl = 'http://no-debug.com';
        const dateTime = new Date();

        robustLinks.createMementoUri(originalUrl, dateTime);

        expect(consoleLogSpy).not.toHaveBeenCalled();
    });
});