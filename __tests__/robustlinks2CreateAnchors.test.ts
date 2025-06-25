import { RobustLinksV2, RobustLinkSnapshot } from '../robustlinks2'; // Adjust path if needed

// --- Mocks for DOM elements and global objects ---

// Mock the global URL object to control isValidAbsoluteUrl behavior
const mockUrlConstructor = jest.fn((url) => {
    // Simulate valid HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = {
            protocol: url.split(':')[0] + ':',
            hostname: url.split('//')[1].split('/')[0]
        };
        // For testing invalid URLs specifically
        if (url === 'http://invalid-hostname/') {
            parsed.hostname = ''; // Simulate invalid hostname
        }
        return parsed;
    }
    // Simulate invalid URLs
    throw new Error('Invalid URL');
});
// Assign the mock URL to the global object before RobustLinksV2 is imported/instantiated
// This is crucial because RobustLinksV2.isValidAbsoluteUrl uses `new URL()`
// @ts-ignore - TS might complain about overriding global URL
global.URL = mockUrlConstructor;

// --- More robust mocks for HTMLAnchorElement and HTMLElement for `instanceof` checks ---
// These are necessary because Jest's default 'node' environment doesn't provide browser globals.

// Mock HTMLElement first, as HTMLAnchorElement extends it
if (typeof global.HTMLElement === 'undefined') {
    // @ts-ignore - TS might complain about overriding global HTMLElement
    global.HTMLElement = class HTMLElement {};
}

// Mock HTMLAnchorElement constructor, extending HTMLElement
if (typeof global.HTMLAnchorElement === 'undefined') {
    // @ts-ignore - TS might complain about overriding global HTMLAnchorElement
    global.HTMLAnchorElement = class HTMLAnchorElement extends global.HTMLElement {};
}

// Mock for HTMLAnchorElement instance properties and methods
// Note: We remove Partial<HTMLAnchorElement> here and list only the properties we actually mock/define
interface MockAnchorElement {
    attributes: Map<string, string>;
    setAttribute: jest.Mock<any, any>;
    removeAttribute: jest.Mock<any, any>;
    href: string; // Made required as it's always defined by the mock factory
}

// Factory function to create a fresh mock anchor for each test
const createMockAnchor = (initialHref: string = 'http://example.com/initial', initialAttributes: { [key: string]: string } = {}): MockAnchorElement => {
    // Create an instance that correctly inherits from the mocked HTMLAnchorElement's prototype
    // This is crucial for `instanceof` checks to pass.
    const anchor = Object.create(global.HTMLAnchorElement.prototype) as MockAnchorElement;

    // Assign mock methods and properties to the created object
    Object.assign(anchor, {
        attributes: new Map<string, string>(),
        setAttribute: jest.fn(function(this: MockAnchorElement, name: string, value: string) {
            if (name === 'href') {
                // Ensure the `href` property setter is also called when `setAttribute('href', ...)` is used
                (this as any).href = value;
            }
            this.attributes.set(name, value);
        }),
        removeAttribute: jest.fn(function(this: MockAnchorElement, name: string) {
            this.attributes.delete(name);
        })
    });

    // Define `href` as a property with getter/setter directly on the mock object
    // This correctly simulates how HTML elements behave with `element.href = ...`
    let _internalHref = initialHref;
    Object.defineProperty(anchor, 'href', {
        get() { return _internalHref; },
        set(value: string) { _internalHref = value; },
        configurable: true // Allow redefine in tests if needed
    });


    // Initialize with provided attributes
    for (const key in initialAttributes) {
        anchor.setAttribute(key, initialAttributes[key]);
    }

    return anchor;
};

// Mock console.log for debug output testing
const mockConsoleLog = jest.fn();
global.console.log = mockConsoleLog;

// Mock console.error for expected error logging (if any in the called function)
const mockConsoleError = jest.fn();
global.console.error = mockConsoleError;


// --- Jest Test Suite ---

