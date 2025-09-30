# YouTube Loop Timer

YouTube Loop Timer is a browser extension that allows you to loop a specific section of a YouTube video.

## How it Works

This extension is composed of a content script (`content.js`) that is injected directly into YouTube pages and a popup script (`popup.js`) that controls the user interface.

-   **Content Script (`content.js`)**: This script runs on the YouTube video page. It finds the HTML `<video>` element and attaches event listeners to it. When the video is about to end, the script automatically sets the video's current time back to the user-defined start time, creating a loop. The loop settings for each video are saved in the browser's local storage.

-   **Popup Script (`popup.js`)**: This script manages the extension's popup window. It provides the user interface for setting, using the current time for, and disabling the loop. It communicates with the content script to send the user's commands and to display the current loop status.

## How to Use

1.  Open a YouTube video.
2.  Click on the extension icon to open the popup.
3.  Set the start time for the loop in the "minutes" and "seconds" fields.
4.  Click the "Set Loop" button to start the loop.
5.  To use the current time of the video as the start time, click the "Use Current" button.
6.  To disable the loop, click the "Disable Loop" button.

## Installation

1.  Download the extension files.
2.  Open Firefox and go to `about:debugging`.
3.  Select `This Firefox` -> `Load Temporary Add-on`
4.  Select the `manifest.json` from the files