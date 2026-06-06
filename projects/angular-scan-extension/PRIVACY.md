# Privacy Policy — Angular Scan

**Last updated:** 2026-06-06

Angular Scan is a developer tool that visualizes which Angular components
re-render on a web page during development. This policy explains exactly what
the extension does and does not do with data.

## Summary

**Angular Scan does not collect, store, transmit, or sell any personal data.**
All processing happens locally in your browser. The extension makes no requests
to any server operated by the developer or any third party.

## What the extension accesses

### Page content (host access)

To do its job, the extension injects its visualization runtime into the page
you are viewing and reads in-memory Angular framework metadata (component names,
render activity). Angular development servers run on arbitrary, unpredictable
hosts and ports (e.g. `localhost`, LAN IP addresses, custom staging domains),
so the extension requests access to all sites. It only activates when an
Angular application running in development mode is detected; on all other pages
the injected code stays inert.

To map a component to its source file and line, the extension may fetch the
**source map files already served by the page's own origin**. These files are
read as text and parsed locally to build a class-name → file/line index. This
data is **never executed** and **never leaves your browser**.

### Local storage

The extension uses `chrome.storage` to remember your preferences:

- Per-origin scan on/off state
- Toolbar HUD / overlay settings

This data is stored locally in your browser only. It is never transmitted.

## What the extension does NOT do

- ❌ No analytics, telemetry, or usage tracking
- ❌ No network requests to the developer or any third party
- ❌ No collection of browsing history, page content, or personal information
- ❌ No remote code — all executable code ships inside the extension package
- ❌ No ads, no data sales, no data sharing

## Permissions justification

| Permission              | Why it is needed                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `storage`               | Persist per-origin scan toggle and HUD settings locally.                                                                    |
| Host access (all sites) | Inject the visualization runtime and read same-origin source maps on any dev host. No browsing data is read or transmitted. |

## Data retention & deletion

The only stored data is your local preferences. Remove it at any time by
clearing the extension's storage or uninstalling the extension. Nothing is
retained anywhere else, because nothing is ever sent anywhere else.

## Contact

Questions about this policy: me@hussein.ee

## Changes

Any future change to this policy will be published at this same URL with an
updated date above.