describe('RobustLinksV2 - updateAnchorToRobustLink', () => {
    let rl: RobustLinksV2;
    let mockAnchor: MockAnchorElement;

    // Reset mocks before each test
    beforeEach(() => {
        rl = new RobustLinksV2({ debug: true });
        mockAnchor = createMockAnchor();
        mockUrlConstructor.mockClear();
        mockConsoleLog.mockClear();
        mockConsoleError.mockClear();
    });

    // Test Case 1: Basic conversion of a simple link
    test('should add data-originalurl and data-versiondate to a simple link', () => {
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date('2023-01-15T12:00:00Z');

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate
        });

        expect(mockAnchor.setAttribute).toHaveBeenCalledWith('data-originalurl', originalUrl);
        expect(mockAnchor.setAttribute).toHaveBeenCalledWith('data-versiondate', '2023-01-15');
        expect(mockAnchor.attributes.get('data-versionurl')).toBeUndefined(); // Should not set if no snapshots
        expect(mockAnchor.removeAttribute).not.toHaveBeenCalledWith('data-versionurl');
        expect(mockAnchor.href).toBe('http://example.com/initial'); // Href should remain unchanged
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Updated <a> tag with href'));
    });

    // Test Case 2: Conversion with newHref
    test('should update href attribute if newHref is provided and valid', () => {
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date('2023-01-15T12:00:00Z');
        const newHref = 'http://new-target.com/robust';

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate,
            newHref
        });

        expect(mockAnchor.setAttribute).toHaveBeenCalledWith('href', newHref);
        expect(mockAnchor.href).toBe(newHref);
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Updated <a> tag with href'));
    });

    // Test Case 3: Conversion with versionSnapshots
    test('should set data-versionurl when versionSnapshots are provided', () => {
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date('2023-01-15T12:00:00Z');
        const snapshots: RobustLinkSnapshot[] = [
            { uri: 'http://archive.com/snap1' },
            { uri: 'http://archive.com/snap2', datetime: '20230115120000' }
        ];

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate,
            versionSnapshots: snapshots
        });

        expect(mockAnchor.setAttribute).toHaveBeenCalledWith('data-versionurl', 'http://archive.com/snap1 http://archive.com/snap2 20230115120000');
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Updated <a> tag with href'));
    });

    // Test Case 4: Ensures data-versionurl is removed if no snapshots are provided but it existed previously
    test('should remove data-versionurl if no versionSnapshots are provided but it existed', () => {
        mockAnchor = createMockAnchor('http://example.com/initial', { 'data-versionurl': 'http://old.archive.com/snap' });

        const originalUrl = 'http://example.com/original';
        const versionDate = new Date('2023-01-15T12:00:00Z');

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate
        });

        expect(mockAnchor.removeAttribute).toHaveBeenCalledWith('data-versionurl');
        expect(mockAnchor.attributes.has('data-versionurl')).toBe(false);
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Updated <a> tag with href'));
    });

    // Test Case 5: Invalid anchorElement (not an HTMLAnchorElement)
    test('should throw an error for invalid anchorElement (not an HTMLAnchorElement)', () => {
        const invalidElement = { tagName: 'DIV', setAttribute: jest.fn(), removeAttribute: jest.fn() };
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date();

        expect(() => rl.updateAnchorToRobustLink(invalidElement as unknown as HTMLAnchorElement, { originalUrl, versionDate }))
            .toThrow("Invalid anchorElement provided. Must be an HTMLAnchorElement.");
    });

    // Test Case 6: Invalid originalUrl (not absolute/HTTP/HTTPS)
    test('should throw an error for invalid originalUrl', () => {
        const originalUrl = 'relative/path'; // Invalid
        const versionDate = new Date();

        // Ensure isValidAbsoluteUrl is mocked to fail for this input
        mockUrlConstructor.mockImplementation((url) => {
            if (url === originalUrl) { throw new Error('Mock invalid URL'); }
            return { protocol: 'http:', hostname: 'valid.com' };
        });

        expect(() => rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, { originalUrl, versionDate }))
            .toThrow(`Invalid originalUrl: "${originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        expect(mockConsoleLog).not.toHaveBeenCalled(); // No debug log if it throws early
    });

    // Test Case 7: Invalid versionDate (not a Date object)
    test('should throw an error for invalid versionDate', () => {
        const originalUrl = 'http://example.com/original';
        const invalidVersionDate: any = 'not-a-date'; // Invalid

        expect(() => rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, { originalUrl, versionDate: invalidVersionDate }))
            .toThrow("Invalid versionDate provided. Must be a valid Date object.");
    });

    // Test Case 8: Invalid newHref (should not update href)
    test('should not update href if newHref is provided but invalid', () => {
        const initialHref = 'http://example.com/initial';
        mockAnchor = createMockAnchor(initialHref);

        const originalUrl = 'http://example.com/original';
        const versionDate = new Date();
        const invalidNewHref = 'relative/new/path'; // Invalid

        // Ensure isValidAbsoluteUrl is mocked to fail for this invalid newHref
        mockUrlConstructor.mockImplementation((url) => {
            if (url === invalidNewHref) { throw new Error('Mock invalid URL'); }
            return { protocol: 'http:', hostname: 'valid.com' };
        });


        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate,
            newHref: invalidNewHref
        });

        expect(mockAnchor.setAttribute).not.toHaveBeenCalledWith('href', invalidNewHref);
        expect(mockAnchor.href).toBe(initialHref); // Href should remain the original
        expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining(`newHref "${invalidNewHref}" is not a valid absolute HTTP/HTTPS URL. Href not updated.`)
        );
    });

    // Test Case 9: Debug logging is active when debug is true
    test('should log debug messages when debug is true', () => {
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date();

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate
        });

        expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining("[RobustLinksV2 DEBUG] RobustLinksV2: Updated <a> tag with href \"http://example.com/initial\" to robust link.")
        );
    });

    // Test Case 10: Debug logging is inactive when debug is false
    test('should not log debug messages when debug is false', () => {
        rl = new RobustLinksV2({ debug: false }); // New instance with debug off
        const originalUrl = 'http://example.com/original';
        const versionDate = new Date();

        rl.updateAnchorToRobustLink(mockAnchor as unknown as HTMLAnchorElement, {
            originalUrl,
            versionDate
        });

        expect(mockConsoleLog).not.toHaveBeenCalled();
    });
});
