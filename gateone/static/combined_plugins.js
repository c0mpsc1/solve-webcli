(function(window, undefined) {
var document = window.document; // Have to do this because we're sandboxed

"use strict";

// Useful sandbox-wide stuff
var noop = GateOne.Utils.noop;
var months = {
    '0': 'JAN',
    '1': 'FEB',
    '2': 'MAR',
    '3': 'APR',
    '4': 'MAY',
    '5': 'JUN',
    '6': 'JUL',
    '7': 'AUG',
    '8': 'SEP',
    '9': 'OCT',
    '10': 'NOV',
    '11': 'DEC'
}
// Sandbox-wide shortcuts for each log level (actually assigned in init())
var logFatal = noop;
var logError = noop;
var logWarning = noop;
var logInfo = noop;
var logDebug = noop;

// GateOne.Bookmarks (bookmark management functions)
GateOne.Base.module(GateOne, "Bookmarks", "1.0", ['Base']);
GateOne.Bookmarks.bookmarks = [];
GateOne.Bookmarks.tags = [];
GateOne.Bookmarks.sortToggle = false;
GateOne.Bookmarks.searchFilter = null;
GateOne.Bookmarks.page = 0; // Used to tracking pagination
GateOne.Bookmarks.dateTags = [];
GateOne.Bookmarks.URLTypeTags = [];
GateOne.Bookmarks.toUpload = []; // Used for tracking what needs to be uploaded to the server
GateOne.Bookmarks.loginSync = true; // Makes sure we don't display "Synchronization Complete" if the user just logged in (unless it is the first time).
GateOne.Bookmarks.temp = ""; // Just a temporary holding space for things like drag & drop
GateOne.Base.update(GateOne.Bookmarks, {
    // TODO: Make it so you can have a bookmark containing multiple URLs.  So they all get opened at once when you open it.
    // TODO: Move the JSON.stringify() stuff into a Web Worker so the browser doesn't stop responding when a huge amount of bookmarks are being saved.
    init: function() {
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            toolbarBookmarks = u.createElement('div', {'id': go.prefs.prefix+'icon_bookmarks', 'class': 'toolbar', 'title': "Bookmarks"}),
            toolbar = u.getNode('#'+go.prefs.prefix+'toolbar');
        // Assign our logging function shortcuts if the Logging module is available with a safe fallback
        if (go.Logging) {
            logFatal = go.Logging.logFatal;
            logError = go.Logging.logError;
            logWarning = go.Logging.logWarning;
            logInfo = go.Logging.logInfo;
            logDebug = go.Logging.logDebug;
        }
        // Default sort order is by date created, descending, followed by alphabetical order
        if (!localStorage[prefix+'sort']) {
            // Set a default
            localStorage[prefix+'sort'] = 'date';
            b.sortfunc = b.sortFunctions.created;
        } else {
            if (localStorage[prefix+'sort'] == 'alpha') {
                b.sortfunc = b.sortFunctions.alphabetical;
            } else if (localStorage[prefix+'sort'] == 'date') {
                b.sortfunc = b.sortFunctions.created;
            } if (localStorage[prefix+'sort'] == 'visits') {
                b.sortfunc = b.sortFunctions.visits;
            }
        }
        // Setup our toolbar icons and actions
        go.Icons['bookmark'] = '<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="17.117" width="18" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><defs><linearGradient id="linearGradient15649" y2="545.05" gradientUnits="userSpaceOnUse" x2="726.49" y1="545.05" x1="748.51"><stop class="stop1" offset="0"/><stop class="stop4" offset="1"/></linearGradient></defs><metadata><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g transform="matrix(0.81743869,0,0,0.81743869,-310.96927,-428.95367)"><polygon points="726.49,542.58,734.1,541.47,737.5,534.58,740.9,541.47,748.51,542.58,743,547.94,744.3,555.52,737.5,551.94,730.7,555.52,732,547.94" fill="url(#linearGradient15649)" transform="translate(-346.07093,-9.8266745)"/></g></svg>';
        toolbarBookmarks.innerHTML = go.Icons['bookmark'];
        // This is the favicon that gets used for SSH URLs (used by updateIcon())
        go.Icons['ssh'] = 'data:image/x-icon;base64,AAABAAIABQkAAAEAIAAAAQAAJgAAABAQAAABAAgAaAUAACYBAAAoAAAABQAAABIAAAABACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////SP///0j///9I////SP///w////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+AAAAPgAAAD4AAAA+AAAAPgAAAD4AAAA+AAAAPgAAAD4AAAAKAAAABAAAAAgAAAAAQAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcnJwAoKSkAKikpACorKgArKysAKywrACwtLAAtLi0ALi4tAC0uLgAuLy4ALi8vAC8wLwAwMC8AMDAwADAxMAAxMjAAMTIxADIzMQAyMzIAMjMzADI0MgAyNDMAMzQ0ADQ0NAAzNTQANDU0ADQ2NAA0NjUANTY1ADU2NgA1NzUANjc2ADY3NwA3ODcANjg4ADc5NwA3OTgAODk4ADg5OQA4OjkAOTo5ADk6OgA5OzoAOjs6ADo7OwA6PDsAOzw7ADw9PAA8PjwAPD49ADw+PgA9Pz4APT8/AD1APgA/QD8AP0E/AEBBQQBAQkAAQEJBAEFCQQBBQ0IAQkRCAEJEQwBDRUMAREZFAEZIRwBGSUYAR0lHAEdKSABHSkkASEtJAElMSgBKTUsAS05MAE5QTwBnaGcAkXBUAG1wbgB+f34AgoOCAMOLWgDQlmMAj5CQAJCRkQChoqEAsrOyALO0swC3t7cAvL29AL29vQC+v74AxcXFAMbGxgDHx8cAyMjIAMrKygDLy8sAzMzMAM3NzQDOzs4Az8/PANHR0QDS0tIA1NTUANbW1gDb29sA39/fAOTk5ADo6OgA6enpAO3t7QDv7+8A8fHxAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABzc3Nzc3Nzc3Nzc3Nzc3Nzc1xoaGhoaGhoaGhoaGhac3NlNjEtJiEYEQ0IBQIAXXNzZDk0MC4kHxcRDAcEAV1zc2M9ODRPKSQdFBALBgNdc3NiQExVW1AoIhsVDwoGXnNzYUE/O1NXLighGRMOCV9zc2FDS1ZYNDAsJh0aEgxgc3NhRk5XNDQ0LyojHBYRYnNzYUhFVFlUODMvKCEcFGVzc2FKR0RUQDw3MiwnIBpmc3NhSklHQkE+OjUyKyUeZ3NzaGZpamtsbW9wbmxramhzc2hNcnJycnJycnJycmhNc3NRYWFhYXFRUVFRUVFRUXNzUVFRUVFRUVFRUVFRUlJz//8AAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAA==';
        var showBookmarks = function() {
            go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
        }
        toolbarBookmarks.onclick = showBookmarks;
        // Stick it on the end (can go wherever--unlike GateOne.Terminal's icons)
        toolbar.appendChild(toolbarBookmarks);
        // Initialize the localStorage['bookmarks'] if it doesn't exist
        if (!localStorage[prefix+'bookmarks']) {
            localStorage[prefix+'bookmarks'] = "[]"; // Init as empty JSON list
            b.bookmarks = [];
        } else {
            // Load them into GateOne.Bookmarks.bookmarks
            b.bookmarks = JSON.parse(localStorage[prefix+'bookmarks']);
        }
        // Initialize the USN if it isn't already set
        if (!localStorage[prefix+'USN']) {
            localStorage[prefix+'USN'] = 0;
        }
        // Default sort order is by visits, descending
        b.createPanel();
        // Create the icon fetching queue if it doesn't already exist
        if (!localStorage[prefix+'iconQueue']) {
            localStorage[prefix+'iconQueue'] = "";
        }
        setTimeout(function() {
            // Complete fetching icons if there's anything to fetch
            if (localStorage[prefix+'iconQueue'].length) {
                b.flushIconQueue();
            }
        }, 3000);
        // Setup a callback that re-draws the bookmarks panel whenever it is opened
        if (!go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks']) {
            go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks'] = {};
        }
        go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks']['createPanel'] = b.createPanel;
        // Register our WebSocket actions
        go.Net.addAction('bookmarks_updated', b.syncBookmarks);
        go.Net.addAction('bookmarks_save_result', b.syncComplete);
        go.Net.addAction('bookmarks_delete_result', b.deletedBookmarksSyncComplete);
        go.Net.addAction('bookmarks_renamed_tags', b.tagRenameComplete);
        // Setup a callback that synchronizes the user's bookmarks after they login
        go.User.userLoginCallbacks.push(function(username) {
            var USN = localStorage[prefix+'USN'] || 0;
            go.ws.send(JSON.stringify({'bookmarks_get': USN}));
        });
    },
    sortFunctions: {
        visits: function(a,b) {
            // Sorts bookmarks according to the number of visits followed by alphabetical
            if (a.visits === b.visits) {
                var x = a.name.toLowerCase(), y = b.name.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.visits > b.visits) {
                return -1;
            }
            if (a.visits < b.visits) {
                return 1;
            }
        },
        created: function(a,b) {
            // Sorts bookmarks by date modified followed by alphabetical
            if (a.created === b.created) {
                var x = a.name.toLowerCase(), y = b.name.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.created > b.created) {
                return -1;
            }
            if (a.created < b.created) {
                return 1;
            }
        },
        alphabetical: function(a,b) {
            var x = a.name.toLowerCase(), y = b.name.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        }
    },
    storeBookmarks: function(bookmarks, /*opt*/recreatePanel, skipTags) {
        // Takes an array of bookmarks and stores them in GateOne.Bookmarks.bookmarks
        // If *recreatePanel* is true, the panel will be re-drawn after bookmarks are stored.
        // If *skipTags* is true, bookmark tags will be ignored when saving the bookmark object.
        var go = GateOne,
            prefix = go.prefs.prefix,
            b = go.Bookmarks,
            count = 0;
        bookmarks.forEach(function(bookmark) {
            count += 1;
            var conflictingBookmark = false,
                deletedBookmark = false;
            // Add a trailing slash to URLs like http://liftoffsoftware.com
            if (bookmark.url.slice(0,4) == "http" && bookmark.url.indexOf('/', 7) == -1) {
                bookmark.url += '/';
            }
            // Check if this is our "Deleted Bookmarks" bookmark
            if (bookmark.url == "web+deleted:bookmarks/") {
                // Write the contained URLs to localStorage
                deletedBookmark = true;
            }
            // Add a "Untagged" tag if tags is empty
            if (!bookmark.tags.length) {
                bookmark.tags = ['Untagged'];
            }
            b.bookmarks.forEach(function(storedBookmark) {
                if (storedBookmark.url == bookmark.url) {
                    // There's a conflict
                    conflictingBookmark = storedBookmark;
                }
            });
            if (conflictingBookmark) {
                if (parseInt(conflictingBookmark.updated) < parseInt(bookmark.updated)) {
                    // Server is newer; overwrite it
                    if (skipTags) {
                        bookmark.tags = conflictingBookmark.tags; // Use the old ones
                    }
                    b.createOrUpdateBookmark(bookmark);
                } else if (parseInt(conflictingBookmark.updateSequenceNum) < parseInt(bookmark.updateSequenceNum)) {
                    // Server isn't newer but it has a higher USN.  So just update this bookmark's USN to match
                    b.updateUSN(bookmark);
                    conflictingBookmark.updateSequenceNum = bookmark.updateSequenceNum;
                    if (bookmark.updateSequenceNum > parseInt(localStorage[prefix+'USN'])) {
                        // Also need to add it to toUpload
                        b.toUpload.push(conflictingBookmark);
                    }
                }
            } else if (deletedBookmark) {
                // Don't do anything
            } else {
                // No conflict; store it if we haven't already deleted it
                var deletedBookmarks = localStorage[prefix+'deletedBookmarks'];
                if (deletedBookmarks) {
                    var existing = JSON.parse(deletedBookmarks),
                        found = false;
                    existing.forEach(function(obj) {
                        if (obj.url == bookmark.url) {
                            if (!obj.deleted > bookmark.updated) {
                                found = true;
                            }
                        }
                    });
                    if (!found) {
                        b.createOrUpdateBookmark(bookmark);
                    }
                } else {
                    b.createOrUpdateBookmark(bookmark);
                }
            }
        });
        if (recreatePanel) {
            b.createPanel();
        }
        b.flushIconQueue();
        return count;
    },
    syncComplete: function(response) {
        // Called when the initial sync (download) is completed, uploads any pending changes.
        logDebug('syncComplete()');
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            responseObj = null;
        if (typeof(response) == "string") {
            responseObj = JSON.parse(response);
        } else {
            responseObj = response;
        }
        clearInterval(b.syncTimer);
        if (responseObj['updateSequenceNum']) {
            localStorage[prefix+'USN'] = parseInt(responseObj['updateSequenceNum']);
        }
        if (responseObj['errors'].length == 0) {
            go.Visual.displayMessage("Synchronization Complete: " + (responseObj['count']) + " bookmarks were updated.");
            if (responseObj['updates'].length) {
                // The 'updates' list will include the bookmarks that have been updated so we can update their "updated" and "USN" attributes on the client
                b.storeBookmarks(responseObj['updates'], true, true);
            }
        } else {
            go.Visual.displayMessage("Synchronization Complete (With Errors): " + (responseObj['count']) + " bookmarks were updated successfully.");
            go.Visual.displayMessage("See the log (Options->View Log) for details.");
            logError("Synchronization Errors: " + u.items(responseObj['errors'][0]));
        }
        b.createPanel();
        u.getNode('#'+prefix+'bm_sync').innerHTML = "Sync Bookmarks | ";
        b.toUpload = []; // Reset it
    },
    syncBookmarks: function(response) {
        logDebug('syncBookmarks() response: ' + response + ', response.length: ' + response.length);
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            firstTime = false,
            bookmarks = null,
            foundDeleted = false,
            localDiff = [],
            remoteDiff = [];
        if (!localStorage[prefix+'deletedBookmarks']) {
            // If it isn't present as an empty array it can break things.
            localStorage[prefix+'deletedBookmarks'] = "[]";
        }
        if (!b.bookmarks.length) {
            firstTime = true;
        }
        if (typeof(response) == "string") {
            bookmarks = JSON.parse(response);
        } else {
            bookmarks = response;
        }
        // Process deleted bookmarks before anything else
        bookmarks.forEach(function(bookmark) {
            if (bookmark.url == 'web+deleted:bookmarks/') {
                foundDeleted = true;
                var deletedBookmarksLocal = JSON.parse(localStorage[prefix+'deletedBookmarks']),
                    deletedBookmarksServer = bookmark.notes;
                // Figure out the differences
                for (var i in deletedBookmarksLocal) {
                    var found = false;
                    for (var n in deletedBookmarksServer) {
                        if (deletedBookmarksLocal[i].url == deletedBookmarksServer[n].url) {
                            found = true;
                        }
                    }
                    if (!found) {
                        // We need to send these to the server for processing
                        localDiff.push(deletedBookmarksLocal[i]);
                    }
                }
                for (var i in deletedBookmarksServer) {
                    var found = false;
                    for (var n in deletedBookmarksLocal) {
                        if (deletedBookmarksServer[i].url == deletedBookmarksLocal[n].url) {
                            found = true;
                        }
                    }
                    if (!found) {
                        // We need to process these locally
                        remoteDiff.push(deletedBookmarksServer[i]);
                    }
                }
                if (localDiff.length) {
                    go.ws.send(JSON.stringify({'bookmarks_deleted': localDiff}));
                }
                if (remoteDiff.length) {
                    for (var i in remoteDiff) {
                        var callback = function() {
                            // This is so we don't endlessly sync deleted bookmarks.
                            localStorage[prefix+'deletedBookmarks'] = "[]";
                        }
                        b.removeBookmark(remoteDiff[i].url, callback);
                    }
                }
                // Fix the USN if the deletedBookmark note has the highest USN
                if (parseInt(localStorage[prefix+'USN']) < bookmark.updateSequenceNum) {
                    localStorage[prefix+'USN'] = JSON.parse(bookmark.updateSequenceNum);
                }
            }
        });
        if (!foundDeleted) {
            // Have to upload our deleted bookmarks list (if any)
            var deletedBookmarks = JSON.parse(localStorage[prefix+'deletedBookmarks']);
            if (deletedBookmarks.length) {
                go.ws.send(JSON.stringify({'bookmarks_deleted': deletedBookmarks}));
            }
        }
        setTimeout(function() {
            // This checks if there are new/imported bookmarks
            var count = b.storeBookmarks(bookmarks, false);
            b.bookmarks.forEach(function(bookmark) {
                if (bookmark.updateSequenceNum == 0) { // A USN of 0 means it isn't on the server at all or needs to be synchronized
                    // Mark it for upload
                    b.toUpload.push(bookmark);
                }
            });
            // If there *are* new/imported bookmarks, upload them:
            if (b.toUpload.length) {
                go.ws.send(JSON.stringify({'bookmarks_sync': b.toUpload}));
            } else {
                clearTimeout(b.syncTimer);
                if (!firstTime) {
                    if (!JSON.parse(localStorage[prefix+'deletedBookmarks']).length) {
                        // Only say we're done if the deletedBookmarks queue is empty
                        if (!b.loginSync) {
                            // This lets us turn off the "Synchronization Complete" message when the user had their bookmarks auto-sync after login
                                go.Visual.displayMessage("Synchronization Complete");
                            if (count) {
                                b.createPanel();
                            }
                        }
                    }
                    if (localStorage[prefix+'iconQueue'].length) {
                        go.Visual.displayMessage("Missing bookmark icons will be retrieved in the background");
                    }
                    if (b.highestUSN() > parseInt(localStorage[prefix+'USN'])) {
                        localStorage[prefix+'USN'] = b.highestUSN();
                    }
                } else {
                    if (localStorage[prefix+'USN'] != 0) {
                        go.Visual.displayMessage("First-Time Synchronization Complete");
                        go.Visual.displayMessage("Missing bookmark icons will be retrieved in the background");
                    }
                    b.createPanel();
                    localStorage[prefix+'USN'] = b.highestUSN();
                }
                u.getNode('#'+prefix+'bm_sync').innerHTML = "Sync Bookmarks | ";
            }
            // Process any pending tag renames
            if (localStorage[prefix+'renamedTags']) {
                var renamedTags = JSON.parse(localStorage[prefix+'renamedTags']);
                go.ws.send(JSON.stringify({'bookmarks_rename_tags': renamedTags}));
            }
            b.loginSync = false; // So subsequent synchronizations display the "Synchronization Complete" message
        }, 200);
    },
    tagRenameComplete: function(result) {
        var go = GateOne,
            b = go.Bookmarks,
            prefix = go.prefs.prefix;
        if (result) {
            delete localStorage[prefix+'renamedTags'];
            go.Visual.displayMessage(result['count'] + " tags were renamed.");
        }
    },
    deletedBookmarksSyncComplete: function(message) {
        // Handles the response from the server after we've sent the bookmarks_deleted command
        var go = GateOne,
            v = go.Visual,
            prefix = go.prefs.prefix;
        if (message) {
            localStorage[prefix+'deletedBookmarks'] = "[]"; // Clear it out now that we're done
            v.displayMessage(message['count'] + " bookmarks were deleted or marked as such.");
        }
    },
    loadBookmarks: function(/*opt*/delay) {
        // Loads the user's bookmarks
        // Optionally, a sort function may be supplied that sorts the bookmarks before placing them in the panel.
        // If *ad* is true, an advertisement will be the first item in the bookmarks list
        // If *delay* is given, that will be used to set the delay
        logDebug("loadBookmarks()");
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            goDiv = u.getNode(go.prefs.goDiv),
            prefix = go.prefs.prefix,
            bookmarks = b.bookmarks.slice(0), // Make a local copy since we're going to mess with it
            bmCount = 0, // Starts at 1 for the ad
            bmMax = b.getMaxBookmarks('#'+prefix+'bm_container'),
            bmContainer = u.getNode('#'+prefix+'bm_container'),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            pagination = u.getNode('#'+prefix+'bm_pagination'),
            paginationUL = u.getNode('#'+prefix+'bm_pagination_ul'),
            tagCloud = u.getNode('#'+prefix+'bm_tagcloud'),
            bmSearch = u.getNode('#'+prefix+'bm_search'),
            bmTaglist = u.getNode('#'+prefix+'bm_taglist'),
            cloudTags = u.toArray(tagCloud.getElementsByClassName('bm_tag')),
            allTags = [],
            filteredBookmarks = [],
            bookmarkElements = u.toArray(goDiv.getElementsByClassName('bookmark'));
        bmPanel.style['overflow-y'] = "hidden"; // Only temporary while we're loading bookmarks
        setTimeout(function() {
            bmPanel.style['overflow-y'] = "auto"; // Set it back after everything is loaded
        }, 1000);
        if (bookmarkElements) { // Remove any existing bookmarks from the list
            bookmarkElements.forEach(function(bm) {
                bm.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(bm);
                },500);
            });
        }
        if (!delay) {
            delay = 0;
        }
        // Remove the pagination UL
        if (paginationUL) {
            u.removeElement(paginationUL);
        };
        // Apply the sort function
        bookmarks.sort(b.sortfunc);
        if (b.sortToggle) {
            bookmarks.reverse();
        }
        if (!bookmarks.length) { // No bookmarks == Likely new user.  Show a welcome message.
            var welcome = {
                    'url': "http://liftoffsoftware.com/",
                    'name': "You don't have any bookmarks yet!",
                    'tags': [],
                    'notes': 'A great way to get started is to import bookmarks or click Sync.',
                    'visits': 0,
                    'updated': new Date().getTime(),
                    'created': new Date().getTime(),
                    'updateSequenceNum': 0,
                    'images': {'favicon': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sHCBMpEfMvEIMAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAACEUlEQVQoz2M0Lei7f/YIA3FAS02FUcQ2iFtcDi7Ex81poq6ooyTz7cevl+8/nr354Nmb93DZry8fMXPJa7Lx8EP43pYGi2oyIpwt2NlY333+WpcQGO9pw8jAePbm/X///zMwMPz++pEJrrs00ntqUbwQLzcDA8P2Exd3nLzEwMDAwsxcGO6xuCaTmQmqEkqZaSplBjrDNW87cfHinUdwx1jqqKT7O0HYLBAqwcvuzpOXEPb956+fvn7PwMCwfM8JX2tDuGuX7T729SUDCwMDAyc7m5KkaO6ERTcfPUcOk8lrd01eu4uBgUGAh6szM0JPRe7p3RtMDAwMarISGvJSG9sLo1ytMIPSTFNpe0+pu5mulrwU1A+fv/1gYGDgYGNtSwttSApCVu1jZbC8IVtSWICBgeHT1+9QDQ+ev/728xdExYcv35A1vP30BR4+Vx88hWr49///zpOXIKLbT1xkYGDwtNDPD3FnZmI6de3eu89fGRgYHrx4c+3BU0QoNc5fb6On/uX7j4cv3rSlhUI8Y62nlj9x8e7Tl0MdzYunLPv95y8DAwMiaZhqKPnbGplpKqvJSsCd9OHLt3UHT9958nLZnuOQpMEClzt9497Nx8+rYv2E+XiE+XkYGBi+/fx1+e7jpbuP3X36Cq4MPfFBgKSwABcH2/1nryFJCDnxsWipqVy7dQdNw52Xj7Amb0VjGwCOn869WU5D8AAAAABJRU5ErkJggg=="}
            },
                introVideo = {
                'url': "http://vimeo.com/26357093",
                'name': "A Quick Screencast Overview of Bookmarked",
                'tags': ["Video", "Help"],
                'notes': 'Want some help getting started?  Our short (3 minutes) overview screencast can be illuminating.',
                'visits': 0,
                'updated': new Date().getTime(),
                'created': new Date().getTime(),
                'updateSequenceNum': 0,
                'images': {'favicon': "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAA8uvRAMq/oQDj28EA27crAOjRdwCrhwoAuZQLAODKdwC6r5EAkXs1AODCSgCKd0MA3rw7AP///wDi3dAA/PnwAI9yFwBzWxUAh2kHAL6aCwDAmgsA6taGAM+nDACwjxkA1q0NANfIkwDt3qQAz8ShAI98RADr6OAAlXUIAO3blQCqk0UAtKeCAOndsgCdewkAzsawAOTcwQDg1rIA2bIcALmlZADbvUkAno5iAPX07wDGt4MA8OCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQUFBQUFBQUFBQUFBQUABQUGRkZGQcXGRkZGRkZFBQUGRkZGR8MEgYZGRkZGRkUFBkZGRcJDiwrBhkZGRkZFBQZGRkYDg4ODisHGRkZGRQUGRkZKQ4ODg4OHRkZGRkUFBkZGQIODhYBDiwRGRkZFBQZGRUeDg4ZCw4OJQcZGRQUByQKDg4mFxknDg4hGRkUFCotDw4OGigTIg4OHBkZFBQoLg4ODggZIywODgMZGRQUGRkgDhAEGQsODg4bGRkUFBkZGQ0EGRkZBBYFKBkZFBQZGRkZGRkZGRkZGRkZGRQUDRkZGRkZGRkZGRkZGQ0UABQUFBQUFBQUFBQUFBQUAIABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIABAAA="}
            };
            b.createBookmark(bmContainer, welcome, delay, false);
            b.createBookmark(bmContainer, introVideo, delay+100, false);
        }
        // Remove bookmarks from *bookmarks* that don't match the searchFilter (if one is set)
        if (b.searchFilter) {
            bookmarks.forEach(function(bookmark) {
                var bookmarkName = bookmark.name.toLowerCase();
                if (bookmarkName.match(b.searchFilter.toLowerCase())) {
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = []; // Have to reset this for use further down
        }
        bmTaglist.innerHTML = ""; // Clear out the tag list
        // Now recreate it...
        if (b.dateTags) {
            for (var i in b.dateTags) {
                var tag = u.createElement('li', {'id': 'bm_autotag'});
                tag.onclick = function(e) {
                    b.removeFilterDateTag(bookmarks, this.innerHTML);
                };
                tag.innerHTML = b.dateTags[i];
                bmTaglist.appendChild(tag);
            }
        }
        if (b.URLTypeTags) {
            for (var i in b.URLTypeTags) {
                var tag = u.createElement('li', {'id': 'bm_autotag bm_urltype_tag'});
                tag.onclick = function(e) {
                    b.removeFilterURLTypeTag(bookmarks, this.innerHTML);
                };
                tag.innerHTML = b.URLTypeTags[i];
                bmTaglist.appendChild(tag);
            }
        }
        if (b.tags.length) {
            for (var i in b.tags) { // Recreate the tag filter list
                var tag = u.createElement('li', {'id': 'bm_tag'});
                tag.innerHTML = b.tags[i];
                tag.onclick = function(e) {
                    b.removeFilterTag(bookmarks, this.innerHTML);
                };
                bmTaglist.appendChild(tag);
            }
        }
        if (b.tags.length) {
        // Remove all bookmarks that don't have matching *Bookmarks.tags*
            bookmarks.forEach(function(bookmark) {
                var bookmarkTags = bookmark.tags,
                    allTagsPresent = false,
                    tagCount = 0;
                bookmarkTags.forEach(function(tag) {
                    if (b.tags.indexOf(tag) != -1) { // tag not in tags
                        tagCount += 1;
                    }
                });
                if (tagCount == b.tags.length) {
                    // Add the bookmark to the list
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = []; // Have to reset this for use further down
        }
        if (b.URLTypeTags.length) {
        // Remove all bookmarks that don't have matching URL type
            bookmarks.forEach(function(bookmark) {
                var urlType = bookmark.url.split(':')[0];
                if (b.URLTypeTags.indexOf(urlType) == 0) {
                    // Add the bookmark to the list
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = []; // Have to reset this for use further down
        }
        if (b.dateTags.length) {
        // Remove from the bookmarks array all bookmarks that don't measure up to *Bookmarks.dateTags*
            bookmarks.forEach(function(bookmark) {
                var dateObj = new Date(parseInt(bookmark.created)),
                    dateTag = b.getDateTag(dateObj),
                    tagCount = 0;
                b.dateTags.forEach(function(tag) {
                    // Create a new Date object that reflects the date tag
                    var dateTagDateObj = new Date(),
                        olderThanYear = false;
                    if (tag == '<1 day') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-1);
                    }
                    if (tag == '<7 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-7);
                    }
                    if (tag == '<30 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-30);
                    }
                    if (tag == '<60 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-60);
                    }
                    if (tag == '<90 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-90);
                    }
                    if (tag == '<180 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-180);
                    }
                    if (tag == '<1 year') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-365);
                    }
                    if (tag == '>1 year') {
                        olderThanYear = true;
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-365);
                    }
                    if (!olderThanYear) {
                        if (dateObj > dateTagDateObj) {
                            tagCount += 1;
                        }
                    } else {
                        if (dateObj < dateTagDateObj) {
                            tagCount += 1;
                        }
                    }
                });
                if (tagCount == b.dateTags.length) {
                    // Add the bookmark to the list
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = [];
        }
        allTags = b.getTags(bookmarks);
        b.filteredBookmarks = bookmarks; // Need to keep track semi-globally for some things
        if (b.page) {
            var pageBookmarks = null;
            if (bmMax*(b.page+1) < bookmarks.length) {
                pageBookmarks = bookmarks.slice(bmMax*b.page, bmMax*(b.page+1));
            } else {
                pageBookmarks = bookmarks.slice(bmMax*b.page, bookmarks.length-1);
            }
            pageBookmarks.forEach(function(bookmark) {
                if (bmCount < bmMax) {
                    if (!bookmark.images) {
                        logDebug('bookmark missing images: ' + bookmark);
                    }
                    b.createBookmark(bmContainer, bookmark, delay);
                }
                bmCount += 1;
            });
        } else {
            bookmarks.forEach(function(bookmark) {
                if (bmCount < bmMax) {
                    b.createBookmark(bmContainer, bookmark, delay);
                }
                bmCount += 1;
            });
        }
        var bmPaginationUL = b.loadPagination(bookmarks, b.page);
        pagination.appendChild(bmPaginationUL);
        // Hide tags that aren't in the bookmark array
        delay = 100;
        cloudTags.forEach(function hideTag(tagNode) {
            if (allTags.indexOf(tagNode.innerHTML) == -1) { // Tag isn't in the new list of bookmarks
                // Make it appear inactive
                setTimeout(function() {
                    tagNode.className = 'bm_tag sectrans inactive';
                }, delay);
            }
        });
        // Mark tags as active that were previously inactive (if the user just removed a tag from the tag filter)
        delay = 100;
        cloudTags.forEach(function showTag(tagNode) {
            if (allTags.indexOf(tagNode.innerHTML) != -1) { // Tag is in the new list of bookmarks
                // Make it appear active
                setTimeout(function unTrans() {
                    setTimeout(function reClass() {
                        if (tagNode.innerHTML == "Untagged") {
                            tagNode.className = 'bm_tag sectrans untagged';
                        } else if (tagNode.innerHTML == "Searches") {
                            tagNode.className = 'bm_tag sectrans searches';
                        } else {
                            tagNode.className = 'bm_tag sectrans'; // So we don't have slow mouseovers
                        }
                    }, 500);
                }, delay);
            }
        });
    },
    flushIconQueue: function() {
        // Goes through the iconQueue fetching icons until it is empty.
        // If we're already processing the queue, don't do anything when called.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix;
        if (!b.flushingIconQueue) {
            setTimeout(function() { // Wrapped for async
                b.flushingIconQueue = true;
                if (localStorage[prefix+'iconQueue'].length) {
                    // We have icons to fetch
                    var iconQueue = localStorage[prefix+'iconQueue'].split('\n'),
                        removed = [];
                    b.flushProgress = setInterval(function() {
                        try {
                            var remaining = Math.abs((localStorage[prefix+'iconQueue'].split('\n').length-1) - iconQueue.length);
                            u.updateProgress(prefix+'iconflush', iconQueue.length, remaining, 'Fetching Icons...');
                            if (localStorage[prefix+'iconQueue'].split('\n').length == 1) {
                                clearInterval(b.flushProgress);
                            }
                        } catch(e) {
                            // Something went wrong (bad math)... Stop updating progress
                            clearInterval(b.flushProgress);
                        }
                    }, 1000);
                    for (var i in iconQueue) {
                        // Find the bookmark associated with this URL
                        var bookmark = b.getBookmarkObj(iconQueue[i]);
                        if (bookmark) {
                            if (bookmark.url) {
                                b.updateIcon(bookmark);
                            }
                        } else {
                            // For whatever reason this bookmark doesn't exist anymore.
                            removed.push(iconQueue[i]);
                        }
                    }
                    if (removed.length) {
                        // Remove these from the queue
                        iconQueue = localStorage[prefix+'iconQueue'].split('\n');
                        for (var r in removed) {
                            for (var i in iconQueue) {
                                if (iconQueue[i] == removed[r]) {
                                    iconQueue.splice(i, 1);
                                }
                            }
                        }
                        if (iconQueue.length) {
                            localStorage[prefix+'iconQueue'] = iconQueue.join('\n');
                        } else {
                            localStorage[prefix+'iconQueue'] = "";
                        }
                    }
                }
                b.flushingIconQueue = false;
            }, 100);
        }
    },
    updateIcon: function(bookmark) {
        // Grabs and stores (as a data: URI) the favicon associated with the given bookmark (if any)
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils;
        if (!b.fetchingIcon) {
            if (bookmark.url.slice(0,4) == "http") {
                // This is an HTTP or HTTPS URL.  Fetch it's icon
                var params = 'url=' + bookmark.url,
                    callback = u.partial(b.storeFavicon, bookmark),
                    xhr = new XMLHttpRequest(),
                    handleStateChange = function(e) {
                        var status = null;
                        try {
                            status = parseInt(e.target.status);
                        } catch(e) {
                            return;
                        }
                        if (e.target.readyState == 4) {
                            b.fetchingIcon = false; // All done regardless of what happened
                            callback(e.target.responseText); // storeFavicon will take care of filtering out bad responses
                        }
                    };
                b.fetchingIcon = true;
                if (xhr.addEventListener) {
                    xhr.addEventListener('readystatechange', handleStateChange, false);
                } else {
                    xhr.onreadystatechange = handleStateChange;
                }
                xhr.open('POST', go.prefs.url+'bookmarks/fetchicon', true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.send(params);
            } else {
                // Check if this is an SSH URL and use the SSH icon for it
                if (u.startsWith('telnet', bookmark.url) || u.startsWith('ssh', bookmark.url)) {
                    b.storeFavicon(bookmark, go.Icons['ssh']);
                }
                // Ignore everything else (until we add suitable favicons)
            }
        } else {
            setTimeout(function() {
                b.updateIcon(bookmark);
            }, 50); // Wait a moment and retry
        }
    },
    storeFavicon: function(bookmark, dataURI) {
        // *dataURI* should be pre-encoded data:URI
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            iconQueue = localStorage[prefix+'iconQueue'].split('\n'),
            goDiv = u.getNode(go.prefs.goDiv),
            visibleBookmarks = u.toArray(goDiv.getElementsByClassName('bookmark')),
            removed = null;
        if (u.startsWith("data:", dataURI)) {
            bookmark.images = {'favicon': dataURI};
            b.createOrUpdateBookmark(bookmark);
        }
        for (var i in iconQueue) {
            if (iconQueue[i] == bookmark.url) {
                // Remove it
                removed = iconQueue.splice(i, 1);
            }
        }
        localStorage[prefix+'iconQueue'] = iconQueue.join('\n');
        // TODO:  Get this working...
//         visibleBookmarks.forEach(function(bookmark) {
//             // Update the favicon of this bookmark in-place (if it is visible)
//             var bmURL = bookmark.getElementsByClassName('bm_url');
//             if (bmURL.href == bookmark.url) {
//                 // Add the favicon
//
//             }
//         });
        // Ignore anything else
    },
    updateIcons: function(urls) {
        // Loops over *urls* attempting to fetch and store their respective favicons
        // NOTE: Only used in debugging (not called from anywhere)
        var go = GateOne,
            b = go.Bookmarks;
        urls.forEach(function(url) {
            b.bookmarks.forEach(function(bookmark) {
                if (bookmark.url == url) {
                    b.updateIcon(bookmark);
                }
            });
        });
    },
    createBookmark: function(bmContainer, bookmark, delay, /*opt*/ad) {
        // Creates a new bookmark element and places it in  in bmContainer.  Also returns the bookmark element.
        // *bmContainer* is the node we're going to be placing bookmarks
        // *bookmark* is expected to be a bookmark object
        // *delay* is the amount of milliseconds to wait before translating the bookmark into view
        // Optional: if *ad* is true, will not bother adding tags or edit/delete/share links
        logDebug('createBookmark() bookmark: ' + bookmark.url);
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            twoSec = null,
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmStats = u.createElement('div', {'class': 'bm_stats superfasttrans', 'style': {'opacity': 0}}),
            dateObj = new Date(parseInt(bookmark.created)),
            bmElement = u.createElement('div', {'class': 'bookmark halfsectrans', 'name': prefix+'bookmark'}),
            bmLinkFloat = u.createElement('div', {'class': 'linkfloat'}), // So the user can click anywhere on a bookmark to open it
            bmContent = u.createElement('span', {'class': 'bm_content'}),
            bmFavicon = u.createElement('span', {'class': 'bm_favicon'}),
            bmLink = u.createElement('a', {'href': bookmark.url, 'class': 'bm_url', 'tabindex': 2}),
            bmEdit = u.createElement('a'),
            bmDelete = u.createElement('a'),
            bmControls = u.createElement('span', {'class': 'bm_controls'}),
            bmDesc = u.createElement('span', {'class': 'bm_desc'}),
            bmVisited = u.createElement('span', {'class': 'bm_visited', 'title': 'Number of visits'}),
            bmTaglist = u.createElement('ul', {'class': 'bm_taglist'});
            bmElement.addEventListener('dragstart', b.handleDragStart, false);
            bmElement.addEventListener('dragenter', b.handleDragEnter, false);
            bmElement.addEventListener('dragover', b.handleDragOver, false);
            bmElement.addEventListener('dragleave', b.handleDragLeave, false);
            bmElement.addEventListener('drop', b.handleDrop, false);
            bmElement.addEventListener('dragend', b.handleDragEnd, false);
        bmEdit.innerHTML = 'Edit |';
        bmDelete.innerHTML = 'Delete';
        bmEdit.onclick = function(e) {
            e.preventDefault();
            b.editBookmark(this);
        }
        bmDelete.onclick = function(e) {
            e.preventDefault();
            b.deleteBookmark(this);
        }
        bmControls.appendChild(bmEdit);
        bmControls.appendChild(bmDelete);
        bmStats.innerHTML = months[dateObj.getMonth()] + '<br />' + dateObj.getDay() + '<br />' + dateObj.getFullYear();
        bmElement.title = bookmark.url;
        if (bookmark.url.indexOf('%s') != -1) {
            // This is a keyword search URL.  Mark it as such.
            bmLink.innerHTML = '<span class="search">Search:</span> ' + bookmark.name;
        } else {
            bmLink.innerHTML = bookmark.name;
        }
        bmLink.onclick = function(e) {
            e.preventDefault();
            b.openBookmark(this.href);
        };
        if (ad) {
            bmLink.innerHTML = "AD: " + bmLink.innerHTML;
            bmDesc.innerHTML = bookmark.notes;
        }
        if (!b.bookmarks.length) {
            // Add the notes if there's no bookmarks since this is just the "Welcome" message
            bmDesc.innerHTML = bookmark.notes;
        }
        if (bookmark.images['favicon']) {
            bmFavicon.innerHTML = '<img align="left" src="' + bookmark['images']['favicon'] + '" width="16" height="16">';
            bmContent.appendChild(bmFavicon);
        }
        bmContent.appendChild(bmLink);
        // The Link Float div sits behind everything but on top of bmElement and allows us to click anywhere to open the bookmark without clobbering the onclick events of tags, edit/delete, etc
        bmElement.appendChild(bmContent);
        bmDesc.innerHTML = bookmark.notes;
        bmContent.appendChild(bmDesc);
        // TODO: Get this adding the autotags to the taglist
        if (!ad && b.bookmarks.length) {
            var bmDateTag = u.createElement('li', {'class': 'bm_autotag'}),
                goTag = u.createElement('li', {'class': 'bm_autotag bm_urltype_tag'}),
                urlType = bookmark.url.split(':')[0],
                dateTag = b.getDateTag(dateObj);
            bmVisited.innerHTML = bookmark.visits;
            bmElement.appendChild(bmVisited);
            bmElement.appendChild(bmControls);
            bookmark.tags.forEach(function(tag) {
                var bmTag = u.createElement('li', {'class': 'bm_tag'});
                bmTag.innerHTML = tag;
                bmTag.onclick = function(e) {
                    b.addFilterTag(b.filteredBookmarks, tag);
                };
                bmTaglist.appendChild(bmTag);
            });
            goTag.innerHTML = urlType; // The ★ gets added via CSS
            goTag.onclick = function(e) {
                b.addFilterURLTypeTag(b.filteredBookmarks, urlType);
            }
            bmTaglist.appendChild(goTag);
            bmDateTag.innerHTML = dateTag;
            bmDateTag.onclick = function(e) {
                b.addFilterDateTag(b.filteredBookmarks, dateTag);
            };
            bmTaglist.appendChild(bmDateTag);
            bmElement.appendChild(bmTaglist);
        }
        bmElement.appendChild(bmLinkFloat);
        bmLinkFloat.onclick = function(e) {
            b.openBookmark(bmLink.href);
        }
        bmElement.style.opacity = 0;
        setTimeout(function() {
            bmElement.style.opacity = 1;
        }, 500);
        try {
            bmContainer.appendChild(bmElement);
        } catch(e) {
            u.noop(); // Sometimes bmContainer will be missing between page loads--no biggie
        }
        setTimeout(function() {
            try {
                go.Visual.applyTransform(bmElement, '');
            } catch(e) {
                u.noop(); // Bookmark element was removed already.  No biggie.
            }
        }, delay);
        delay += 50;
        return bmElement;
    },
    createSortOpts: function() {
        // Returns a div containing bm_display_opts representing the user's current settings.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmSortOpts = u.createElement('span', {'id': 'bm_sort_options'}),
            bmSortAlpha = u.createElement('a', {'id': 'bm_sort_alpha'}),
            bmSortDate = u.createElement('a', {'id': 'bm_sort_date'}),
            bmSortVisits = u.createElement('a', {'id': 'bm_sort_visits'}),
            bmSortDirection = u.createElement('div', {'id': 'bm_sort_direction'});
        bmSortAlpha.innerHTML = 'Alphabetical ';
        bmSortDate.innerHTML = 'Date ';
        bmSortVisits.innerHTML = 'Visits ';
        bmSortDirection.innerHTML = '▼';
        bmSortOpts.innerHTML = '<b>Sort:</b> ';
        if (localStorage[prefix+'sort'] == 'alpha') {
            bmSortAlpha.className = 'active';
        } else if (localStorage[prefix+'sort'] == 'date') {
            bmSortDate.className = 'active';
        } else if (localStorage[prefix+'sort'] == 'visits') {
            bmSortVisits.className = 'active';
        }
        bmSortAlpha.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'alpha') {
                b.sortfunc = b.sortFunctions.alphabetical;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_alpha').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'alpha';
            }
        }
        bmSortDate.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'date') {
                b.sortfunc = b.sortFunctions.created;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_date').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'date';
            }
        }
        bmSortVisits.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'visits') {
                b.sortfunc = b.sortFunctions.visits;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_visits').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'visits';
            }
        }
        bmSortOpts.appendChild(bmSortAlpha);
        bmSortOpts.appendChild(bmSortDate);
        bmSortOpts.appendChild(bmSortVisits);
        bmSortOpts.appendChild(bmSortDirection);
        return bmSortOpts;
    },
    createPanel: function(/*opt*/embedded) {
        // Creates the bookmarks panel.  If *ad* is true, shows an ad as the first bookmark
        // If the bookmarks panel already exists, re-create the bookmarks container and reset pagination
        // If *embedded* is true then we'll just load the header (without search).
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            delay = 1000, // Pretty much everything has the 'sectrans' class for 1-second transition effects
            existingPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanel = u.createElement('div', {'id': 'panel_bookmarks', 'class': 'panel sectrans'}),
            bmHeader = u.createElement('div', {'id': 'bm_header', 'class': 'sectrans'}),
            bmContainer = u.createElement('div', {'id': 'bm_container', 'class': 'sectrans'}),
            bmPagination = u.createElement('div', {'id': 'bm_pagination', 'class': 'sectrans'}),
//             bmTagCloud = u.createElement('div', {'id': 'bm_tagcloud', 'class': 'sectrans'}),
            bmTags = u.createElement('div', {'id': 'bm_tags', 'class': 'sectrans'}),
            bmNew = u.createElement('a', {'id': 'bm_new', 'class': 'quartersectrans'}),
            bmHRFix = u.createElement('hr', {'style': {'opacity': 0, 'margin-bottom': 0}}),
            bmDisplayOpts = u.createElement('div', {'id': 'bm_display_opts', 'class': 'sectransform'}),
            bmSortOpts = b.createSortOpts(),
            bmOptions = u.createElement('div', {'id': 'bm_options'}),
            bmExport = u.createElement('a', {'id': 'bm_export', 'title': 'Save your bookmarks to a file'}),
            bmImport = u.createElement('a', {'id': 'bm_import', 'title': 'Import bookmarks from another application'}),
            bmSync = u.createElement('a', {'id': 'bm_sync', 'title': 'Synchronize your bookmarks with the server.'}),
            bmH2 = u.createElement('h2'),
            bmHeaderImage = u.createElement('span', {'id': 'bm_header_star'}),
//             bmTagCloudUL = u.createElement('ul', {'id': 'bm_tagcloud_ul'}),
//             bmTagCloudTip = u.createElement('span', {'id': 'bm_tagcloud_tip', 'class': 'sectrans'}),
//             bmTagsHeader = u.createElement('h3', {'class': 'sectrans'}),
//             pipeSeparator = u.createElement('span'),
//             bmTagsHeaderTagsLink = u.createElement('a'),
//             bmTagsHeaderAutotagsLink = u.createElement('a', {'class': 'inactive'}),
            bmSearch = u.createElement('input', {'id': 'bm_search', 'name': prefix+'search', 'type': 'search', 'tabindex': 1, 'placeholder': 'Search Bookmarks'}),
//             allTags = b.getTags(b.bookmarks),
            toggleSort = u.partial(b.toggleSortOrder, b.bookmarks);
        bmH2.innerHTML = 'Bookmarks';
        if (!embedded) {
            bmH2.appendChild(bmSearch);
            bmSearch.onchange = function(e) {
                b.page = 0;
                if (bmSearch.value) {
                    b.searchFilter = bmSearch.value;
                    b.filterBookmarksBySearchString(bmSearch.value);
                } else {
                    b.searchFilter = null;
                    b.loadBookmarks();
                }
            }
        }
        bmHeader.appendChild(bmH2);
        bmTags.innerHTML = '<span id="'+prefix+'bm_taglist_label">Tag Filter:</span> <ul id="'+prefix+'bm_taglist"></ul> ';
        bmSync.innerHTML = 'Sync Bookmarks | ';
        bmImport.innerHTML = 'Import | ';
        bmExport.innerHTML = 'Export';
        bmImport.onclick = function(e) {
            b.openImportDialog();
        }
        bmExport.onclick = function(e) {
            b.openExportDialog();
        }
        bmSync.onclick = function(e) {
            e.preventDefault();
            var USN = localStorage[prefix+'USN'] || 0;
            this.innerHTML = "Synchronizing... | ";
            if (!b.bookmarks.length) {
                go.Visual.displayMessage("NOTE: Since this is your first sync it can take a few seconds.  Please be patient.");
            } else {
                go.Visual.displayMessage("Please wait while we synchronize your bookmarks...");
            }
            b.syncTimer = setInterval(function() {
                go.Visual.displayMessage("Please wait while we synchronize your bookmarks...");
            }, 6000);
            go.ws.send(JSON.stringify({'bookmarks_get': USN}));
        }
        bmOptions.appendChild(bmSync);
        bmOptions.appendChild(bmImport);
        bmOptions.appendChild(bmExport);
        bmTags.appendChild(bmOptions);
        bmNew.innerHTML = '+ New Bookmark';
        bmNew.onclick = b.openNewBookmarkForm;
        bmDisplayOpts.appendChild(bmSortOpts);
        bmHeader.appendChild(bmTags);
        bmHeader.appendChild(bmHRFix); // The HR here fixes an odd rendering bug with Chrome on Mac OS X
//         bmTagsHeaderAutotagsLink.innerHTML = "Autotags";
//         pipeSeparator.innerHTML = " | ";
//         bmTagsHeaderTagsLink.innerHTML = "Tags";
//         bmTagsHeader.appendChild(bmTagsHeaderTagsLink);
//         bmTagsHeader.appendChild(pipeSeparator);
//         bmTagsHeader.appendChild(bmTagsHeaderAutotagsLink);
//         bmTagsHeader.innerHTML = '<a id="bm_user_tags" href="javascript:void(0)">Tags</a> | <a id="bm_user_tags" class="inactive" href="javascript:void(0)">Autotags</a>';
//         go.Visual.applyTransform(bmTagsHeader, 'translate(300%, 0)');
        go.Visual.applyTransform(bmPagination, 'translate(300%, 0)');
//         bmTagCloud.appendChild(bmTagsHeader);
//         bmTagCloud.appendChild(bmTagCloudUL);
//         bmTagCloudTip.style.opacity = 0;
//         bmTagCloudTip.innerHTML = "<br><b>Tip:</b> " + b.generateTip();
//         bmTagCloud.appendChild(bmTagCloudTip);
        if (existingPanel) {
            // Remove everything first
            while (existingPanel.childNodes.length >= 1 ) {
                existingPanel.removeChild(existingPanel.firstChild);
            }
            // Fade it in nicely
            bmHeader.style.opacity = 0;
            existingPanel.appendChild(bmHeader);
            existingPanel.appendChild(bmNew);
            existingPanel.appendChild(bmDisplayOpts);
            existingPanel.appendChild(bmContainer);
            existingPanel.appendChild(bmPagination);
            go.Visual.applyTransform(bmNew, 'translate(-300%, 0)');
            go.Visual.applyTransform(bmDisplayOpts, 'translate(300%, 0)');
            setTimeout(function() { // Fade them in
                bmHeader.style.opacity = 1;
                go.Visual.applyTransform(bmNew, '');
                go.Visual.applyTransform(bmDisplayOpts, '');
            }, 700);
            u.getNode('#'+prefix+'bm_sort_direction').onclick = toggleSort;
        } else {
            bmPanel.appendChild(bmHeader);
            u.getNode(go.prefs.goDiv).appendChild(bmPanel);
            if (!embedded) {
                bmPanel.appendChild(bmNew);
                bmPanel.appendChild(bmDisplayOpts);
                bmPanel.appendChild(bmContainer);
                bmPanel.appendChild(bmPagination);
                u.getNode('#'+prefix+'bm_sort_direction').onclick = toggleSort;
            }
        }
        if (!embedded) {
            b.loadTagCloud('tags');
            setTimeout(function() { // Fade them in and load the bookmarks
//                 go.Visual.applyTransform(bmTagsHeader, '');
                go.Visual.applyTransform(bmPagination, '');
                b.loadBookmarks(1);
            }, 800); // Needs to be just a bit longer than the previous setTimeout
//             setTimeout(function() { // This one looks nicer if it comes last
//                 bmTagCloudTip.style.opacity = 1;
//             }, 3000);
//             setTimeout(function() { // Make it go away after a while
//                 bmTagCloudTip.style.opacity = 0;
//                 setTimeout(function() {
//                     u.removeElement(bmTagCloudTip);
//                 }, 1000);
//             }, 30000);
//             allTags.forEach(function(tag) {
//                 var li = u.createElement('li', {'class': 'bm_tag sectrans', 'title': 'Click to filter or drop on a bookmark to tag it.', 'draggable': true});
//                 li.innerHTML = tag;
//                 li.addEventListener('dragstart', b.handleDragStart, false);
//                 go.Visual.applyTransform(li, 'translateX(700px)');
//                 li.onclick = function(e) {
//                     b.addFilterTag(b.bookmarks, tag);
//                 };
//                 li.oncontextmenu = function(e) {
//                     // Bring up the context menu
//                     e.preventDefault(); // Prevent regular context menu
//                     b.tagContextMenu(li);
//                 }
//                 bmTagCloudUL.appendChild(li);
//                 if (tag == "Untagged") {
//                     li.className = 'bm_tag sectrans untagged';
//                 }
//                 setTimeout(function unTrans() {
//                     go.Visual.applyTransform(li, '');
//                 }, delay);
//                 delay += 50;
//             });
//             if (existingPanel) {
//                 existingPanel.appendChild(bmTagCloud);
//             } else {
//                 bmPanel.appendChild(bmTagCloud);
//             }
        }
    },
    loadTagCloud: function(active) {
        // Loads the tag cloud.  If *active* is given it must be one of 'tags' or 'autotags'.  It will mark the appropriate header as inactive and load the respective tags.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            delay = 1000,
            existingPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            existingTagCloud = u.getNode('#'+prefix+'bm_tagcloud'),
            existingTagCloudUL = u.getNode('#'+prefix+'bm_tagcloud_ul'),
            existingTip = u.getNode('#'+prefix+'bm_tagcloud_tip'),
            existingTagsLink = u.getNode('#'+prefix+'bm_tags_header_link'),
            existingAutotagsLink = u.getNode('#'+prefix+'bm_autotags_header_link'),
            bmTagCloud = u.createElement('div', {'id': 'bm_tagcloud', 'class': 'sectrans'}),
            bmTagCloudUL = u.createElement('ul', {'id': 'bm_tagcloud_ul'}),
            bmTagCloudTip = u.createElement('span', {'id': 'bm_tagcloud_tip', 'class': 'sectrans'}),
            bmTagsHeader = u.createElement('h3', {'class': 'sectrans'}),
            pipeSeparator = u.createElement('span'),
            bmTagsHeaderTagsLink = u.createElement('a', {'id': 'bm_tags_header_link'}),
            bmTagsHeaderAutotagsLink = u.createElement('a', {'id': 'bm_autotags_header_link'}),
            allTags = b.getTags(b.bookmarks),
            allAutotags = b.getAutotags(b.bookmarks);
        bmTagsHeaderTagsLink.onclick = function(e) {
            b.loadTagCloud('tags');
        }
        bmTagsHeaderAutotagsLink.onclick = function(e) {
            b.loadTagCloud('autotags');
        }
        if (active) {
            if (active == 'tags') {
                if (existingAutotagsLink) {
                    existingTagsLink.className = '';
                    existingAutotagsLink.className = 'inactive';
                } else {
                    bmTagsHeaderAutotagsLink.className = 'inactive';
                }
            } else if (active == 'autotags') {
                if (existingTagsLink) {
                    existingTagsLink.className = 'inactive';
                    existingAutotagsLink.className = '';
                } else {
                    bmTagsHeaderTagsLink.className = 'inactive';
                }
            }
        }
        if (existingTagCloudUL) {
            // Send all the tags away
            u.toArray(existingTagCloudUL.childNodes).forEach(function(elem) {
                elem.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(elem);
                }, 1000);
            });
            setTimeout(function() {
                u.removeElement(existingTagCloudUL);
            }, 1000);
        }
        if (existingTip) {
            existingTip.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(existingTip);
            }, 800);
        }
        setTimeout(function() { // This looks nicer if it comes last
            bmTagCloudTip.style.opacity = 1;
        }, 3000);
        setTimeout(function() { // Make it go away after a while
            bmTagCloudTip.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(bmTagCloudTip);
            }, 1000);
        }, 30000);
        go.Visual.applyTransform(bmTagsHeader, 'translate(300%, 0)');
        bmTagsHeaderAutotagsLink.innerHTML = "Autotags";
        pipeSeparator.innerHTML = " | ";
        bmTagsHeaderTagsLink.innerHTML = "Tags";
        bmTagsHeader.appendChild(bmTagsHeaderTagsLink);
        bmTagsHeader.appendChild(pipeSeparator);
        bmTagsHeader.appendChild(bmTagsHeaderAutotagsLink);
        bmTagCloudTip.style.opacity = 0;
        bmTagCloudTip.innerHTML = "<br><b>Tip:</b> " + b.generateTip();
        if (existingTagCloud) {
            existingTagCloud.appendChild(bmTagCloudUL);
            existingTagCloud.appendChild(bmTagCloudTip);
        } else {
            bmTagCloud.appendChild(bmTagsHeader);
            bmTagCloud.appendChild(bmTagCloudUL);
            bmTagCloud.appendChild(bmTagCloudTip);
            existingPanel.appendChild(bmTagCloud);
        }
        if (active == 'tags') {
            allTags.forEach(function(tag) {
                var li = u.createElement('li', {'class': 'bm_tag sectrans', 'title': 'Click to filter or drop on a bookmark to tag it.', 'draggable': true});
                li.innerHTML = tag;
                li.addEventListener('dragstart', b.handleDragStart, false);
                go.Visual.applyTransform(li, 'translateX(700px)');
                li.onclick = function(e) {
                    b.addFilterTag(b.bookmarks, tag);
                };
                li.oncontextmenu = function(e) {
                    // Bring up the context menu
                    e.preventDefault(); // Prevent regular context menu
                    b.tagContextMenu(li);
                }
                bmTagCloudUL.appendChild(li);
                if (tag == "Untagged") {
                    li.className = 'bm_tag sectrans untagged';
                }
                setTimeout(function unTrans() {
                    go.Visual.applyTransform(li, '');
                }, delay);
                delay += 50;
            });
        } else if (active == 'autotags') {
            allAutotags.forEach(function(tag) {
                var li = u.createElement('li', {'title': 'Click to filter.'});
                li.innerHTML = tag;
                go.Visual.applyTransform(li, 'translateX(700px)');
                if (u.startsWith('<', tag) || u.startsWith('>', tag)) { // Date tag
                    li.className = 'bm_autotag sectrans';
                    li.onclick = function(e) {
                        b.addFilterDateTag(b.bookmarks, tag);
                    };
                    setTimeout(function unTrans() {
                        go.Visual.applyTransform(li, '');
                        setTimeout(function() {
                            li.className = 'bm_autotag';
                        }, 1000);
                    }, delay);
                } else { // URL type tag
                    li.className = 'bm_autotag bm_urltype_tag sectrans';
                    li.onclick = function(e) {
                        b.addFilterURLTypeTag(b.bookmarks, tag);
                    }
                    setTimeout(function unTrans() {
                        go.Visual.applyTransform(li, '');
                        setTimeout(function() {
                            li.className = 'bm_autotag bm_urltype_tag';
                        }, 1000);
                    }, delay);
                }
                bmTagCloudUL.appendChild(li);

                delay += 50;
            });
        }
        setTimeout(function() {
            go.Visual.applyTransform(bmTagsHeader, '');
        }, 800);
    },
    openBookmark: function(URL) {
        // If the current terminal is in a disconnected state, connects to *URL* in the current terminal.
        // If the current terminal is already connected, opens a new terminal and uses that.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bookmark = b.getBookmarkObj(URL),
            term = localStorage[prefix+'selectedTerminal'],
            termTitle = u.getNode('#'+prefix+'term'+term).title;
        if (URL.indexOf('%s') != -1) { // This is a keyword search bookmark
            b.openSearchDialog(URL, bookmark.name);
            return;
        }
        if (u.startsWith('ssh', URL) || u.startsWith('telnet', URL)) {
            // This is a URL that will be handled by Gate One.  Send it to the terminal:
            if (termTitle == 'Gate One') {
                // Foreground terminal has yet to be connected, use it
                b.incrementVisits(URL);
                go.Input.queue(URL+'\n');
                go.Net.sendChars();
            } else {
                b.incrementVisits(URL);
                go.Terminal.newTerminal();
                setTimeout(function() {
                    go.Input.queue(URL+'\n');
                    go.Net.sendChars();
                }, 250);
            }
        } else {
            // This is a regular URL, open in a new window and let the browser handle it
            b.incrementVisits(URL);
            go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
            window.open(URL);
            return; // All done
        }
        go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
    },
    toggleSortOrder: function() {
        // Reverses the order of the bookmarks list
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            sortDirection = u.getNode('#'+prefix+'bm_sort_direction');
        if (b.sortToggle) {
            b.sortToggle = false;
            b.loadBookmarks();
            go.Visual.applyTransform(sortDirection, 'rotate(0deg)');
        } else {
            b.sortToggle = true;
            b.loadBookmarks();
            go.Visual.applyTransform(sortDirection, 'rotate(180deg)');
        }
    },
    filterBookmarksBySearchString: function(str) {
        // Filters bookmarks to those matching *str*
        // Set the global search filter so we can use it within other functions
        var go = GateOne,
            b = go.Bookmarks;
        b.searchFilter = str;
        b.loadBookmarks();
    },
    addFilterTag: function(bookmarks, tag) {
        // Adds the given tag to the filter list
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.tags) {
            if (b.tags[i] == tag) {
                // Tag already exists, ignore.
                return;
            }
        }
        b.tags.push(tag);
        // NOTE: Saving this for future reference in case I want to add the ability to pre-load Gate One with certain bookmark tag filters or something similar
//         if (window.history.pushState) {
//             var tagString = b.tags.join(',');
//             window.history.pushState("", "Bookmarked. Tag Filter: " + tagString, "/?filtertags=" + tagString);
//         }
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    removeFilterTag: function(bookmarks, tag) {
        // Removes the given tag from the filter list
        logDebug('removeFilterTag tag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.tags) {
            if (b.tags[i] == tag) {
                b.tags.splice(i, 1);
            }
        }
//         if (window.history.pushState) {
//             if (b.tags.length) {
//                 var tagString = b.tags.join(',');
//                 window.history.pushState("", "Bookmarked. Tag Filter: " + tagString, "/?filtertags=" + tagString);
//             } else {
//                 window.history.pushState("", "Default", "/"); // Set it back to the default URL
//             }
//         }
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    addFilterDateTag: function(bookmarks, tag) {
        // Adds the given dateTag to the filter list
        logDebug('addFilterDateTag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.dateTags) {
            if (b.dateTags[i] == tag) {
                // Tag already exists, ignore.
                return;
            }
        }
        b.dateTags.push(tag);
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    removeFilterDateTag: function(bookmarks, tag) {
        // Removes the given dateTag from the filter list
        logDebug("removeFilterDateTag: " + tag);
        var go = GateOne,
            b = go.Bookmarks;
        // Change the &lt; and &gt; back into < and >
        tag = tag.replace('&lt;', '<');
        tag = tag.replace('&gt;', '>');
        for (var i in b.dateTags) {
            if (b.dateTags[i] == tag) {
                b.dateTags.splice(i, 1);
            }
        }
        b.loadBookmarks();
    },
    addFilterURLTypeTag: function(bookmarks, tag) {
        // Adds the given dateTag to the filter list
        logDebug('addFilterURLTypeTag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.URLTypeTags) {
            if (b.URLTypeTags[i] == tag) {
                // Tag already exists, ignore.
                return;
            }
        }
        b.URLTypeTags.push(tag);
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    removeFilterURLTypeTag: function(bookmarks, tag) {
        // Removes the given dateTag from the filter list
        logDebug("removeFilterURLTypeTag: " + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.URLTypeTags) {
            if (b.URLTypeTags[i] == tag) {
                b.URLTypeTags.splice(i, 1);
            }
        }
        b.loadBookmarks();
    },
    getTags: function(/*opt*/bookmarks) {
        // Returns an array of all the tags in Bookmarks.bookmarks or *bookmarks* if given.
        // NOTE: Ordered alphabetically
        var go = GateOne,
            b = go.Bookmarks,
            tagList = [];
        if (!bookmarks) {
            bookmarks = b.bookmarks;
        }
        bookmarks.forEach(function(bookmark) {
            if (bookmark.tags) {
                if (go.Utils.isArray(bookmark.tags)) {
                    bookmark.tags.forEach(function(tag) {
                        if (tagList.indexOf(tag) == -1) {
                            tagList.push(tag);
                        }
                    });
                }
            }
        });
        tagList.sort();
        return tagList;
    },
    getAutotags: function(/*opt*/bookmarks) {
        // Returns an array of all the autotags in Bookmarks.bookmarks or *bookmarks* if given.
        // NOTE: Ordered alphabetically with the URL types coming before date tags
        var go = GateOne,
            b = go.Bookmarks,
            autoTagList = [],
            dateTagList = [];
        if (!bookmarks) {
            bookmarks = b.bookmarks;
        }
        bookmarks.forEach(function(bookmark) {
            var dateObj = new Date(parseInt(bookmark.created)),
                dateTag = b.getDateTag(dateObj),
                urlType = bookmark.url.split(':')[0];
            if (dateTagList.indexOf(dateTag) == -1) {
                dateTagList.push(dateTag);
            }
            if (autoTagList.indexOf(urlType) == -1) {
                autoTagList.push(urlType);
            }
        });
        autoTagList.sort();
        dateTagList.sort();
        return autoTagList.concat(dateTagList);
    },
    openImportDialog: function() {
        // Displays the form where a user can create or edit a bookmark.
        // If *URL* is given, pre-fill the form with the associated bookmark for editing.
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            bmForm = u.createElement('form', {'name': prefix+'bm_import_form', 'id': 'bm_import_form', 'class': 'sectrans', 'enctype': 'multipart/form-data'}),
            importLabel = u.createElement('label', {'style': {'text-align': 'center'}}),
            importFile = u.createElement('input', {'type': 'file', 'id': 'bookmarks_upload', 'name': prefix+'bookmarks_upload'}),
            bmSubmit = u.createElement('button', {'id': 'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            bmHelp = u.createElement('p');
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        importLabel.innerHTML = "Upload bookmarks.html or bookmarks.json";
        importLabel.htmlFor = prefix+'bookmarks_upload';
        bmForm.appendChild(importLabel);
        bmForm.appendChild(importFile);
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmHelp.innerHTML = '<br /><i>Imported bookmarks will be synchronized the next time you click, "Sync Bookmarks".</i>'
        bmForm.appendChild(bmHelp);
        var closeDialog = go.Visual.dialog("Import Bookmarks", bmForm);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // NOTE:  Using HTML5 file uploads here...  Should work fine in Opera, Firefox, and Webkit
            var delay = 1000,
                fileInput = u.getNode('#'+prefix+'bookmarks_upload'),
                file = fileInput.files[0],
                xhr = new XMLHttpRequest(),
                handleStateChange = function(e) {
                    var status = null;
                    try {
                        status = parseInt(e.target.status);
                    } catch(e) {
                        return;
                    }
                    if (e.target.readyState == 4 && status == 200 && e.target.responseText) {
                        var bookmarks = JSON.parse(e.target.responseText),
                            count = b.storeBookmarks(bookmarks, true);
                        go.Visual.displayMessage(count+" bookmarks imported.");
                        go.Visual.displayMessage("Bookmark icons will be retrieved in the background");
                        closeDialog();
                    }
                };
            if (xhr.addEventListener) {
                xhr.addEventListener('readystatechange', handleStateChange, false);
            } else {
                xhr.onreadystatechange = handleStateChange;
            }
            xhr.open('POST', go.prefs.url+'bookmarks/import', true);
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.setRequestHeader("X-File-Name", file.name);
            xhr.send(file);
        }
        bmCancel.onclick = closeDialog;
    },
    exportBookmarks: function(/*opt*/bookmarks) {
        // Allows the user to save their bookmarks as a Netscape-style HTML file.
        // If *bookmarks* is given, that list will be what is exported.  Otherwise the complete bookmark list will be exported.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            form = u.createElement('form', {
                'method': 'post',
                'action': go.prefs.url+'bookmarks/export'
            }),
            bookmarksJSON = u.createElement('textarea', {'name': 'bookmarks'});
        if (!bookmarks) {
            bookmarks = b.bookmarks;
        }
        bookmarksJSON.value = JSON.stringify(bookmarks);
        form.appendChild(bookmarksJSON);
        document.body.appendChild(form);
        form.submit();
        setTimeout(function() {
            // No reason to keep this around
            document.body.removeChild(form);
        }, 1000);
    },
    getDateTag: function(dateObj) {
        // Given a Date() object, returns a string such as "<7 days".  Suitable for use as an autotag.
        var dt = new Date();
        // Substract 7 days from today's date
        dt.setDate(parseInt(dt.getDate())-1);
        if (dt < dateObj) {
            return "<1 day";
        }
        dt.setDate(parseInt(dt.getDate())-6);
        if (dt < dateObj) {
            return "<7 days";
        }
        dt.setDate(parseInt(dt.getDate())-23);
        if (dt < dateObj) {
            return "<30 days";
        }
        dt.setDate(parseInt(dt.getDate())-30);
        if (dt < dateObj) {
            return "<60 days";
        }
        dt.setDate(parseInt(dt.getDate())-120);
        if (dt < dateObj) {
            return "<180 days";
        }
        dt.setDate(parseInt(dt.getDate())-245);
        if (dt < dateObj) {
            return "<1 year";
        }
        return ">1 year";
    },
    allTags: function() {
        // Returns an array of all the tags in localStorage['bookmarks']
        // ordered alphabetically
        var tagList = [],
            bookmarks = JSON.parse(localStorage[prefix+'bookmarks']);
        bookmarks.forEach(function(bookmark) {
            bookmark.tags.forEach(function(tag) {
                if (tagList.indexOf(tag) == -1) {
                    tagList.push(tag);
                }
            });
        });
        tagList.sort();
        return tagList;
    },
    openNewBookmarkForm: function(/*Opt*/URL) {
        // Displays the form where a user can create or edit a bookmark.
        // If *URL* is given, pre-fill the form with the associated bookmark for editing.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            formTitle = "",
            bmForm = u.createElement('form', {'name': prefix+'bm_new_form', 'id': 'bm_new_form', 'class': 'sectrans'}),
            urlInput = u.createElement('input', {'type': 'url', 'id': 'bm_newurl', 'name': prefix+'bm_newurl', 'placeholder': 'ssh://user@host:22 or http://webhost/path', 'required': 'required'}),
            urlLabel = u.createElement('label'),
            nameInput = u.createElement('input', {'type': 'text', 'id': 'bm_new_name', 'name': prefix+'bm_new_name', 'placeholder': 'Web App Server 2', 'required': 'required'}),
            nameLabel = u.createElement('label'),
            tagsInput = u.createElement('input', {'type': 'text', 'id': 'bm_newurl_tags', 'name': prefix+'bm_newurl_tags', 'placeholder': 'Linux, New York, Production'}),
            tagsLabel = u.createElement('label'),
            notesTextarea = u.createElement('textarea', {'id': 'bm_new_notes', 'name': prefix+'bm_new_notes', 'placeholder': 'e.g. Supported by Global Ops'}),
            notesLabel = u.createElement('label'),
            bmSubmit = u.createElement('button', {'id': 'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        urlLabel.innerHTML = "URL";
        urlLabel.htmlFor = prefix+'bm_newurl';
        nameLabel.innerHTML = "Name";
        nameLabel.htmlFor = prefix+'bm_new_name';
        tagsLabel.innerHTML = "Tags";
        tagsLabel.htmlFor = prefix+'bm_newurl_tags';
        notesLabel.innerHTML = "Notes";
        notesLabel.htmlFor = prefix+'bm_new_notes';
        if (typeof(URL) == "string") {
            // Editing an existing bookmark
            var bookmarks = JSON.parse(localStorage[prefix+'bookmarks']),
                count = 0,
                index = null;
            bookmarks.forEach(function(bookmark) {
                if (bookmark.url == URL) {
                    index = count;
                }
                count += 1;
            });
            var bmName = bookmarks[index].name,
                bmTags = bookmarks[index].tags,
                bmNotes = bookmarks[index].notes;
            formTitle = "Edit Bookmark";
            urlInput.value = URL;
            nameInput.value = bmName;
            tagsInput.value = bmTags;
            notesTextarea.value = bmNotes;
        } else {
            // Creating a new bookmark (blank form)
            formTitle = "New Bookmark";
        }
        bmForm.appendChild(urlLabel);
        bmForm.appendChild(urlInput);
        bmForm.appendChild(nameLabel);
        bmForm.appendChild(nameInput);
        bmForm.appendChild(tagsLabel);
        bmForm.appendChild(tagsInput);
        bmForm.appendChild(notesLabel);
        bmForm.appendChild(notesTextarea);
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        setTimeout(function() {
            u.getNode('#'+prefix+'bm_newurl').focus();
        }, 1000);
        var closeDialog = go.Visual.dialog(formTitle, bmForm);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // Grab the form values
            var url = u.getNode('#'+prefix+'bm_newurl').value,
                name = u.getNode('#'+prefix+'bm_new_name').value,
                tags = u.getNode('#'+prefix+'bm_newurl_tags').value,
                notes = u.getNode('#'+prefix+'bm_new_notes').value,
                now = new Date();
            // Fix any missing trailing slashes in the URL
            if (url.slice(0,4) == "http" && url.indexOf('/', 7) == -1) {
                url = url + "/";
            }
            if (tags) {
                // Convert to list
                tags = tags.split(',');
                tags = tags.map(function(item) {
                    return item.trim();
                });
            } else {
                tags = ['Untagged'];
            }
            if (typeof(URL) != "string") { // We're creating a new bookmark
                // Construct a new bookmark object
                var bm = {
                    'url': url,
                    'name': name,
                    'tags': tags,
                    'notes': notes,
                    'visits': 0,
                    'updated': now.getTime(),
                    'created': now.getTime(),
                    'updateSequenceNum': 0, // This will get set when synchronizing with the server
                    'images': {'favicon': null}
                };
                // Double-check there isn't already an existing bookmark with this URL
                for (var i in b.bookmarks) {
                    if (b.bookmarks[i].url == url) {
                        go.Visual.displayMessage('Error: Bookmark already exists with this URL.');
                        return;
                    }
                }
                b.createOrUpdateBookmark(bm);
                // Fetch its icon
                b.updateIcon(bm);
                // Keep everything sync'd up.
                setTimeout(function() {
                    var USN = localStorage[prefix+'USN'] || 0;
                    go.ws.send(JSON.stringify({'bookmarks_get': USN}));
                    b.createPanel();
                    closeDialog();
                }, 100);
            } else {
                // Find the existing bookmark and replace it.
                for (var i in b.bookmarks) {
                    if (b.bookmarks[i].url == URL) { // Note that we're matching the original URL
                        // This is our bookmark
                        b.bookmarks[i].url = url;
                        b.bookmarks[i].name = name;
                        b.bookmarks[i].notes = notes;
                        b.bookmarks[i].tags = tags;
                        b.bookmarks[i].updated = now.getTime();
                        b.bookmarks[i].updateSequenceNum = 0;
                        if (url != URL) { // We're changing the URL for this bookmark
                            // Have to delete the old one since the URL is used as the index in the indexedDB
                            b.removeBookmark(URL); // Delete the original URL
                        }
                        // Store the modified bookmark
                        b.createOrUpdateBookmark(b.bookmarks[i]);
                        // Re-fetch its icon
                        setTimeout(function() {
                            b.updateIcon(b.bookmarks[i]);
                            setTimeout(function() {
                                b.createPanel();
                                closeDialog();
                            }, 100);
                        }, 100);
                        break;
                    }
                }
            }
        }
        bmCancel.onclick = closeDialog;
    },
    incrementVisits: function(url) {
        // Increments the given bookmark by 1
        var go = GateOne,
            b = go.Bookmarks;
        // Increments the given bookmark by 1
        b.bookmarks.forEach(function(bookmark) {
            if (bookmark.url == url) {
                bookmark.visits += 1;
                bookmark.updated = new Date().getTime(); // So it will sync
                bookmark.updateSequenceNum = 0;
                b.storeBookmark(bookmark);
            }
        });
        b.loadBookmarks(b.sort);
    },
    editBookmark: function(obj) {
        // Slides the bookmark editor form into view
        // Note: Only meant to be called with a bm_edit anchor as *obj*
        var go = GateOne,
            url = obj.parentNode.parentNode.getElementsByClassName("bm_url")[0].href;
        go.Bookmarks.openNewBookmarkForm(url);
    },
    highestUSN: function() {
        // Returns the highest updateSequenceNum in all the bookmarks
        var b = GateOne.Bookmarks,
            highest = 0;
        b.bookmarks.forEach(function(bookmark) {
            if (bookmark['updateSequenceNum'] > highest) {
                highest = bookmark['updateSequenceNum'];
            }
        });
        return highest;
    },
    removeBookmark: function(url, callback) {
        // Removes the bookmark matching *url* from GateOne.Bookmarks.bookmarks and saves the change to localStorage
        // If *callback* is given, it will be called after the bookmark has been deleted
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix;
        // Find the matching bookmark and delete it
        for (var i in b.bookmarks) {
            if (b.bookmarks[i].url == url) {
                b.bookmarks.splice(i, 1); // Remove the bookmark in question.
            }
        }
        // Now save our new bookmarks list to disk
        localStorage[prefix+'bookmarks'] = JSON.stringify(b.bookmarks);
        if (callback) {
            callback();
        }
    },
    deleteBookmark: function(obj) {
        // Asks the user for confirmation then deletes the chosen bookmark...
        // *obj* can either be a URL (string) or the "go_bm_delete" anchor tag.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            url = null,
            count = 0,
            remove = null,
            confirmElement = u.createElement('div', {'id': 'bm_confirm_delete', 'class': 'bookmark halfsectrans'}),
            yes = u.createElement('button', {'id': 'bm_yes', 'class': 'button black'}),
            no = u.createElement('button', {'id': 'bm_no', 'class': 'button black'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks');
        if (typeof(obj) == "string") {
            url = obj;
        } else {
            // Assume this is an anchor tag from the onclick event
            url = obj.parentNode.parentNode.getElementsByClassName("bm_url")[0].href;
        }
        yes.innerHTML = "Yes";
        no.innerHTML = "No";
        yes.onclick = function(e) {
            var USN = localStorage[prefix+'USN'] || 0;
            go.Visual.applyTransform(obj.parentNode.parentNode, 'translate(-200%, 0)');
            // Find the matching bookmark and delete it
            for (var i in b.bookmarks) {
                if (b.bookmarks[i].url == url) {
                    b.bookmarks.splice(i, 1); // Remove the bookmark in question.
                }
            }
            // Now save our new bookmarks list to disk
            localStorage[prefix+'bookmarks'] = JSON.stringify(b.bookmarks);
            // Keep everything sync'd up.
            go.ws.send(JSON.stringify({'bookmarks_get': USN}));
//             u.xhrGet(go.prefs.url+'bookmarks/sync?updateSequenceNum='+USN, b.syncBookmarks);
            setTimeout(function() {
                u.removeElement(obj.parentNode.parentNode);
            }, 1000);
        };
        no.onclick = function(e) {
            // Remove the confirmation element
            var confirm = u.getNode('#'+go.prefs.prefix+'bm_confirm_delete');
            confirm.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(confirm);
            }, 500);
        };
        // Confirm the user wants to delete the bookmark
        confirmElement.innerHTML = "Are you sure you want to delete this bookmark?<br />";
        confirmElement.appendChild(no);
        confirmElement.appendChild(yes);
        obj.parentNode.parentNode.appendChild(confirmElement);
        setTimeout(function() {
            confirmElement.style.opacity = 1;
        }, 250);
        // Save this bookmark in the deleted bookmarks list so we can let the server know the next time we sync
        var deletedBookmarks = localStorage[prefix+'deletedBookmarks'],
            deleted = new Date().getTime();
        if (!deletedBookmarks) {
            localStorage[prefix+'deletedBookmarks'] = JSON.stringify([{'url': url, 'deleted': deleted}]);
        } else {
            var existing = JSON.parse(deletedBookmarks);
            existing.push({'url': url, 'deleted': deleted});
            localStorage[prefix+'deletedBookmarks'] = JSON.stringify(existing);
        }
    },
    updateUSN: function(obj) {
        // Updates the USN of the bookmark matching *obj* in GateOne.Bookmarks.bookmarks (and on disk).
        var go = GateOne,
            b = go.Bookmarks,
            matched = null;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i]) {
                if (b.bookmarks[i].url == obj.url) {
                    // Replace this one
                    b.bookmarks[i].updateSequenceNum = obj.updateSequenceNum;
                    matched = b.bookmarks[i];
                }
            }
        };
        // storeBookmark takes care of duplicates automatically
        if (matched) {
            b.storeBookmark(matched);
        }
    },
    createOrUpdateBookmark: function(obj) {
        // Creates or updates a bookmark (in Bookmarks.bookmarks and storage) using *obj*
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            matched = false;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i]) {
                if (b.bookmarks[i].url == obj.url) {
                    // Double-check the images to make sure we're not throwing one away
                    if (u.items(b.bookmarks[i].images).length) {
                        if (!u.items(obj.images).length) {
                            // No images in obj. Replace them with existing
                            obj['images'] = b.bookmarks[i].images;
                        }
                    }
                    // Replace this one
                    b.bookmarks[i] = obj;
                    matched = true;
                }
            }
        };
        if (!matched) {
            // Fix the name (i.e. remove leading spaces)
            obj.name = obj.name.trim();
            b.bookmarks.push(obj);
        }
        // Check if this is a keyword search
        if (obj.url.indexOf('%s') != -1) {
            // Auto-tag Searches with the "Searches" tag
            if (obj.tags.indexOf('Searches') == -1) {
                obj.tags.push('Searches');
            }
        }
        // storeBookmark takes care of duplicates automatically
        b.storeBookmark(obj);
        // Add this bookmark to the icon fetching queue
        localStorage[prefix+'iconQueue'] += obj.url + '\n';
    },
    getMaxBookmarks: function(elem) {
    // Calculates and returns the number of bookmarks that will fit in the given element ID (elem).
        try {
            var go = GateOne,
                b = go.Bookmarks,
                u = go.Utils,
                node = u.getNode(elem),
                tempBookmark = {
                    'url': "http://tempbookmark",
                    'name': "You should not see this",
                    'tags': [],
                    'notes': "This should never be visible.  If you see this, well, sigh.",
                    'visits': 0,
                    'updated': new Date().getTime(),
                    'created': new Date().getTime(),
                    'updateSequenceNum': 0, // This will get set when synchronizing with the server
                    'images': {}
                },
                bmElement = b.createBookmark(node, tempBookmark, 1000),
                nodeStyle = window.getComputedStyle(node, null),
                bmStyle = window.getComputedStyle(bmElement, null),
                nodeHeight = parseInt(nodeStyle['height'].split('px')[0]),
                height = parseInt(bmStyle['height'].split('px')[0]),
                marginBottom = parseInt(bmStyle['marginBottom'].split('px')[0]),
                paddingBottom = parseInt(bmStyle['paddingBottom'].split('px')[0]),
                borderBottomWidth = parseInt(bmStyle['borderBottomWidth'].split('px')[0]),
                borderTopWidth = parseInt(bmStyle['borderTopWidth'].split('px')[0]),
                bookmarkHeight = height+marginBottom+paddingBottom+borderBottomWidth+borderTopWidth,
                max = Math.floor(nodeHeight/ bookmarkHeight);
        } catch(e) {
            return 1; // Errors can happen when loadBookmarks is called too quickly sometimes.  Almost always auto-corrects itself so no big deal.
        }
        u.removeElement(bmElement); // Don't want this hanging around
        return max;
    },
    loadPagination: function(bookmarks, /*opt*/page) {
        // Sets up the pagination for the given array of bookmarks and returns the pagination node.
        // If *page* is given, the pagination will highlight the given page number and adjust prev/next accordingly
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmPaginationUL = u.createElement('ul', {'id': 'bm_pagination_ul', 'class': 'bm_pagination halfsectrans'}),
            bmContainer = u.getNode('#'+prefix+'bm_container'),
            bmMax = b.getMaxBookmarks('#'+prefix+'bm_container'),
            bmPages = Math.ceil(bookmarks.length/bmMax),
            prev = u.createElement('li', {'class': 'bm_page halfsectrans'}),
            next = u.createElement('li', {'class': 'bm_page halfsectrans'});
        // Add the paginator
        if (typeof(page) == 'undefined' || page == null) {
            page = 0;
        }
        if (page == 0) {
            prev.className = 'bm_page halfsectrans inactive';
        } else {
            prev.onclick = function(e) {
                e.preventDefault();
                b.page -= 1;
                b.loadBookmarks();
            }
        }
        prev.innerHTML = '<a id="'+prefix+'bm_prevpage" href="javascript:void(0)">« Previous</a>';
        bmPaginationUL.appendChild(prev);
        if (bmPages > 0) {
            for (var i=0; i<=(bmPages-1); i++) {
                var li = u.createElement('li', {'class': 'bm_page halfsectrans'});
                if (i == page) {
                    li.innerHTML = '<a class="active" href="javascript:void(0)">'+(i+1)+'</a>';
                } else {
                    li.innerHTML = '<a href="javascript:void(0)">'+(i+1)+'</a>';
                    li.title = i+1;
                    li.onclick = function(e) {
                        e.preventDefault();
                        b.page = parseInt(this.title)-1;
                        b.loadBookmarks();
                    }
                }
                bmPaginationUL.appendChild(li);
            }
        } else {
            var li = u.createElement('li', {'class': 'bm_page halfsectrans'});
            li.innerHTML = '<a href="javascript:void(0)" class="active">1</a>';
            bmPaginationUL.appendChild(li);
        }
        if (page == bmPages-1 || bmPages == 0) {
            next.className = 'bm_page halfsectrans inactive';
        } else {
            next.onclick = function(e) {
                e.preventDefault();
                b.page += 1;
                b.loadBookmarks();
            }
        }
        next.innerHTML = '<a id="'+prefix+'bm_nextpage" href="javascript:void(0)">Next »</a>';
        bmPaginationUL.appendChild(next);
        return bmPaginationUL;
    },
    getBookmarkObj: function(URL) {
        // Returns the bookmark object with the given *URL*
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i].url == URL) {
                return b.bookmarks[i];
            }
        }
    },
    addTagToBookmark: function(URL, tag) {
        // Adds the given *tag* to the bookmark object associated with *URL*
        logDebug('addTagToBookmark tag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            goDiv = u.getNode(go.prefs.goDiv),
            visibleBookmarks = u.toArray(goDiv.getElementsByClassName('bookmark'));
        for (var i in b.bookmarks) {
            if (b.bookmarks[i].url == URL) {
                b.bookmarks[i].tags.push(tag);
                // Now remove the "Untagged" tag if present
                for (var n in b.bookmarks[i].tags) {
                    if (b.bookmarks[i].tags[n] == 'Untagged') {
                        b.bookmarks[i].tags.splice(n, 1);
                    }
                }
                // Now make the change permanent
                b.storeBookmark(b.bookmarks[i]);
            }
        }
        visibleBookmarks.forEach(function(bookmark) {
            var bmURL = bookmark.getElementsByClassName('bm_url')[0].href,
                bmTaglist = bookmark.getElementsByClassName('bm_taglist')[0];
            if (URL == bmURL) {
                // This is our bookmark, append this tag to bm_tags
                var bmTag = u.createElement('li', {'class': 'bm_tag'});
                bmTag.innerHTML = tag;
                bmTag.onclick = function(e) {
                    b.addFilterTag(b.filteredBookmarks, tag);
                };
                bmTaglist.appendChild(bmTag);
            }
            // Now remove the "Untagged" tag
            for (var i in bmTaglist.childNodes) {
                if (bmTaglist.childNodes[i].innerHTML == "Untagged") {
                    u.removeElement(bmTaglist.childNodes[i]);
                }
            }
        });
    },
    storeBookmark: function(bookmarkObj, /*opt*/callback) {
        // Stores the given *bookmarkObj* in the DB
        // if *callback* is given, will be executed after the bookmark is stored with the bookmarkObj as the only argument
        // Assume Bookmarks.bookmarks has already been updated and stringify them to localStorage['bookmarks']
        localStorage[GateOne.prefs.prefix+'bookmarks'] = JSON.stringify(GateOne.Bookmarks.bookmarks);
        if (callback) {
            callback(bookmarkObj);
        }
    },
    renameTag: function(oldName, newName) {
        // Renames the tag with *oldName* to be *newName* for all notes that have it attached.
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            success = false;
        b.bookmarks.forEach(function(bookmark) {
            for (var i in bookmark.tags) {
                if (bookmark.tags[i] == oldName) {
                    bookmark.tags[i] = newName;
                    b.createOrUpdateBookmark(bookmark);
                    success = true;
                }
            }
        });
        if (success) {
            go.Visual.displayMessage(oldName + " has been renamed to " + newName);
            // Mark down that we've renamed this tag so we can update Evernote at the next sync
            if (localStorage[prefix+'renamedTags']) {
                var renamedTags = JSON.parse(localStorage[prefix+'renamedTags']);
                renamedTags.push(oldName + ',' + newName);
                localStorage[prefix+'renamedTags'] = JSON.stringify(renamedTags);
            } else {
                localStorage[prefix+'renamedTags'] = JSON.stringify([oldName + ',' + newName]);
            }
            b.createPanel();
        }
    },
    tagContextMenu: function(elem) {
        // Called when we right-click on a tag
        // Close any existing context menu before we do anything else
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            existing = u.getNode('#'+prefix+'bm_context'),
            offset = b.getOffset(elem),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanelWidth = bmPanel.offsetWidth,
            rename = u.createElement('a', {'id': 'bm_context_rename', 'class': 'pointer'}),
            cancel = u.createElement('a', {'id': 'bm_context_cancel', 'class': 'pointer'}),
            menu = u.createElement('div', {'id': 'bm_context', 'class': 'quartersectrans'});
        if (existing) {
            existing.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(existing);
            }, 1000);
        }
        rename.innerHTML = "Rename: " + elem.innerHTML;
        cancel.innerHTML = "Cancel";
        menu.appendChild(rename);
        menu.appendChild(cancel);
        menu.style.opacity = 0;
        rename.onclick = function(e) {
            menu.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(menu);
            }, 1000);
            b.openRenameDialog(elem.innerHTML);
        }
        cancel.onclick = function(e) {
            menu.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(menu);
            }, 1000);
        }
        bmPanel.appendChild(menu);
        if (bmPanelWidth-offset.left < menu.offsetWidth) {
            menu.style['right'] = '0px';
        } else {
            menu.style['left'] = offset.left+'px';
        }
        menu.style['top'] = offset.top+'px';
        setTimeout(function() {
            menu.style.opacity = 1;
        }, 250);
    },
    openRenameDialog: function(tagName) {
        // Creates a dialog where the user can rename the given *tagName*
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            bmForm = u.createElement('form', {'name': prefix+'bm_dialog_form', 'id': 'bm_dialog_form', 'class': 'sectrans'}),
            bmSubmit = u.createElement('button', {'id': 'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        bmForm.innerHTML = '<label for="'+prefix+'bm_newtagname">New Name</label><input type="text" name="'+prefix+'bm_newtagname" id="'+prefix+'bm_newtagname" autofocus required>';
        bmCancel.onclick = closeDialog;
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        var closeDialog = go.Visual.dialog("Rename Tag: " + tagName, bmForm);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            var newName = u.getNode('#'+prefix+'bm_newtagname').value;
            b.renameTag(tagName, newName);
            closeDialog();
        }
    },
    openExportDialog: function() {
        // Creates a dialog where the user can select some options and export their bookmarks
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            bmForm = u.createElement('form', {'name': prefix+'bm_export_form', 'id': 'bm_export_form', 'class': 'sectrans'}),
            buttonContainer = u.createElement('div', {'id': 'bm_buttons'}),
            bmExportAll = u.createElement('button', {'id': 'bm_export_all', 'type': 'submit', 'value': 'all', 'class': 'button black'}),
            bmExportFiltered = u.createElement('button', {'id': 'bm_export_filtered', 'type': 'submit', 'value': 'all', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        bmForm.innerHTML = '<p>You can export all bookmarks or just bookmarks within the current filter/search</p>';
        buttonContainer.appendChild(bmExportAll);
        buttonContainer.appendChild(bmExportFiltered);
        buttonContainer.appendChild(bmCancel);
        bmExportAll.innerHTML = "All Bookmarks";
        bmExportFiltered.innerHTML = "Filtered Bookmarks";
        bmCancel.innerHTML = "Cancel";
        bmForm.appendChild(buttonContainer);
        var closeDialog = go.Visual.dialog('Export Bookmarks', bmForm);
        bmCancel.onclick = closeDialog;
        bmExportAll.onclick = function(e) {
            e.preventDefault();
            b.exportBookmarks();
            closeDialog();
        }
        bmExportFiltered.onclick = function(e) {
            e.preventDefault();
            b.exportBookmarks(b.filteredBookmarks);
            closeDialog();
        }
    },
    openSearchDialog: function(URL, title) {
        // Creates a dialog where the user can utilize a keyword search *URL*
        // *title* will be used to create the dialog title like this:  "Keyword Search: *title*"
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmForm = u.createElement('form', {'name': prefix+'bm_dialog_form', 'id': 'bm_dialog_form', 'class': 'sectrans'}),
            bmSubmit = u.createElement('button', {'id': 'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        bmForm.innerHTML = '<label for='+prefix+'"bm_keyword_seach">Search</label><input type="text" name="'+prefix+'bm_searchstring" id="'+prefix+'bm_searchstring" autofocus required>';
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        var closeDialog = go.Visual.dialog("Keyword Search: " + title, bmForm);
        bmCancel.onclick = closeDialog;
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            b.incrementVisits(URL);
            var searchString = u.getNode('#'+prefix+'bm_searchstring').value;
            window.open(URL.replace('%s', searchString));
            closeDialog();
        }
    },
    generateTip: function() {
        // Returns a string with a tip
        var tips = [
            "You can right-click on a tag to rename it.",
            "You can drag & drop a tag onto a bookmark to tag it.",
            "You can create bookmarks with any kind of URL. Even email address URLs: 'mailto:user@domain.com'.",
            "The 'Filtered Bookmarks' option in the export dialog is a great way to share a subset of your bookmarks with friends and coworkers.",
        ];
        return tips[Math.floor(Math.random()*tips.length)];
    },
    updateProgress: function(name, total, num, /*opt*/desc) {
        // Creates/updates a progress bar given a *name*, a *total*, and *num* representing the current state.
        // Optionally, a description (*desc*) may be provided that will be placed above the progress bar
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            existing = u.getNode('#' + name),
            existingBar = u.getNode('#' + name + 'bar'),
            progress = Math.round((num/total)*100),
            progressContainer = u.createElement('div', {'class': 'bm_progresscontainer', 'id': name}),
            progressBarContainer = u.createElement('div', {'class': 'bm_progressbarcontainer'}),
            progressBar = u.createElement('div', {'class': 'bm_progressbar', 'id': name+'bar'});
        if (existing) {
            existingBar.style.width = progress + '%';
        } else {
            if (desc) {
                progressContainer.innerHTML = desc + "<br />";
            }
            progressBar.style.width = progress + '%';
            progressBarContainer.appendChild(progressBar);
            progressContainer.appendChild(progressBarContainer);
            u.getNode('#'+prefix+'noticecontainer').appendChild(progressContainer);
        }
        if (progress == 100) {
            existing = u.getNode('#' + name); // Have to reset this just in case
            setTimeout(function() {
                existing.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(existing);
                }, 5000);
            }, 1000);
        }
    },
    getOffset: function(el) {
        var _x = 0;
        var _y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        return { top: _y, left: _x };
    },
    handleDragStart: function(e) {
        // Target (this) element is the source node.
        GateOne.Bookmarks.temp = this; // Temporary holding space
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    },
    handleDragOver: function(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
        this.className = 'bookmark over';
        return false;
    },
    handleDragEnter: function(e) {
        // this / e.target is the current hover target.
        this.className = 'bookmark over';
    },
    handleDragLeave: function(e) {
        this.className = 'bookmark sectrans';
    },
    handleDrop: function(e) {
        // this / e.target is current target element.
        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }
        // Don't do anything if dropping the same column we're dragging.
        if (GateOne.Bookmarks.temp != this) {
            // Add the tag to the bookmark it was dropped on.
            var url = this.getElementsByClassName('bm_url')[0].href;
            GateOne.Bookmarks.addTagToBookmark(url, e.dataTransfer.getData('text/html'));
        }
        this.className = 'bookmark halfsectrans';
        GateOne.Bookmarks.temp = "";
        return false;
    },
    handleDragEnd: function(e) {
        // this/e.target is the source node.
//         [].forEach.call(bmElement, function (bmElement) {
//             bmElement.className = 'bookmark sectrans';
//         });
    }
});

})(window);(function(window, undefined) {
var document = window.document; // Have to do this because we're sandboxed

// Useful sandbox-wide stuff
var noop = GateOne.Utils.noop;

// Sandbox-wide shortcuts for each log level (actually assigned in init())
var logFatal = noop;
var logError = noop;
var logWarning = noop;
var logInfo = noop;
var logDebug = noop;

// GateOne.Help (functions related to the help menu/panel)
GateOne.Base.module(GateOne, "Help", "1.0", ['Base']);
GateOne.Base.update(GateOne.Help, {
    init: function() {
        // Setup the help panel
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            helpContent = u.createElement('p', {'id': prefix+'help_content', 'class': 'sectrans', 'style': {'padding-bottom': '0.4em'}}),
            helpPanel = u.createElement('div', {'id': prefix+'panel_help', 'class': 'panel', 'style': {'width': '60%'}}),
            helpPanelH2 = u.createElement('h2', {'id': prefix+'help_title'}),
            helpPanelClose = u.createElement('div', {'id': prefix+'icon_closehelp', 'class': 'panel_close_icon', 'title': "Close This Panel"}),
            helpPanelSections = u.createElement('span', {'id': prefix+'help_sections'}),
            helpPanelUL = u.createElement('ul', {'id': prefix+'help_ol', style: {'margin-left': '1em', 'padding-left': '1em'}}),
            helpPanelAbout = u.createElement('li'),
            helpPanelAboutAnchor = u.createElement('a', {'id': prefix+'help_docs'}),
            helpPanelDocs = u.createElement('li'),
            helpPanelDocsAnchor = u.createElement('a', {'id': prefix+'help_docs'}),
            goDiv = u.getNode(go.prefs.goDiv);
        // Assign our logging function shortcuts if the Logging module is available with a safe fallback
        if (go.Logging) {
            logFatal = go.Logging.logFatal;
            logError = go.Logging.logError;
            logWarning = go.Logging.logWarning;
            logInfo = go.Logging.logInfo;
            logDebug = go.Logging.logDebug;
        }
        // Create our info panel
        helpPanelH2.innerHTML = "Gate One Help";
        helpPanelClose.innerHTML = go.Icons['panelclose'];
        helpPanelH2.appendChild(helpPanelClose);
        helpPanelAboutAnchor.innerHTML = "About Gate One";
        helpPanelAbout.appendChild(helpPanelAboutAnchor);
        helpPanelDocsAnchor.innerHTML = "Gate One's Documentation";
        helpPanelDocs.appendChild(helpPanelDocsAnchor);
        helpPanel.appendChild(helpPanelH2);
        helpPanel.appendChild(helpPanelSections);
        helpPanelUL.appendChild(helpPanelAbout);
        helpPanelUL.appendChild(helpPanelDocs);
        helpContent.appendChild(helpPanelUL);
        helpPanel.appendChild(helpContent);
        go.Visual.applyTransform(helpPanel, 'scale(0)'); // Hidden by default
        goDiv.appendChild(helpPanel); // Doesn't really matter where it goes
        helpPanelAboutAnchor.onclick = function(e) {
            e.preventDefault(); // No need to change the hash
            GateOne.Help.aboutGateOne();
        };
        helpPanelAboutAnchor.onmouseover = function(e) {
            // TODO: Fix the CSS so this code isn't necessary
            this.style.cursor = "pointer";
        };
        helpPanelDocsAnchor.onclick = function(e) {
            e.preventDefault(); // No need to change the hash
            GateOne.Visual.togglePanel('#'+GateOne.prefs.prefix+'panel_help');
            window.open(GateOne.prefs.url+'docs/index.html');
        };
        helpPanelDocsAnchor.onmouseover = function(e) {
            this.style.cursor = "pointer";
        };
        helpPanelClose.onclick = function(e) {
            GateOne.Visual.togglePanel('#'+GateOne.prefs.prefix+'panel_help'); // Scale away, scale away, scale away.
        }
        // Register our keyboard shortcut (Alt-F1)
        go.Input.registerShortcut('KEY_F1', {'modifiers': {'ctrl': false, 'alt': false, 'meta': false, 'shift': true}, 'action': 'GateOne.Help.showHelp()'});
        // These shortcuts just add some helpful messages to regular keyboard shortcuts
        go.Input.registerShortcut('KEY_S', {'modifiers': {'ctrl': true, 'alt': false, 'meta': false, 'shift': false}, 'action': 'GateOne.Visual.displayMessage("Terminal output has been suspended (Ctrl-S). Type Ctrl-Q to resume."); GateOne.Input.queue(String.fromCharCode(19)); GateOne.Net.sendChars();'});

    },
    aboutGateOne: function() { // Displays our credits
        // First we create our settings object to pass to showHelpSection()
        var settingsObj = {
            'helpURL': GateOne.prefs.url+'static/about.html',
            'title': 'About Gate One'
        };
        GateOne.Help.showHelpSection(settingsObj);
    },
    showFirstTimeDialog: function() {
        // Pops up a dialog for first-time users that shows them the basics of Gate One
        var go = GateOne,
            u = go.Utils,
            firstTimeDiv = u.createElement('div', {'id': 'help_firsttime'}),
            dismiss = u.createElement('button', {'id': 'dismiss', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        firstTimeDiv.innerHTML = 'Gate One is an HTML5 web-based terminal emulator...';
        dismiss.innerHTML = "Dismiss";
        firstTimeDiv.appendChild(dismiss);
        var closeDialog = go.Visual.dialog('Welcome to Gate One', firstTimeDiv);
        dismiss.onclick = closeDialog;
    },
    showHelp: function() {
        // Just displays the help panel
        GateOne.Visual.togglePanel('#'+GateOne.prefs.prefix+'panel_help');
    },
    showHelpSection: function(sectionObj) {
        // Shows the given help information by sliding out whatever is in the help panel and sliding in the new help text
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            helpContent = u.getNode('#'+prefix+'help_content'),
            helpPanel = u.getNode('#'+prefix+'panel_help'),
            helpNav = u.createElement('div', {'id': prefix+'help_nav', 'class': 'panel_nav sectrans', 'style': {'padding-bottom': '0.5em'}}),
            helpBack = u.createElement('a', {'id': prefix+'help_back'}),
            newHelpContent = u.createElement('p', {'id': prefix+'help_section', 'class': 'sectrans', 'style': {'padding-bottom': '0.4em'}});
        var displayHelp = function(helpText) {
            go.Visual.applyTransform(helpContent, 'translateX(200%)');
            helpBack.innerHTML = go.Icons['back_arrow'] + " Back";
            helpBack.onclick = function(e) {
                e.preventDefault(); // Don't mess with location.url
                go.Visual.applyTransform(helpNav, 'translateX(200%)');
                go.Visual.applyTransform(newHelpContent, 'translateX(200%)');
                setTimeout(function() {
                    helpPanel.removeChild(newHelpContent);
                    helpPanel.removeChild(helpNav);
                    helpPanel.appendChild(helpContent);
                }, 900);
                setTimeout(function() {
                    go.Visual.applyTransform(helpContent, 'translateX(0)');
                }, 1000);
            };
            helpNav.appendChild(helpBack);
            helpNav.onmouseover = function(e) {
                this.style.cursor = "pointer";
            };
            newHelpContent.innerHTML = helpText;
            go.Visual.applyTransform(helpNav, 'translateX(200%)');
            go.Visual.applyTransform(newHelpContent, 'translateX(200%)');
            setTimeout(function() {
                helpPanel.removeChild(helpContent);
                helpPanel.appendChild(helpNav);
                helpPanel.appendChild(newHelpContent);
            }, 900);
            setTimeout(function() {
                go.Visual.applyTransform(helpNav, 'translateX(0)');
                go.Visual.applyTransform(newHelpContent, 'translateX(0)');
            }, 1000);
        };
        u.xhrGet(sectionObj.helpURL, displayHelp);
    }
});

})(window);(function(window, undefined) {
var document = window.document; // Have to do this because we're sandboxed

// TODO: Move the parts that load and render logs in separate windows into Web Workers so they don't hang the browser while they're being rendered.
// TODO: Bring back *some* client-side logging so things like displayMessage() have somewhere to temporarily store messages so users can look back to re-read them (e.g. Which terminal was that bell just in?).  Probably put it in sessionStorage

// GateOne.Logging
GateOne.Base.module(GateOne, "Logging", '1.0', ['Base', 'Net']);
GateOne.Logging.levels = {
    // Forward and backward
    50: 'FATAL',
    40: 'ERROR',
    30: 'WARNING',
    20: 'INFO',
    10: 'DEBUG',
    'FATAL': 50,
    'ERROR': 40,
    'WARNING': 30,
    'INFO': 20,
    'DEBUG': 10
};
// Tunable logging prefs
if (!GateOne.prefs.logLevel) {
    GateOne.prefs.logLevel = 'INFO';
}
GateOne.Logging.level = GateOne.prefs.logLevel; // This allows it to be adjusted at the client
GateOne.Logging.serverLogs = [];
GateOne.Logging.sortToggle = false;
GateOne.Logging.searchFilter = null;
GateOne.Logging.page = 0; // Used to tracking pagination
GateOne.Logging.delay = 500;
GateOne.Base.update(GateOne.Logging, {
    init: function() {
        var go = GateOne,
            l = go.Logging,
            u = go.Utils,
            prefix = go.prefs.prefix,
            pTag = u.getNode('#'+prefix+'info_actions'),
            infoPanelViewLogs = u.createElement('button', {'id': 'logging_viewlogs', 'type': 'submit', 'value': 'Submit', 'class': 'button black'});
        infoPanelViewLogs.innerHTML = "Log Viewer";
        infoPanelViewLogs.title = "Opens a panel where you can browse, preview, and open all of your server-side session logs."
        infoPanelViewLogs.onclick = function() {
            l.loadLogs(true);
        }
        pTag.appendChild(infoPanelViewLogs);
        l.createPanel();
        // Default sort order is by date, descending, followed by alphabetical order of the title
        l.sortfunc = l.sortFunctions.date;
        localStorage[prefix+'logs_sort'] = 'date';
        // Register our WebSocket actions
        go.Net.addAction('logging_log', l.incomingLogAction);
        go.Net.addAction('logging_logs_complete', l.incomingLogsCompleteAction);
        go.Net.addAction('logging_log_flat', l.displayFlatLogAction);
        go.Net.addAction('logging_log_playback', l.displayPlaybackLogAction);
    },
    setLevel: function(level) {
        // Sets the log level to an integer if the given a string (e.g. "DEBUG").  Leaves it as-is if it's already a number.
        var l = GateOne.Logging;
        if (level === parseInt(level,10)) { // It's an integer, set it as-is
            l.level = level;
        } else { // It's a string, convert it first
            levelStr = level;
            level = l.levels[levelStr]; // Get integer
            l.level = level;
        }
    },
    /** @id MochiKit.Logging.Logger.prototype.logToConsole */
    logToConsole: function (msg) {
        if (typeof(window) != "undefined" && window.console && window.console.log) {
            // Safari and FireBug 0.4
            // Percent replacement is a workaround for cute Safari crashing bug
            window.console.log(msg.replace(/%/g, '\uFF05'));
        } else if (typeof(opera) != "undefined" && opera.postError) {
            // Opera
            opera.postError(msg);
        } else if (typeof(Debug) != "undefined" && Debug.writeln) {
            // IE Web Development Helper (?)
            // http://www.nikhilk.net/Entry.aspx?id=93
            Debug.writeln(msg);
        } else if (typeof(debug) != "undefined" && debug.trace) {
            // Atlas framework (?)
            // http://www.nikhilk.net/Entry.aspx?id=93
            debug.trace(msg);
        }
    },
    log: function(msg, level, destination) {
        /*
        Logs the given *msg* using all of the functions in GateOne.Logging.destinations after being prepended with the date and a string indicating the log level (e.g. "692011-10-25 10:04:28 INFO <msg>") *if* *level* is determined to be greater than the value of GateOne.Logging.level.  If the given *level* is not greater than GateOne.Logging.level *msg* will be discarded (noop).

        *level* can be provided as a string, an integer, null, or be left undefined:

             If an integer, an attempt will be made to convert it to a string using GateOne.Logging.levels but if this fails it will use "lvl:<integer>" as the level string.
             If a string, an attempt will be made to obtain an integer value using GateOne.Logging.levels otherwise GateOne.Logging.level will be used (to determine whether or not the message should actually be logged).
             If undefined, the level will be set to GateOne.Logging.level.
             If null (as opposed to undefined), level info will not be included in the log message.

        If *destination* is given (must be a function) it will be used to log messages like so: destination(message).  The usual conversion of *msg* to *message* will apply.
        */
        var l = GateOne.Logging,
            now = new Date(),
            message = "";
        if (typeof(level) == 'undefined') {
            level = l.level;
        }
        if (level === parseInt(level,10)) { // It's an integer
            if (l.levels[level]) {
                levelStr = l.levels[level]; // Get string
            } else {
                levelStr = "lvl:" + level;
            }
        } else if (typeof(level) == "string") { // It's a string
            levelStr = level;
            if (l.levels[levelStr]) {
                level = l.levels[levelStr]; // Get integer
            } else {
                level = l.level;
            }
        }
        if (level == null) {
            message = l.dateFormatter(now) + " " + msg;
        } else if (level >= l.level) {
            message = l.dateFormatter(now) + ' ' + levelStr + " " + msg;
        }
        if (message) {
            if (!destination) {
                for (var dest in l.destinations) {
                    l.destinations[dest](message);
                }
            } else {
                destination(message);
            }
        }
    },
    // Shortcuts for each log level
    logFatal: function(msg) { GateOne.Logging.log(msg, 'FATAL') },
    logError: function(msg) { GateOne.Logging.log(msg, 'ERROR') },
    logWarning: function(msg) { GateOne.Logging.log(msg, 'WARNING') },
    logInfo: function(msg) { GateOne.Logging.log(msg, 'INFO') },
    logDebug: function(msg) { GateOne.Logging.log(msg, 'DEBUG') },
    addDestination: function(name, dest) {
        // Creates a new log destination named, *name* that calls function *dest* like so:
        //     dest(<log message>)
        //
        // Example:
        //     GateOne.Logging.addDestination('screen', GateOne.Visual.displayMessage);
        // NOTE: The above example is kind of fun.  Try it!
        GateOne.Logging.destinations[name] = dest;
    },
    removeDestination: function(name) {
        // Removes the given log destination from GateOne.Logging.destinations
        if (GateOne.Logging.destinations[name]) {
            delete GateOne.Logging.destinations[name];
        } else {
            GateOne.Logging.logError("No log destination named, '" + name + "'.");
        }
    },
    dateFormatter: function(dateObj) {
        // Converts a Date() object into string suitable for logging
        // e.g. 2011-05-29 13:24:03
        var year = dateObj.getFullYear(),
            month = dateObj.getMonth() + 1, // JS starts months at 0
            day = dateObj.getDate(),
            hours = dateObj.getHours(),
            minutes = dateObj.getMinutes(),
            seconds = dateObj.getSeconds();
        // pad a 0 so it doesn't look silly
        if (month < 10) {
            month = "0" + month;
        }
        if (day < 10) {
            day = "0" + day;
        }
        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    },
    createPanel: function() {
        // Creates the logging panel (just the empty shell)
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_logs'),
            logPanel = u.createElement('div', {'id': 'panel_logs', 'class': 'panel sectrans'}),
            logHeader = u.createElement('div', {'id': 'log_view_header', 'class': 'sectrans'}),
            logHeaderH2 = u.createElement('h2', {'id': 'logging_title'}),
            logHRFix = u.createElement('hr', {'style': {'opacity': 0}}),
            panelClose = u.createElement('div', {'id': 'icon_closepanel', 'class': 'panel_close_icon', 'title': "Close This Panel"}),
            logViewContent = u.createElement('div', {'id': 'logview_container', 'class': 'sectrans'}),
            logPagination = u.createElement('div', {'id': 'log_pagination', 'class': 'sectrans'}),
            logInfoContainer = u.createElement('div', {'id': 'log_info'}),
            logListContainer = u.createElement('div', {'id': 'log_listcontainer'}),
            logPreviewIframe = u.createElement('iframe', {'id': 'log_preview'}),
            hr = u.createElement('hr'),
            logElemHeader = u.createElement('div', {'id': 'logitems_header', 'class':'table_header_row'}),
            titleSpan = u.createElement('span', {'id': 'log_titlespan', 'class':'table_cell table_header_cell'}),
            dateSpan = u.createElement('span', {'id': 'log_datespan', 'class':'table_cell table_header_cell'}),
            sizeSpan = u.createElement('span', {'id': 'log_sizespan', 'class':'table_cell table_header_cell'}),
            sortOrder = u.createElement('span', {'id': 'logs_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
            logMetadataDiv = u.createElement('div', {'id': 'log_metadata'});
        logHeaderH2.innerHTML = 'Log Viewer: Loading...';
        panelClose.innerHTML = go.Icons['panelclose'];
        panelClose.onclick = function(e) {
            // Stop the playing iframe so it doesn't eat up cycles while no one is watching it
            var previewIframe = u.getNode('#'+prefix+'log_preview'),
                logMetadataDiv = u.getNode('#'+prefix+'log_metadata'),
                iframeDoc = previewIframe.contentWindow.document;
            // Remove existing content first
            while (logMetadataDiv.childNodes.length >= 1 ) {
                logMetadataDiv.removeChild(logMetadataDiv.firstChild);
            }
            iframeDoc.open();
            iframeDoc.write('<html><head><title>Preview Iframe</title></head><body style="background-color: #000; color: #fff; font-size: 1em; font-style: italic;">Click on a log to view a preview and metadata.</body></html>');
            iframeDoc.close();
            GateOne.Visual.togglePanel('#'+GateOne.prefs.prefix+'panel_logs'); // Scale away, scale away, scale away.
        }
        logHeader.appendChild(logHeaderH2);
        logHeader.appendChild(panelClose);
        logHeader.appendChild(logHRFix); // The HR here fixes an odd rendering bug with Chrome on Mac OS X
        logInfoContainer.appendChild(logPagination);
        logInfoContainer.appendChild(logPreviewIframe);
        logInfoContainer.appendChild(hr);
        logInfoContainer.appendChild(logMetadataDiv);
        logViewContent.appendChild(logInfoContainer);
        if (l.sortToggle) {
            sortOrder.innerHTML = "▴";
        } else {
            sortOrder.innerHTML = "▾";
        }
        titleSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'logs_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'logs_sort_order');
            l.sortfunc = l.sortFunctions.alphabetical;
            if (localStorage[prefix+'logs_sort'] != 'alpha') {
                localStorage[prefix+'logs_sort'] = 'alpha';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (l.sortToggle) {
                    l.sortToggle = false;
                } else {
                    l.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(logElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (l.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            l.loadLogs();
        }
        dateSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'logs_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'logs_sort_order');
            l.sortfunc = l.sortFunctions.date;
            if (localStorage[prefix+'logs_sort'] != 'date') {
                localStorage[prefix+'logs_sort'] = 'date';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (l.sortToggle) {
                    l.sortToggle = false;
                } else {
                    l.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(logElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (l.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            l.loadLogs();
        }
        sizeSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'logs_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'logs_sort_order');
            l.sortfunc = l.sortFunctions.size;
            if (localStorage[prefix+'logs_sort'] != 'size') {
                localStorage[prefix+'logs_sort'] = 'size';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (l.sortToggle) {
                    l.sortToggle = false;
                } else {
                    l.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(logElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (l.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            l.loadLogs();
        }
        titleSpan.innerHTML = "Title";
        dateSpan.innerHTML = "Date";
        sizeSpan.innerHTML = "Size";
        if (localStorage[prefix+'logs_sort'] == 'alpha') {
            titleSpan.className = 'table_cell table_header_cell active';
            titleSpan.appendChild(sortOrder);
        } else if (localStorage[prefix+'logs_sort'] == 'date') {
            dateSpan.className = 'table_cell table_header_cell active';
            dateSpan.appendChild(sortOrder);
        } else if (localStorage[prefix+'logs_sort'] == 'size') {
            sizeSpan.className = 'table_cell table_header_cell active';
            sizeSpan.appendChild(sortOrder);
        }
        logElemHeader.appendChild(titleSpan);
        logElemHeader.appendChild(sizeSpan);
        logElemHeader.appendChild(dateSpan);
        logListContainer.appendChild(logElemHeader);
        logViewContent.appendChild(logListContainer);
        if (existingPanel) {
            // Remove everything first
            while (existingPanel.childNodes.length >= 1 ) {
                existingPanel.removeChild(existingPanel.firstChild);
            }
            existingPanel.appendChild(logHeader);
            existingPanel.appendChild(logViewContent);
        } else {
            logPanel.appendChild(logHeader);
            logPanel.appendChild(logViewContent);
            u.getNode(go.prefs.goDiv).appendChild(logPanel);
        }
        var logPreviewIframeDoc = logPreviewIframe.contentWindow.document;
        logPreviewIframeDoc.open();
        logPreviewIframeDoc.write('<html><head><title>Preview Iframe</title></head><body style="background-color: #000; color: #fff; font-size: 1em; font-style: italic;">Click on a log to view a preview and metadata.</body></html>');
        logPreviewIframeDoc.close();
    },
    loadLogs: function(forceUpdate) {
        // After GateOne.Logging.serverLogs has been populated, this function will redraw the view depending on sort and pagination values
        // If *forceUpdate*, empty out GateOne.Logging.serverLogs and tell the server to send us a new list.
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            logCount = 0,
            serverLogs = l.serverLogs.slice(0), // Make a local copy since we're going to mess with it
            existingPanel = u.getNode('#'+prefix+'panel_logs'),
            logViewHeader = u.getNode('#'+prefix+'logging_title'),
            existingHeader = u.getNode('#'+prefix+'logitems_header'),
            pagination = u.getNode('#'+prefix+'log_pagination'),
            paginationUL = u.getNode('#'+prefix+'log_pagination_ul'),
            logInfoContainer = u.getNode('#'+prefix+'log_info'),
            logListContainer = u.getNode('#'+prefix+'log_listcontainer'),
            logElements = u.toArray(document.getElementsByClassName('table_row')),
            maxItems = l.getMaxLogItems(existingPanel) - 4; // -4 should account for the header with a bit of room at the bottom too
        l.delay = 500; // Reset it
        // Make sure the panel is visible
        if (go.Visual.getTransform(existingPanel) != "scale(1)") {
            go.Visual.togglePanel('#'+prefix+'panel_logs');
        }
        existingPanel.style['overflow-y'] = "hidden"; // Only temporary while we're loading
        setTimeout(function() {
            existingPanel.style['overflow-y'] = "auto"; // Set it back after everything is loaded
        }, 1000);
        if (logElements) { // Remove any existing log elements from the list
            logElements.forEach(function(logElem) {
                logElem.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(logElem);
                }, 1000);
            });
        }
        // Remove the pagination UL
        if (paginationUL) {
            u.removeElement(paginationUL);
        };
        if (!l.serverLogs.length || forceUpdate) {
            // Make sure GateOne.Logging.serverLogs is empty and kick off the process to list them
            l.serverLogs = [];
            setTimeout(function() {
                go.ws.send(JSON.stringify({'logging_get_logs': true}));
            }, 1000); // Let the panel expand before we tell the server to start sending us logs
            return;
        }
        // Apply the sort function
        serverLogs.sort(l.sortfunc);
        if (l.sortToggle) {
            serverLogs.reverse();
        }
        if (l.page) {
            var pageLogs = null;
            if (maxItems*(l.page+1) < serverLogs.length) {
                pageLogs = serverLogs.slice(maxItems*l.page, maxItems*(l.page+1));
            } else {
                pageLogs = serverLogs.slice(maxItems*l.page, serverLogs.length-1);
            }
            pageLogs.forEach(function(logObj) {
                if (logCount < maxItems) {
                    l.createLogItem(logListContainer, logObj, l.delay);
                }
                logCount += 1;
                l.delay += 50;
            });
        } else {
            serverLogs.forEach(function(logObj) {
                if (logCount < maxItems) {
                    l.createLogItem(logListContainer, logObj, l.delay);
                }
                logCount += 1;
                l.delay += 50;
            });
        }
        paginationUL = l.loadPagination(serverLogs, l.page);
        pagination.appendChild(paginationUL);
    },
    getMaxLogItems: function(elem) {
    // Calculates and returns the number of log items that will fit in the given element ID (elem).
        try {
            var go = GateOne,
                l = go.Logging,
                u = go.Utils,
                node = u.getNode(elem),
                tempLog = {
                    'cols': 203,
                    'connect_string': "user@host",
                    'end_date': "1324495629180",
                    'filename': "20111221142606981294.golog",
                    'frames': 108,
                    'rows': 56,
                    'size': 13817,
                    'start_date': "1324495567011",
                    'user': "daniel.mcdougall@liftoffsoftware.com",
                    'version': "1.0"
                },
                logItemElement = l.createLogItem(node, tempLog, 500);
                nodeStyle = window.getComputedStyle(node, null),
                logElemStyle = window.getComputedStyle(logItemElement, null),
                nodeHeight = parseInt(nodeStyle['height'].split('px')[0]),
                height = parseInt(logElemStyle['height'].split('px')[0]),
                marginBottom = parseInt(logElemStyle['marginBottom'].split('px')[0]),
                paddingBottom = parseInt(logElemStyle['paddingBottom'].split('px')[0]),
                borderBottomWidth = parseInt(logElemStyle['borderBottomWidth'].split('px')[0]),
                borderTopWidth = parseInt(logElemStyle['borderTopWidth'].split('px')[0]),
                logElemHeight = height+marginBottom+paddingBottom+borderBottomWidth+borderTopWidth,
                max = Math.floor(nodeHeight/ logElemHeight);
        } catch(e) {
            return 1;
        }
        u.removeElement(logItemElement); // Don't want this hanging around
        return max;
    },
    loadPagination: function(logItems, /*opt*/page) {
        // Sets up the pagination for the given array of *logItems* and returns the pagination node.
        // If *page* is given, the pagination will highlight the given page number and adjust prev/next accordingly
        var go = GateOne,
            l = go.Logging,
            u = go.Utils,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_logs'),
            logPaginationUL = u.createElement('ul', {'id': 'log_pagination_ul', 'class': 'log_pagination halfsectrans'}),
            logViewContent = u.getNode('#'+prefix+'logview_container'),
            maxItems = l.getMaxLogItems(existingPanel) - 4,
            logPages = Math.ceil(logItems.length/maxItems),
            prev = u.createElement('li', {'class': 'log_page halfsectrans'}),
            next = u.createElement('li', {'class': 'log_page halfsectrans'});
        // Add the paginator
        if (typeof(page) == 'undefined' || page == null) {
            page = 0;
        }
        if (page == 0) {
            prev.className = 'log_page halfsectrans inactive';
        } else {
            prev.onclick = function(e) {
                e.preventDefault();
                l.page -= 1;
                l.loadLogs();
            }
        }
        prev.innerHTML = '<a id="'+prefix+'log_prevpage" href="javascript:void(0)">« Previous</a>';
        logPaginationUL.appendChild(prev);
        if (logPages > 0) {
            for (var i=0; i<=(logPages-1); i++) {
                var li = u.createElement('li', {'class': 'log_page halfsectrans'});
                if (i == page) {
                    li.innerHTML = '<a class="active" href="javascript:void(0)">'+(i+1)+'</a>';
                } else {
                    li.innerHTML = '<a href="javascript:void(0)">'+(i+1)+'</a>';
                    li.title = i+1;
                    li.onclick = function(e) {
                        e.preventDefault();
                        l.page = parseInt(this.title)-1;
                        l.loadLogs();
                    }
                }
                logPaginationUL.appendChild(li);
            }
        } else {
            var li = u.createElement('li', {'class': 'log_page halfsectrans'});
            li.innerHTML = '<a href="javascript:void(0)" class="active">1</a>';
            logPaginationUL.appendChild(li);
        }
        if (page == logPages-1 || logPages == 0) {
            next.className = 'log_page halfsectrans inactive';
        } else {
            next.onclick = function(e) {
                e.preventDefault();
                l.page += 1;
                l.loadLogs();
            }
        }
        next.innerHTML = '<a id="'+prefix+'log_nextpage" href="javascript:void(0)">Next »</a>';
        logPaginationUL.appendChild(next);
        return logPaginationUL;
    },
    displayMetadata: function(logFile) {
        // Displays the information about the log file, *logFile* in the logview panel.
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            infoDiv = u.getNode('#'+prefix+'log_info'),
            logMetadataDiv = u.getNode('#'+prefix+'log_metadata'),
            previewIframe = u.getNode('#'+prefix+'log_preview'),
            existingButtonRow = u.getNode('#'+prefix+'log_actions_row'),
            buttonRowTitle = u.createElement('div', {'class':'log_actions_title'}),
            buttonRow = u.createElement('div', {'id': 'log_actions_row', 'class': 'metadata_row'}),
            viewFlatButton = u.createElement('button', {'id': 'log_view_flat', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            viewPlaybackButton = u.createElement('button', {'id': 'log_view_playback', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            downloadButton = u.createElement('button', {'id': 'log_download', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            logObj = null;
        if (existingButtonRow) {
            u.removeElement(existingButtonRow);
        }
        buttonRowTitle.innerHTML = "Actions";
        viewFlatButton.innerHTML = "View Log (Flat)";
        viewFlatButton.title = "Opens a new window with a traditional flat view of the log.";
        viewFlatButton.onclick = function(e) {
            l.openLogFlat(logFile);
        }
        viewPlaybackButton.innerHTML = "View Log (Playback)";
        viewPlaybackButton.title = "Opens a new window with a realtime playback of the log.";
        viewPlaybackButton.onclick = function(e) {
            l.openLogPlayback(logFile);
        }
        downloadButton.innerHTML = "Save Log (HTML)";
        downloadButton.title = "Save a pre-rendered, self-contained recording of this log to disk in HTML format.";
        downloadButton.onclick = function(e) {
            l.saveRenderedLog(logFile);
        }
        // Retreive the metadata on the log in question
        for (var i in l.serverLogs) {
            if (l.serverLogs[i]['filename'] == logFile) {
                logObj = l.serverLogs[i];
            }
        }
        if (!logObj) {
            // Not found, nothing to display
            return;
        }
        var dateObj = new Date(parseInt(logObj['start_date'])),
            dateString = l.dateFormatter(dateObj),
            metadataNames = {
                'Filename': logObj['filename'],
                'Date': dateString,
                'Frames': logObj['frames'],
                'Size': logObj['size'],
                'Rows': logObj['rows'],
                'Columns': logObj['cols']
            };
        l.openLogPlayback(logFile, 'preview');
        // Remove existing content first
        while (logMetadataDiv.childNodes.length >= 1 ) {
            logMetadataDiv.removeChild(logMetadataDiv.firstChild);
        }
        buttonRow.appendChild(buttonRowTitle);
        buttonRow.appendChild(viewFlatButton);
        buttonRow.appendChild(viewPlaybackButton);
        buttonRow.appendChild(downloadButton);
        infoDiv.insertBefore(buttonRow, previewIframe);
        for (var i in metadataNames) {
            var row = u.createElement('div', {'class': 'metadata_row'}),
                title = u.createElement('div', {'class':'metadata_title'}),
                value = u.createElement('div', {'class':'metadata_value'});
            title.innerHTML = i;
            value.innerHTML = metadataNames[i];
            row.appendChild(title);
            row.appendChild(value);
            logMetadataDiv.appendChild(row);
        }
    },
    createLogItem: function(container, logObj, delay) {
        // Creates a logItem element using *logObj* and places it into *container*.
        // *delay* controls how long it will wait before using a CSS3 effect to move it into view.
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            logElem = u.createElement('div', {'class':'halfsectrans table_row', 'name': prefix+'logitem'}),
            titleSpan = u.createElement('span', {'class':'table_cell logitem_title'}),
            dateSpan = u.createElement('span', {'class':'table_cell'}),
            sizeSpan = u.createElement('span', {'class':'table_cell'}),
            dateObj = new Date(parseInt(logObj['start_date'])),
            dateString = l.dateFormatter(dateObj);
        titleSpan.innerHTML = "<b>" + logObj['connect_string'] + "</b>";
        dateSpan.innerHTML = dateString;
        sizeSpan.innerHTML = l.humanReadableBytes(logObj['size'], 1);
        logElem.appendChild(titleSpan);
        logElem.appendChild(sizeSpan);
        logElem.appendChild(dateSpan);
        with ({ filename: logObj['filename'] }) {
            logElem.onclick = function(e) {
                var previewIframe = u.getNode('#'+prefix+'log_preview'),
                    iframeDoc = previewIframe.contentWindow.document;
                // Highlight the selected row and show the metadata
                u.toArray(u.getNodes('.table_row')).forEach(function(node) {
                    // Reset them all before we apply the 'active' class to just the one
                    node.className = 'halfsectrans table_row';
                });
                this.className = 'halfsectrans table_row active';
                iframeDoc.open();
                iframeDoc.write('<html><head><title>Preview Iframe</title></head><body style="background-color: #000; background-image: none; color: #fff; font-size: 1.2em; font-weight: bold; font-style: italic;">Loading Preview...</body></html');
                iframeDoc.close();
                l.displayMetadata(filename);
            }
        }
        logElem.style.opacity = 0;
        go.Visual.applyTransform(logElem, 'translateX(-300%)');
        setTimeout(function() {
            // Fade it in
            logElem.style.opacity = 1;
        }, delay);
        try {
            container.appendChild(logElem);
        } catch(e) {
            u.noop(); // Sometimes the container will be missing between page loads--no biggie
        }
        setTimeout(function() {
            try {
                go.Visual.applyTransform(logElem, '');
            } catch(e) {
                u.noop(); // Element was removed already.  No biggie.
            }
        }, delay);
        return logElem;
    },
    incomingLogAction: function(message) {
        // Adds *message['log']* to GateOne.Logging.serverLogs and places it into the view.
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_logs'),
            logViewHeader = u.getNode('#'+prefix+'logging_title'),
            existingHeader = u.getNode('#'+prefix+'logitems_header'),
            pagination = u.getNode('#'+prefix+'log_pagination'),
            existingPaginationUL = u.getNode('#'+prefix+'log_pagination_ul'),
            logListContainer = u.getNode('#'+prefix+'log_listcontainer'),
            logItems = document.getElementsByClassName('table_row'),
            maxItems = l.getMaxLogItems(existingPanel) - 4; // -4 should account for the header with a bit of room at the bottom too
        if (message['log']) {
            if (!message['log']['connect_string']) {
                message['log']['connect_string'] = "Title Unknown";
            }
            l.serverLogs.push(message['log']);
        }
        if (logItems.length >= maxItems) {
            l.delay = 500; // Reset it since we're no longer using it
            if (l.paginationTimeout) {
                clearTimeout(l.paginationTimeout);
                l.paginationTimeout = null;
            }
            l.paginationTimeout = setTimeout(function() {
                // De-bouncing this so it doesn't get called 1000 times/sec causing the browser to hang while the loads load.
                var paginationUL = l.loadPagination(l.serverLogs, l.page);
                if (existingPaginationUL) {
                    if (existingPaginationUL.getElementsByClassName('log_page').length < paginationUL.getElementsByClassName('log_page').length) {
                        pagination.replaceChild(paginationUL, existingPaginationUL);
                    }
                } else {
                    pagination.appendChild(paginationUL);
                }
            }, 500);
            return; // Don't add more than the panel can display
        }
        l.createLogItem(logListContainer, message['log'], l.delay);
        l.delay += 50;
    },
    incomingLogsCompleteAction: function(message) {
        // Just sets the header to indicate we're done loading
        var go = GateOne,
            u = go.Utils,
            l = go.Logging,
            prefix = go.prefs.prefix,
            logViewHeader = u.getNode('#'+prefix+'logging_title');
        go.Visual.displayMessage('<b>Log listing complete:</b> ' + message['total_logs'] + ' logs representing ' + l.humanReadableBytes(message['total_bytes'], 1) + ' of disk space.');
        logViewHeader.innerHTML = 'Log Viewer';
    },
    displayFlatLogAction: function(message) {
        // Opens a new window displaying the (flat) log contained within *message* if there are no errors reported
        var go = GateOne,
            u = go.Utils,
            v = go.Visual,
            l = go.Logging,
            prefix = go.prefs.prefix,
            result = message['result'],
            logLines = message['log'],
            metadata = message['metadata'],
            logViewContent = u.createElement('div', {'id': 'logview_container'}),
            logContainer = u.createElement('div', {'id': 'logview', 'class': 'terminal', 'style': {'width': '100%', 'height': '100%'}});
        if (result != "Success") {
            v.displayMessage("Could not retrieve log: " + result);
        } else {
            var newWindow = window.open('', '_newtab'),
                goDiv = u.createElement('div', {'id': go.prefs.goDiv.split('#')[1]}, true),
                cssTheme = u.getNode('#'+prefix+'go_css_theme').cloneNode(true),
                cssColors = u.getNode('#'+prefix+'go_css_colors').cloneNode(true),
                newContent = "<html><head><title>Gate One Log (Flat): " + metadata['filename'] + "</title></head><body></body></html>";
            newWindow.focus();
            newWindow.document.write(newContent);
            newWindow.document.close();
            newWindow.document.head.appendChild(cssTheme);
            newWindow.document.head.appendChild(cssColors);
            newWindow.document.body.appendChild(goDiv);
            logContainer.innerHTML = '<pre style="height: 100%; overflow: auto; position: static; white-space: pre-line;">' + logLines.join('\n') + '</pre>';
            logViewContent.appendChild(logContainer);
            goDiv.appendChild(logViewContent);
        }
    },
    displayPlaybackLogAction: function(message) {
        // Opens a new window playing back the log contained within *message* if there are no errors reported
        var go = GateOne,
            u = go.Utils,
            v = go.Visual,
            l = go.Logging,
            prefix = go.prefs.prefix,
            result = message['result'],
            logHTML = message['html'],
            where = message['where'],
            metadata = message['metadata'],
            logViewContent = u.createElement('div', {'id': 'logview_container'}),
            logContainer = u.createElement('div', {'id': 'logview', 'class': 'terminal', 'style': {'width': '100%', 'height': '100%'}});
        if (result != "Success") {
            v.displayMessage("Could not retrieve log: " + result);
        } else {
            if (where == 'preview') {
                var previewIframe = u.getNode('#'+prefix+'log_preview'),
                    iframeDoc = previewIframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(logHTML);
                iframeDoc.close();
            } else {
                var newWindow = window.open('', '_newtab');
                newWindow.focus();
                newWindow.document.write(logHTML);
                newWindow.document.close();
            }
        }
    },
    openLogFlat: function(logFile) {
        // Tells the server to open *logFile* for playback (will end up calling displayFlatLogAction())
        var go = GateOne,
            message = {
                'log_filename': logFile,
                'theme': go.prefs.theme,
                'colors': go.prefs.colors
            };
        go.ws.send(JSON.stringify({'logging_get_log_flat': message}));
        go.Visual.displayMessage(logFile + ' will be opened in a new window when rendering is complete.  Large logs can take some time so please be patient.');
    },
    openLogPlayback: function(logFile, /*opt*/where) {
        // Tells the server to open *logFile* for playback (will end up calling displayPlaybackLogAction())
        // If *where* is given and it is set to 'preview' the playback will happen in the log_preview iframe.
        var go = GateOne,
            message = {
                'log_filename': logFile,
                'theme': go.prefs.theme,
                'colors': go.prefs.colors
            };
        if (where) {
            message['where'] = where;
        } else {
            go.Visual.displayMessage(logFile + ' will be opened in a new window when rendering is complete.  Large logs can take some time so please be patient.');
        }
        go.ws.send(JSON.stringify({'logging_get_log_playback': message}));
    },
    saveRenderedLog: function(logFile) {
        // Tells the server to open *logFile*, rendere it as a self-contained recording, and send it back to the browser for saving (using the save_file action).
        var go = GateOne,
            message = {
                'log_filename': logFile,
                'theme': go.prefs.theme,
                'colors': go.prefs.colors
            };
        go.ws.send(JSON.stringify({'logging_get_log_file': message}));
        go.Visual.displayMessage(logFile + ' will be downloaded when rendering is complete.  Large logs can take some time so please be patient.');
    },
    sortFunctions: {
        date: function(a,b) {
            // Sorts by date (start_date) followed by alphabetical order of the title (connect_string)
            if (a.start_date === b.start_date) {
                var x = a.connect_string.toLowerCase(), y = b.connect_string.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.start_date > b.start_date) {
                return -1;
            }
            if (a.start_date < b.start_date) {
                return 1;
            }
        },
        alphabetical: function(a,b) {
            // Sorts alphabetically using the title (connect_string)
            var x = a.connect_string.toLowerCase(), y = b.connect_string.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        },
        size: function(a,b) {
            // Sorts logs according to their size
            if (a.size === b.size) {
                var x = a.connect_string.toLowerCase(), y = b.connect_string.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.size > b.size) {
                return -1;
            }
            if (a.size < b.size) {
                return 1;
            }
        },
    },
    toggleSortOrder: function() {
        // Reverses the order of the log list
        var go = GateOne,
            l = go.Logging,
            u = go.Utils,
            prefix = go.prefs.prefix;
        if (l.sortToggle) {
            l.sortToggle = false;
            l.loadLogs();
        } else {
            l.sortToggle = true;
            l.loadLogs();
        }
    },
    humanReadableBytes: function(bytes, /*opt*/precision) {
        // Returns *bytes* as a human-readable string in a similar fashion to how it would be displayed by 'ls -lh' or 'df -h'.
        // If *precision* (integer) is given, it will be used to determine the number of decimal points to use when rounding.  Otherwise it will default to 0
        var sizes = ['', 'K', 'M', 'G', 'T'],
            postfix = 0;
        bytes = parseInt(bytes); // Just in case we get passed *bytes* as a string
        if (!precision) {
            precision = 0;
        }
        if (bytes == 0) return 'n/a';
        if (bytes > 1024) {
            while( bytes >= 1024 ) {
                postfix++;
                bytes = bytes / 1024;
            }
            return bytes.toFixed(precision) + sizes[postfix];
        } else {
            // Just return the bytes as-is (as a string)
            return bytes + "";
        }
    }
});

GateOne.Logging.destinations = { // Default to console logging.
    'console': GateOne.Logging.logToConsole // Can be added to or replaced/removed
    // If anyone has any cool ideas for log destinations please let us know!
}

// Initialize the logger immediately upon loading of the module (before init())
if (typeof(GateOne.Logging.level) == 'string') {
    // Convert to integer
    GateOne.Logging.level = GateOne.Logging.levels[GateOne.Logging.level];
}

})(window);(function(window, undefined) {
var document = window.document; // Have to do this because we're sandboxed

// This is so we can copy a whole function so there's no circular references
Function.prototype.clone = function() {
    var fct = this;
    var clone = function() {
        return fct.apply(this, arguments);
    };
    clone.prototype = fct.prototype;
    for (property in fct) {
        if (fct.hasOwnProperty(property) && property !== 'prototype') {
            clone[property] = fct[property];
        }
    }
    return clone;
};

// Tunable playback prefs
if (!GateOne.prefs.playbackFrames) {
    GateOne.prefs.playbackFrames = 75; // Maximum number of session recording frames to store (in memory--for now)
}

// GateOne.Playback
GateOne.Base.module(GateOne, 'Playback', '1.0', ['Base', 'Net', 'Logging']);
GateOne.Playback.clockElement = null; // Set with a global scope so we don't have to keep looking it up every time the clock is updated
GateOne.Playback.progressBarElement = null; // Set with a global scope so we don't have to keep looking it up every time we update a terminal
GateOne.Playback.progressBarMouseDown = false;
GateOne.Playback.clockUpdater = null; // Will be a timer
GateOne.Playback.frameUpdater = null; // Ditto
GateOne.Playback.milliseconds = 0;
GateOne.Playback.frameRate = 15; // Approximate
GateOne.Playback.frameInterval = Math.round(1000/GateOne.Playback.frameRate); // Needs to be converted to ms
GateOne.Base.update(GateOne.Playback, {
    init: function() {
        var go = GateOne,
            u = go.Utils,
            p = go.Playback,
            prefix = go.prefs.prefix,
            pTag = u.getNode('#'+prefix+'info_actions'),
            prefsTableDiv2 = u.getNode('#'+prefix+'prefs_tablediv2'),
            prefsPanelRow = u.createElement('div', {'class':'paneltablerow'}),
            prefsPanelPlaybackLabel = u.createElement('span', {'id': 'prefs_playback_label', 'class':'paneltablelabel'}),
            prefsPanelPlayback = u.createElement('input', {'id': 'prefs_playback', 'name': prefix+'prefs_playback', 'size': 5, 'style': {'display': 'table-cell', 'text-align': 'right', 'float': 'right'}}),
            infoPanelSaveRecording = u.createElement('button', {'id': 'saverecording', 'type': 'submit', 'value': 'Submit', 'class': 'button black'});
        if (prefsTableDiv2) { // Only add to the prefs panel if it actually exists (i.e. not in embedded mode)
            prefsPanelPlaybackLabel.innerHTML = "<b>Playback Frames:</b> ";
            prefsPanelPlayback.value = go.prefs.playbackFrames;
            prefsPanelRow.appendChild(prefsPanelPlaybackLabel);
            prefsPanelRow.appendChild(prefsPanelPlayback);
            prefsTableDiv2.appendChild(prefsPanelRow);
            infoPanelSaveRecording.innerHTML = "Export Current Session";
            infoPanelSaveRecording.title = "Open the current terminal's playback history in a new window (which you can save to a file)."
            infoPanelSaveRecording.onclick = function() {
                GateOne.Playback.saveRecording(localStorage[GateOne.prefs.prefix+'selectedTerminal']);
            }
            pTag.appendChild(infoPanelSaveRecording);
        }
        setTimeout(function() {
            GateOne.Playback.addPlaybackControls();
        }, 3000);
        // This makes sure our playback frames get added to the terminal object whenever the screen is updated
        go.Terminal.updateTermCallbacks.push(GateOne.Playback.pushPlaybackFrame);
        // This makes sure our prefs get saved along with everything else
        go.savePrefsCallbacks.push(GateOne.Playback.savePrefsCallback);
    },
    pushPlaybackFrame: function(termNum) {
        // Adds the current screen in *term* to GateOne.terminals[term]['playbackFrames']
        var prefix = GateOne.prefs.prefix,
            term = termNum,
            playbackFrames = null,
            frame = {'screen': GateOne.terminals[term]['screen'], 'time': new Date()};
        if (!GateOne.Playback.progressBarElement) {
            GateOne.Playback.progressBarElement = GateOne.Utils.getNode('#'+prefix+'progressBar');
        }
        if (!GateOne.terminals[term]['playbackFrames']) {
            GateOne.terminals[term]['playbackFrames'] = [];
        }
        playbackFrames = GateOne.terminals[term]['playbackFrames'];
        // Add the new playback frame to the terminal object
        playbackFrames.push(frame);
        frame = null; // Clean up
        if (playbackFrames.length > GateOne.prefs.playbackFrames) {
            // Reduce it to fit within the user's configured max
//             GateOne.terminals[term]['playbackFrames'].shift(); // NOTE: This won't work if the user reduced their playbackFrames preference by more than 1
            playbackFrames.reverse(); // Have to reverse it before we truncate
            playbackFrames.length = GateOne.prefs.playbackFrames; // Love that length is assignable!
            playbackFrames.reverse(); // Put it back in the right order
        }
//         GateOne.terminals[term]['playbackFrames'] = null;
//         GateOne.terminals[term]['playbackFrames'] = playbackFrames;
        // Fix the progress bar if it is in a non-default state and stop playback
        if (GateOne.Playback.progressBarElement) {
            if (GateOne.Playback.progressBarElement.style.width != '0%') {
                clearInterval(GateOne.Playback.frameUpdater);
                GateOne.Playback.frameUpdater = null;
                GateOne.Playback.milliseconds = 0; // Reset this in case the user was in the middle of playing something back when the screen updated
                GateOne.Playback.progressBarElement.style.width = '0%';
                // Also make sure the pastearea is put back if missing
                GateOne.Utils.showElement('#'+prefix+'pastearea');
            }
        }
        playbackFrames = null; // Immediate cleanup
    },
    savePrefsCallback: function() {
        // Called when the user clicks the "Save" button in the prefs panel
        var prefix = GateOne.prefs.prefix,
            playbackValue = GateOne.Utils.getNode('#'+prefix+'prefs_playback').value;
        try {
            if (playbackValue) {
                GateOne.prefs.playbackFrames = parseInt(playbackValue);
            }
        } finally {
            playbackValue = null;
        }
    },
    updateClock: function(/*opt:*/dateObj) {
        // Updates the clock with the time in the given *dateObj*.
        // If no *dateObj* is given, the clock will be updated with the current local time
        if (!dateObj) { dateObj = new Date() }
        if (!GateOne.Playback.clockElement) {
            GateOne.Playback.clockElement = GateOne.Utils.getNode('#'+GateOne.prefs.prefix+'clock');
        }
        GateOne.Playback.clockElement.innerHTML = dateObj.toLocaleTimeString();
    },
    startPlayback: function(term) {
        // Plays back the given terminal's session in real-time
        if (GateOne.Playback.clockUpdater) { // Get the clock updating
            clearInterval(GateOne.Playback.clockUpdater);
            GateOne.Playback.clockUpdater = null;
        }
        GateOne.Playback.frameUpdater = setInterval('GateOne.Playback.playbackRealtime('+term+')', GateOne.Playback.frameInterval);
    },
    selectFrame: function(term, ms) {
        // For the given terminal, returns the last frame # with a 'time' less than (first frame's time + *ms*)
        var go = GateOne,
            firstFrameObj = go.terminals[term]['playbackFrames'][0],
            // Get a Date() that reflects the current position:
            frameTime = new Date(firstFrameObj['time']),
            frameObj = null,
            dateTime = null,
            framesLength = go.terminals[term]['playbackFrames'].length - 1,
            frame = 0;
        frameTime.setMilliseconds(frameTime.getMilliseconds() + go.Playback.milliseconds);
        for (var i in go.terminals[term]['playbackFrames']) {
            frameObj = go.terminals[term]['playbackFrames'][i];
            dateTime = new Date(frameObj['time']);
            if (dateTime.getTime() > frameTime.getTime()) {
                frame = i;
                break
            }
        }
        return frame - 1;
    },
    playbackRealtime: function(term) {
        // Plays back the given terminal's session one frame at a time.  Meant to be used inside of an interval timer.
        var go = GateOne,
            u = go.Utils,
            p = go.Playback,
            prefix = go.prefs.prefix,
            selectedFrame = go.terminals[term]['playbackFrames'][p.selectFrame(term, p.milliseconds)],
            frameTime = new Date(go.terminals[term]['playbackFrames'][0]['time']),
            lastFrame = go.terminals[term]['playbackFrames'].length - 1,
            lastDateTime = new Date(go.terminals[term]['playbackFrames'][lastFrame]['time']);
        frameTime.setMilliseconds(frameTime.getMilliseconds() + p.milliseconds);
        if (!selectedFrame) { // All done
            var playPause = u.getNode('#'+prefix+'playPause');
            playPause.innerHTML = '▶';
            go.Visual.applyTransform(playPause, ''); // Set it back to normal
            u.getNode('#'+prefix+'term'+term+'_pre').innerHTML = go.terminals[term]['playbackFrames'][lastFrame]['screen'].join('\n');
            u.getNode('#'+prefix+'clock').innerHTML = lastDateTime.toLocaleTimeString();
            u.getNode('#'+prefix+'sideinfo').innerHTML = lastDateTime.toLocaleDateString();
            u.getNode('#'+prefix+'progressBar').style.width = '100%';
            clearInterval(p.frameUpdater);
            p.frameUpdater = null;
            p.milliseconds = 0;
            // Restart the clock
            p.clockUpdater = setInterval('GateOne.Playback.updateClock()', 1000);
            return
        }
        u.getNode('#'+prefix+'clock').innerHTML = frameTime.toLocaleTimeString();
        u.getNode('#'+prefix+'sideinfo').innerHTML = frameTime.toLocaleDateString();
        u.getNode('#'+prefix+'term'+term+'_pre').innerHTML = selectedFrame['screen'].join('\n');
        // Update progress bar
        var firstDateTime = new Date(go.terminals[term]['playbackFrames'][0]['time']);
        var percent = Math.abs((lastDateTime.getTime() - frameTime.getTime())/(lastDateTime.getTime() - firstDateTime.getTime()) - 1);
        if (percent > 1) {
            percent = 1; // Last frame might be > 100% due to timing...  No biggie
        }
        u.getNode('#'+prefix+'progressBar').style.width = (percent*100) + '%';
        p.milliseconds += p.frameInterval; // Increment determines our framerate
    },
    playPauseControl: function(e) {
        var go = GateOne,
            u = go.Utils,
            p = go.Playback,
            prefix = go.prefs.prefix,
            playPause = u.getNode('#'+prefix+'playPause');
        if (playPause.innerHTML == '▶') {
            p.startPlayback(localStorage[prefix+'selectedTerminal']);
            playPause.innerHTML = '=';
            // NOTE:  Using a transform here to increase the size and move the element because these changes are *relative* to the current state.
            go.Visual.applyTransform(playPause, 'rotate(90deg) scale(1.5) translate(0%, -20%)');
        } else {
            playPause.innerHTML = '▶';
            clearInterval(p.frameUpdater);
            p.frameUpdater = null;
            go.Visual.applyTransform(playPause, ''); // Set it back to normal
        }
    },
    addPlaybackControls: function() {
        // Add the session playback controls to Gate One
        var go = GateOne,
            u = go.Utils,
            p = go.Playback,
            prefix = go.prefs.prefix,
            playPause = u.createElement('div', {'id': 'playPause'}),
            progressBar = u.createElement('div', {'id': 'progressBar'}),
            progressBarContainer = u.createElement('div', {
                'id': 'progressBarContainer', 'onmouseover': 'this.style.cursor = "col-resize"'}),
            clock = u.createElement('div', {'id': 'clock'}),
            playbackControls = u.createElement('div', {'id': 'playbackControls'}),
            controlsContainer = u.createElement('div', {'id': 'controlsContainer', 'class': 'centertrans'}),
            goDiv = u.getNode(go.prefs.goDiv),
            style = window.getComputedStyle(goDiv, null),
            emDimensions = u.getEmDimensions(goDiv),
            controlsWidth = parseInt(style.width.split('px')[0]) - (emDimensions.w * 3),
            // Firefox doesn't support 'mousewheel'
            mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
        playPause.innerHTML = '▶';
        playPause.onclick = p.playPauseControl;
        progressBarContainer.appendChild(progressBar);
        clock.innerHTML = '00:00:00';
        var updateProgress = function(e) {
            e.preventDefault();
            if (p.progressBarMouseDown) {
                var term = localStorage[prefix+'selectedTerminal'],
                    lX = e.layerX,
                    pB = u.getNode('#'+prefix+'progressBar'),
                    pBC = u.getNode('#'+prefix+'progressBarContainer'),
                    percent = (lX / pBC.offsetWidth),
                    frame = Math.round(go.terminals[term]['playbackFrames'].length * percent),
                    currentFrame = frame - 1,
                    selectedFrame = go.terminals[term]['playbackFrames'][currentFrame];
                var dateTime = new Date(selectedFrame['time']);
                if (p.clockUpdater) {
                    clearInterval(p.clockUpdater);
                    p.clockUpdater = null;
                }
                if (go.terminals[term]['scrollbackTimer']) {
                    clearTimeout(go.terminals[term]['scrollbackTimer']);
                }
                pB.style.width = (percent*100) + '%'; // Update the progress bar to reflect the user's click
                // Now update the terminal window to reflect the (approximate) selected frame
                u.getNode('#'+prefix+'term' + term + '_pre').innerHTML = selectedFrame['screen'].join('\n');
                u.getNode('#'+prefix+'clock').innerHTML = dateTime.toLocaleTimeString();
            }
        }
        progressBarContainer.onmousedown = function(e) {
            p.progressBarMouseDown = true;
            this.style.cursor = "col-resize";
            updateProgress(e);
        }
        progressBarContainer.onmouseup = function(e) {
            p.progressBarMouseDown = false;
        }
        progressBarContainer.onmousemove = function(e) {
            // First figure out where the user clicked and what % that represents in the playback buffer
            updateProgress(e);
        };
        playbackControls.appendChild(playPause);
        playbackControls.appendChild(progressBarContainer);
        playbackControls.appendChild(clock);
        controlsContainer.appendChild(playbackControls);
        goDiv.appendChild(controlsContainer);
        if (!p.clockUpdater) { // Get the clock updating
            p.clockUpdater = setInterval('GateOne.Playback.updateClock()', 1000);
        }
        var wheelFunc = function(e) {
            var m = go.Input.mouse(e),
                percent = 0,
                modifiers = go.Input.modifiers(e),
                term = localStorage[prefix+'selectedTerminal'],
                terminalObj = go.terminals[term],
                selectedFrame = terminalObj['playbackFrames'][p.currentFrame],
                sbT = terminalObj['scrollbackTimer'];
            if (modifiers.shift) { // If shift is held, go back/forth in the recording instead of scrolling up/down
                e.preventDefault();
                // Stop updating the clock
                clearInterval(p.clockUpdater);
                p.clockUpdater = null;
                // Prevent the pastearea from re-enabling itself
                clearInterval(go.scrollTimeout);
                go.scrollTimeout = null;
                if (sbT) {
                    clearTimeout(sbT);
                    sbT = null;
                }
                if (terminalObj['scrollbackVisible']) {
                    // This just ensures that we're keeping states set properly
                    terminalObj['scrollbackVisible'] = false;
                }
                if (typeof(p.currentFrame) == "undefined") {
                    p.currentFrame = terminalObj['playbackFrames'].length - 1; // Reset
                    selectedFrame = terminalObj['playbackFrames'][p.currentFrame]
                    p.progressBarElement.style.width = '100%';
                }
                if (m.wheel.x > 0) { // Shift + scroll shows up as left/right scroll (x instead of y)
                    p.currentFrame = p.currentFrame + 1;
                    if (p.currentFrame >= terminalObj['playbackFrames'].length) {
                        p.currentFrame = terminalObj['playbackFrames'].length - 1; // Reset
                        p.progressBarElement.style.width = '100%';
                        u.getNode('#'+prefix+'term' + term + '_pre').innerHTML = terminalObj['screen'].join('\n');
                        if (!p.clockUpdater) { // Get the clock updating again
                            p.clockUpdater = setInterval('GateOne.Playback.updateClock()', 1);
                        }
                        terminalObj['scrollbackTimer'] = setTimeout(function() { // Get the scrollback timer going again
                            go.Visual.enableScrollback(term);
                        }, 3500);
                        // Add back the pastearea
                        u.showElement('#'+prefix+'pastearea');
                    } else {
                        percent = (p.currentFrame / terminalObj['playbackFrames'].length) * 100;
                        p.progressBarElement.style.width = percent + '%';
                        if (selectedFrame) {
                            u.getNode('#'+prefix+'term' + term + '_pre').innerHTML = selectedFrame['screen'].join('\n');
                            u.getNode('#'+prefix+'clock').innerHTML = selectedFrame['time'].toLocaleTimeString();
                        }
                    }
                } else {
                    p.currentFrame = p.currentFrame - 1;
                    percent = (p.currentFrame / terminalObj['playbackFrames'].length) * 100;
                    p.progressBarElement.style.width = percent + '%';
                    if (selectedFrame) {
                        u.getNode('#'+prefix+'term' + term + '_pre').innerHTML = selectedFrame['screen'].join('\n');
                        u.getNode('#'+prefix+'clock').innerHTML = selectedFrame['time'].toLocaleTimeString();
                    } else {
                        p.currentFrame = 0; // First frame
                        p.progressBarElement.style.width = '0%';
                    }
                }
            }
        }
        goDiv.addEventListener(mousewheelevt, wheelFunc, true);
    },
    saveRecording: function(term) {
        // Saves the session playback recording by sending the playbackFrames to the server to have them rendered.
        // When the server is done rendering the recording it will be sent back to the client via the save_file action.
        var go = GateOne,
            u = go.Utils,
            recording = JSON.stringify(go.terminals[term]['playbackFrames']),
            settings = {'recording': recording, 'prefix': go.prefs.prefix, 'container': go.prefs.goDiv.split('#')[1], 'theme': go.prefs.theme, 'colors': go.prefs.colors};
        go.ws.send(JSON.stringify({'playback_save_recording': settings}));
    }
});

})(window);(function(window, undefined) { // Sandbox it all
var document = window.document; // Have to do this because we're sandboxed

// Useful sandbox-wide stuff
var noop = GateOne.Utils.noop;

// Sandbox-wide shortcuts for each log level (actually assigned in init())
var logFatal = noop;
var logError = noop;
var logWarning = noop;
var logInfo = noop;
var logDebug = noop;

// GateOne.SSH (ssh client functions)
GateOne.Base.module(GateOne, "SSH", "1.0", ['Base']);
GateOne.SSH.identities = []; // SSH identity objects end up in here
GateOne.Base.update(GateOne.SSH, {
    init: function() {
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            prefsPanel = u.getNode('#'+prefix+'panel_prefs'),
            infoPanel = u.getNode('#'+prefix+'panel_info'),
            h3 = u.createElement('h3'),
            infoPanelDuplicateSession = u.createElement('button', {'id': 'duplicate_session', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            infoPanelManageIdentities = u.createElement('button', {'id': 'manage_identities', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            prefsPanelKnownHosts = u.createElement('button', {'id': 'edit_kh', 'type': 'submit', 'value': 'Submit', 'class': 'button black'});
        // Assign our logging function shortcuts if the Logging module is available with a safe fallback
        if (go.Logging) {
            logFatal = go.Logging.logFatal;
            logError = go.Logging.logError;
            logWarning = go.Logging.logWarning;
            logInfo = go.Logging.logInfo;
            logDebug = go.Logging.logDebug;
        }
        prefsPanelKnownHosts.innerHTML = "Edit Known Hosts";
        prefsPanelKnownHosts.onclick = function() {
            u.xhrGet(go.prefs.url+'ssh?known_hosts=True', go.SSH.updateKH);
        }
        infoPanelManageIdentities.innerHTML = "Manage Identities";
        infoPanelManageIdentities.onclick = function() {
            go.SSH.loadIDs();
        }
        infoPanelDuplicateSession.innerHTML = "Duplicate Session";
        infoPanelDuplicateSession.onclick = function() {
            var term = localStorage[prefix+'selectedTerminal'];
            go.SSH.duplicateSession(term);
        }
        h3.innerHTML = "SSH Plugin";
        if (prefsPanel) {// Only add to the prefs panel if it actually exists (i.e. not in embedded mode) = u.getNode('#'+prefix+'panel_prefs'),
            infoPanel.appendChild(h3);
            infoPanel.appendChild(infoPanelDuplicateSession);
            infoPanel.appendChild(infoPanelManageIdentities);
            infoPanel.appendChild(prefsPanelKnownHosts);
            go.SSH.createKHPanel();
        }
        // Setup a callback that runs disableCapture() whenever the panel is opened
        if (!GateOne.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_ssh_ids']) {
            GateOne.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_ssh_ids'] = {};
        }
        GateOne.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_ssh_ids']['disableCapture'] = GateOne.Input.disableCapture;
        // Setup a callback that runs capture() whenever the panel is closed
        if (!GateOne.Visual.panelToggleCallbacks['out']['#'+prefix+'panel_ssh_ids']) {
            GateOne.Visual.panelToggleCallbacks['out']['#'+prefix+'panel_ssh_ids'] = {};
        }
        GateOne.Visual.panelToggleCallbacks['out']['#'+prefix+'panel_ssh_ids']['disableCapture'] = GateOne.Input.capture;
        go.SSH.createPanel();
        go.Net.addAction('sshjs_connect', go.SSH.handleConnect);
        go.Net.addAction('sshjs_reconnect', go.SSH.handleReconnect);
        go.Net.addAction('sshjs_keygen_complete', go.SSH.keygenComplete);
        go.Net.addAction('sshjs_save_id_complete', go.SSH.saveComplete);
        go.Net.addAction('sshjs_display_fingerprint', go.SSH.displayHostFingerprint);
        go.Net.addAction('sshjs_identities_list', go.SSH.incomingIDsAction);
        go.Net.addAction('sshjs_delete_identity_complete', go.SSH.deleteCompleteAction);
        go.Terminal.newTermCallbacks.push(go.SSH.getConnectString);
        if (!go.prefs.embedded) {
            go.Input.registerShortcut('KEY_D', {'modifiers': {'ctrl': true, 'alt': true, 'meta': false, 'shift': false}, 'action': 'GateOne.SSH.duplicateSession(localStorage[GateOne.prefs.prefix+"selectedTerminal"])'});
        }
    },
    createPanel: function() {
        // Creates the SSH identity management panel (the shell of it anyway)
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_ssh_ids'),
            sshIDPanel = u.createElement('div', {'id': 'panel_ssh_ids', 'class': 'panel sectrans'}),
            sshIDHeader = u.createElement('div', {'id': 'ssh_ids_header', 'class': 'sectrans'}),
            sshIDHeaderH2 = u.createElement('h2', {'id': 'ssh_ids_title', 'class': 'sectrans'}),
            sshNewID = u.createElement('a', {'id': 'ssh_new_id', 'class': 'halfsectrans ssh_panel_link'}),
            sshUploadID = u.createElement('a', {'id': 'ssh_upload_id', 'class': 'halfsectrans ssh_panel_link'}),
            sshIDHRFix = u.createElement('hr', {'style': {'opacity': 0}}),
            panelClose = u.createElement('div', {'id': 'icon_closepanel', 'class': 'panel_close_icon', 'title': "Close This Panel"}),
            sshIDContent = u.createElement('div', {'id': 'ssh_ids_container', 'class': 'sectrans'}),
            sshIDInfoContainer = u.createElement('div', {'id': 'ssh_id_info', 'class': 'sectrans'}),
            sshIDListContainer = u.createElement('div', {'id': 'ssh_ids_listcontainer', 'class': 'sectrans'}),
            sshIDElemHeader = u.createElement('div', {'id': 'ssh_id_header', 'class':'table_header_row sectrans'}),
            defaultSpan = u.createElement('span', {'id': 'ssh_id_defaultspan', 'class':'table_cell table_header_cell'}),
            nameSpan = u.createElement('span', {'id': 'ssh_id_namespan', 'class':'table_cell table_header_cell'}),
            keytypeSpan = u.createElement('span', {'id': 'ssh_id_keytypespan', 'class':'table_cell table_header_cell'}),
            commentSpan = u.createElement('span', {'id': 'ssh_id_commentspan', 'class':'table_cell table_header_cell'}),
            bitsSpan = u.createElement('span', {'id': 'ssh_id_bitsspan', 'class':'table_cell table_header_cell'}),
            certSpan = u.createElement('span', {'id': 'ssh_id_certspan', 'class':'table_cell table_header_cell'}),
            sortOrder = u.createElement('span', {'id': 'ssh_ids_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
            sshIDMetadataDiv = u.createElement('div', {'id': 'ssh_id_metadata', 'class': 'sectrans'});
        sshIDHeaderH2.innerHTML = 'SSH Identity Manager: Loading...';
        panelClose.innerHTML = go.Icons['panelclose'];
        panelClose.onclick = function(e) {
            GateOne.Visual.togglePanel('#'+GateOne.prefs.prefix+'panel_ssh_ids'); // Scale away, scale away, scale away.
        }
        sshIDHeader.appendChild(sshIDHeaderH2);
        sshIDHeader.appendChild(panelClose);
        sshIDHeader.appendChild(sshIDHRFix); // The HR here fixes an odd rendering bug with Chrome on Mac OS X
        sshNewID.innerHTML = "+ New Identity";
        sshNewID.onclick = function(e) {
            // Show the new identity dialog/form
            ssh.newIDForm();
        }
        sshUploadID.innerHTML = "+ Upload";
        sshUploadID.onclick = function(e) {
            // Show the upload identity dialog/form
            ssh.uploadIDForm();
        }
        go.Visual.applyTransform(sshIDMetadataDiv, 'translate(300%)'); // It gets translated back in showIDs
        sshIDInfoContainer.appendChild(sshIDMetadataDiv);
        sshIDContent.appendChild(sshIDInfoContainer);
        if (ssh.sortToggle) {
            sortOrder.innerHTML = "▴";
        } else {
            sortOrder.innerHTML = "▾";
        }
        nameSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'ssh_ids_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'ssh_ids_sort_order');
            ssh.sortfunc = ssh.sortFunctions.alphabetical;
            if (localStorage[prefix+'ssh_ids_sort'] != 'alpha') {
                localStorage[prefix+'ssh_ids_sort'] = 'alpha';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (ssh.sortToggle) {
                    ssh.sortToggle = false;
                } else {
                    ssh.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(sshIDElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (ssh.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            ssh.loadIDs();
        }
        bitsSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'ssh_ids_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'ssh_ids_sort_order');
            ssh.sortfunc = ssh.sortFunctions.bits;
            if (localStorage[prefix+'ssh_ids_sort'] != 'bits') {
                localStorage[prefix+'ssh_ids_sort'] = 'bits';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (ssh.sortToggle) {
                    ssh.sortToggle = false;
                } else {
                    ssh.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(sshIDElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (ssh.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            ssh.loadIDs();
        }
        keytypeSpan.onclick = function(e) {
            var order = u.createElement('span', {'id': 'ssh_ids_sort_order', 'style': {'float': 'right', 'margin-left': '.3em', 'margin-top': '-.2em'}}),
                existingOrder = u.getNode('#'+prefix+'ssh_ids_sort_order');
            ssh.sortfunc = ssh.sortFunctions.size;
            if (localStorage[prefix+'ssh_ids_sort'] != 'size') {
                localStorage[prefix+'ssh_ids_sort'] = 'size';
            }
            if (this.childNodes.length > 1) {
                // Means the 'order' span is present.  Reverse the list
                if (ssh.sortToggle) {
                    ssh.sortToggle = false;
                } else {
                    ssh.sortToggle = true;
                }
            }
            if (existingOrder) {
                u.removeElement(existingOrder);
            }
            u.toArray(sshIDElemHeader.getElementsByClassName('table_header_cell')).forEach(function(item) {
                item.className = 'table_cell table_header_cell';
            });
            this.className = 'table_cell table_header_cell active';
            if (ssh.sortToggle) {
                order.innerHTML = "▴";
            } else {
                order.innerHTML = "▾";
            }
            this.appendChild(order);
            ssh.loadIDs();
        }
        defaultSpan.innerHTML = "Default"
        defaultSpan.title = "This field indicates whether or not this identity should be used by default for all connections.  NOTE: If an identity isn't set as default it can still be used for individual servers by using bookmarks or passing it as a query string parameter to the ssh:// URL when opening a new terminal.  For example:  ssh://user@host:22/?identity=*name*";
        nameSpan.innerHTML = "Name";
        nameSpan.title = "The *name* of this identity.  NOTE: The name represented here actually encompasses two or three files:  '*name*', '*name*.pub', and if there's an associated X.509 certificate, '*name*-cert.pub'.";
        bitsSpan.innerHTML = "Bits";
        bitsSpan.title = "The cryptographic key size.  NOTE:  RSA keys can have a value from 768 to 4096 (with 2048 being the most common), DSA keys must have a value of 1024, and ECDSA (that is, Elliptic Curve DSA) keys must be one of 256, 384, or 521 (that's not a typo: five hundred twenty one)";
        keytypeSpan.innerHTML = "Keytype";
        keytypeSpan.title = "Indicates the type of key used by this identity.  One of RSA, DSA, or ECDSA.";
        certSpan.innerHTML = "Cert";
        certSpan.title = "This field indicates whether or not there's an X.509 certificate associated with this identity (i.e. a '*name*-cert.pub' file).  X.509 certificates (for use with SSH) are created by signing a public key using a Certificate Authority (CA).  NOTE: In order to use X.509 certificates for authentication with SSH the servers you're connecting to must be configured to trust keys signed by a given CA.";
        commentSpan.innerHTML = "Comment";
        commentSpan.title = "This field will contain the comment from the identity's public key.  It comes after the key itself inside its .pub file and if the key was generated by OpenSSH it will typically be something like, 'user@host'.";
        if (localStorage[prefix+'ssh_ids_sort'] == 'alpha') {
            nameSpan.className = 'table_cell table_header_cell active';
            nameSpan.appendChild(sortOrder);
        } else if (localStorage[prefix+'ssh_ids_sort'] == 'date') {
            bitsSpan.className = 'table_cell table_header_cell active';
            bitsSpan.appendChild(sortOrder);
        } else if (localStorage[prefix+'ssh_ids_sort'] == 'size') {
            keytypeSpan.className = 'table_cell table_header_cell active';
            keytypeSpan.appendChild(sortOrder);
        }
        sshIDElemHeader.appendChild(defaultSpan);
        sshIDElemHeader.appendChild(nameSpan);
        sshIDElemHeader.appendChild(keytypeSpan);
        sshIDElemHeader.appendChild(bitsSpan);
        sshIDElemHeader.appendChild(commentSpan);
        sshIDElemHeader.appendChild(certSpan);
        sshIDListContainer.appendChild(sshIDElemHeader);
        sshIDContent.appendChild(sshIDListContainer);
        if (existingPanel) {
            // Remove everything first
            while (existingPanel.childNodes.length >= 1 ) {
                existingPanel.removeChild(existingPanel.firstChild);
            }
            existingPanel.appendChild(sshIDHeader);
            existingPanel.appendChild(sshNewID);
            existingPanel.appendChild(sshUploadID);
            existingPanel.appendChild(sshIDContent);
        } else {
            sshIDPanel.appendChild(sshIDHeader);
            sshIDPanel.appendChild(sshNewID);
            sshIDPanel.appendChild(sshUploadID);
            sshIDPanel.appendChild(sshIDContent);
            u.getNode(go.prefs.goDiv).appendChild(sshIDPanel);
        }
    },
    loadIDs: function() {
        // After GateOne.SSH.identities has been populated, this function will redraw the view depending on sort and pagination values
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_ssh_ids');
        ssh.delay = 500; // Reset it
        // Make sure the panel is visible
        if (go.Visual.getTransform(existingPanel) != "scale(1)") {
            go.Visual.togglePanel('#'+prefix+'panel_ssh_ids');
        }
        // Kick off the process to list them
        go.ws.send(JSON.stringify({'ssh_get_identities': true}));
    },
    incomingIDsAction: function(message) {
        // Adds *message['identities']* to GateOne.SSH.identities and places them into the view.
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_ssh_ids'),
            sshIDHeaderH2 = u.getNode('#'+prefix+'ssh_ids_title'),
            sshIDMetadataDiv = u.getNode('#'+prefix+'ssh_id_metadata'),
            sshIDListContainer = u.getNode('#'+prefix+'ssh_ids_listcontainer'),
            IDElements = u.toArray(u.getNodes('.ssh_id'));
        if (message['identities']) {
            ssh.identities = message['identities'];
        }
        existingPanel.style['overflow-y'] = "hidden"; // Only temporary while we're loading
        setTimeout(function() {
            existingPanel.style['overflow-y'] = "auto"; // Set it back after everything is loaded
        }, 750);
        if (IDElements) { // Remove any existing elements from the list
            IDElements.forEach(function(identity) {
                identity.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(identity);
                }, 1000);
            });
        }
        // Clear any leftover metadata
        while (sshIDMetadataDiv.childNodes.length >= 1 ) {
            sshIDMetadataDiv.removeChild(sshIDMetadataDiv.firstChild);
        }
        sshIDMetadataDiv.innerHTML = '<p id="' + prefix + 'ssh_id_tip"><i><b>Tip:</b> Click on an identity to see its information.</i></p>';
        setTimeout(function() {
            go.Visual.applyTransform(sshIDMetadataDiv, '');
            setTimeout(function() {
                var tip = u.getNode('#'+prefix+'ssh_id_tip');
                if (tip) {
                    tip.style.opacity = 0;
                }
            }, 10000);
        }, ssh.delay);
        // Apply the sort function
        ssh.identities.sort(ssh.sortfunc);
        if (ssh.sortToggle) {
            ssh.identities.reverse();
        }
        // This just makes sure they slide in one at a time (because it looks nice)
        ssh.identities.forEach(function(identity) {
            ssh.createIDItem(sshIDListContainer, identity, ssh.delay);
            ssh.delay += 50;
        });
        ssh.delay = 500;
        sshIDHeaderH2.innerHTML = "SSH Identity Manager";
    },
    displayMetadata: function(identity) {
        // Displays the information about the given *identity* (its name) in the SSH identities metadata area (on the right).
        // Also displays the buttons that allow the user to delete the identity or upload a certificate.
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            downloadButton = u.createElement('button', {'id': 'ssh_id_download', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            deleteIDButton = u.createElement('button', {'id': 'ssh_id_delete', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            uploadCertificateButton = u.createElement('button', {'id': 'ssh_id_upload_cert', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            sshIDMetadataDiv = u.getNode('#'+prefix+'ssh_id_metadata'),
            IDObj = null;
        // Retreive the metadata on the log in question
        for (var i in ssh.identities) {
            if (ssh.identities[i]['name'] == identity) {
                IDObj = ssh.identities[i];
            }
        }
        if (!IDObj) {
            // Not found, nothing to display
            return;
        }
        downloadButton.innerHTML = "Download";
        downloadButton.onclick = function(e) {
            go.ws.send(JSON.stringify({'ssh_get_private_key': IDObj['name']}));
            go.ws.send(JSON.stringify({'ssh_get_public_key': IDObj['name']}));
        }
        deleteIDButton.innerHTML = "Delete " + IDObj['name'];
        deleteIDButton.title = "Delete this identity";
        deleteIDButton.onclick = function(e) {
            // Display a confirmation dialog
            var container = u.createElement('div', {'style': {'text-align': 'center'}}),
                yes = u.createElement('button', {'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
                no = u.createElement('button', {'type': 'submit', 'value': 'Submit', 'class': 'button black'});
            yes.innerHTML = "Yes";
            no.innerHTML = "No";
            container.appendChild(yes);
            container.appendChild(no);
            var closeDialog = go.Visual.dialog('Delete identity ' + IDObj['name'] + '?', container);
            yes.onclick = function(e) {
                go.ws.send(JSON.stringify({'ssh_delete_identity': IDObj['name']}));
                closeDialog();
            }
            no.onclick = closeDialog;
        }
        uploadCertificateButton.title = "An X.509 certificate may be uploaded to add to this identity.  If one already exists, the existing certificate will be overwritten.";
        uploadCertificateButton.onclick = function(e) {
            ssh.uploadCertificateForm(identity);
        }
        var metadataNames = {
            'Identity Name': IDObj['name'],
            'Keytype': IDObj['keytype'],
            'Bits': IDObj['bits'],
            'Fingerprint': IDObj['fingerprint'],
            'Comment': IDObj['comment'],
            'Bubble Babble': IDObj['bubblebabble'],
        };
        if (IDObj['certinfo']) {
            // Only display cert info if there's actually cert info to display
            metadataNames['Certificate Info'] = IDObj['certinfo'];
            uploadCertificateButton.innerHTML = "Replace Certificate";
        } else {
            // Only display randomart if there's no cert info because otherwise it takes up too much space
            metadataNames['Randomart'] = IDObj['randomart'];
            uploadCertificateButton.innerHTML = "Upload Certificate";
        }
        // Remove existing content first
        while (sshIDMetadataDiv.childNodes.length >= 1 ) {
            sshIDMetadataDiv.removeChild(sshIDMetadataDiv.firstChild);
        }
        var actionsrow = u.createElement('div', {'class': 'metadata_row'}),
            actionstitle = u.createElement('div', {'class':'ssh_id_metadata_title'});
        actionstitle.innerHTML = 'Actions';
        actionsrow.appendChild(actionstitle);
        actionsrow.appendChild(downloadButton);
        actionsrow.appendChild(deleteIDButton);
        actionsrow.appendChild(uploadCertificateButton);
        sshIDMetadataDiv.appendChild(actionsrow);
        var pubkeyrow = u.createElement('div', {'class': 'metadata_row'}),
            pubkeytitle = u.createElement('div', {'class':'ssh_id_metadata_title'}),
            pubkeyvalue = u.createElement('textarea', {'class':'ssh_id_pubkey_value'});
        pubkeytitle.innerHTML = 'Public Key';
        pubkeyvalue.innerHTML = IDObj['public'];
        pubkeyvalue.title = "Click me to select all";
        pubkeyvalue.onclick = function(e) {
            // Select all in the textarea when it is clicked
            this.focus();
            this.select();
        }
        pubkeyrow.appendChild(pubkeytitle);
        pubkeyrow.appendChild(pubkeyvalue);
        sshIDMetadataDiv.appendChild(pubkeyrow);
        for (var i in metadataNames) {
            var row = u.createElement('div', {'class': 'metadata_row'}),
                title = u.createElement('div', {'class':'ssh_id_metadata_title'}),
                value = u.createElement('div', {'class':'ssh_id_metadata_value'});
            title.innerHTML = i;
            value.innerHTML = metadataNames[i];
            row.appendChild(title);
            row.appendChild(value);
            sshIDMetadataDiv.appendChild(row);
        }
    },
    createIDItem: function(container, IDObj, delay) {
        // Creates an SSH identity element using *IDObj* and places it into *container*.
        // *delay* controls how long it will wait before using a CSS3 effect to move it into view.
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            elem = u.createElement('div', {'class':'sectrans ssh_id', 'name': prefix+'ssh_id'}),
            IDViewOptions = u.createElement('span', {'class': 'ssh_id_options'}),
            viewPubKey = u.createElement('a'),
            defaultSpan = u.createElement('span', {'class':'table_cell ssh_id_default'}),
            defaultCheckbox = u.createElement('input', {'type': 'checkbox', 'name': 'ssh_id_default', 'value': IDObj['name']}),
            nameSpan = u.createElement('span', {'class':'table_cell ssh_id_name'}),
            keytypeSpan = u.createElement('span', {'class':'table_cell'}),
            certSpan = u.createElement('span', {'class':'table_cell'}),
            bitsSpan = u.createElement('span', {'class':'table_cell'}),
            commentSpan = u.createElement('span', {'class':'table_cell'}),
            isCertificate = "No";
        defaultCheckbox.checked = IDObj['default'];
        defaultCheckbox.onchange = function(e) {
            // Post the update to the server
            var newDefaults = [],
                defaultIDs = u.toArray(u.getNodes('input[name="ssh_id_default"]')); // I love CSS selectors!
            defaultIDs.forEach(function(idNode){ // I also love forEach!
                if (idNode.checked) {
                    newDefaults.push(idNode.value);
                }
            });
            GateOne.ws.send(JSON.stringify({'ssh_set_default_identities': newDefaults}));
        }
        defaultSpan.appendChild(defaultCheckbox);
        nameSpan.innerHTML = "<b>" + IDObj['name'] + "</b>";
        keytypeSpan.innerHTML = IDObj['keytype'];
        commentSpan.innerHTML = IDObj['comment'];
        bitsSpan.innerHTML = IDObj['bits'];
        if (IDObj['certinfo'].length) {
            isCertificate = "Yes";
        }
        certSpan.innerHTML = isCertificate;
        elem.appendChild(defaultSpan);
        elem.appendChild(nameSpan);
        elem.appendChild(keytypeSpan);
        elem.appendChild(bitsSpan);
        elem.appendChild(commentSpan);
        elem.appendChild(certSpan);
        with ({ name: IDObj['name'] }) {
            elem.onclick = function(e) {
                // Highlight the selected row and show the metadata
                u.toArray(u.getNodes('.ssh_id')).forEach(function(node) {
                    // Reset them all before we apply the 'active' class to just the one
                    node.className = 'halfsectrans ssh_id';
                });
                this.className = 'halfsectrans ssh_id active';
                ssh.displayMetadata(name);
            }
        }
        elem.style.opacity = 0;
        go.Visual.applyTransform(elem, 'translateX(-300%)');
        setTimeout(function() {
            // Fade it in
            elem.style.opacity = 1;
        }, delay);
        try {
            container.appendChild(elem);
        } catch(e) {
            u.noop(); // Sometimes the container will be missing between page loads--no biggie
        }
        setTimeout(function() {
            try {
                go.Visual.applyTransform(elem, '');
            } catch(e) {
                u.noop(); // Element was removed already.  No biggie.
            }
        }, delay);
        return elem;
    },
    getMaxIDs: function(elem) {
        // Calculates and returns the number of SSH identities that will fit in the given element ID (elem).
        try {
            var go = GateOne,
                ssh = go.SSH,
                u = go.Utils,
                node = u.getNode(elem),
                tempID = {
                    'bits': '2048',
                    'bubblebabble': 'xilek-suneb-konon-ruzem-fehis-mobut-hohud-dupul-bafoc-vepur-lixux',
                    'certinfo': '/opt/gateone/users/riskable@gmail.com/ssh/id_rsa-cert.pub:\n        Type: ssh-rsa-cert-v01@openssh.com user certificate\n        Public key: RSA-CERT 80:57:2c:18:f9:86:ab:8b:64:27:db:6f:5e:03:3f:d9\n        Signing CA: RSA 86:25:b0:73:67:0f:51:2e:a7:96:63:08:fb:d6:69:94\n        Key ID: "user_riskable"\n        Serial: 0\n        Valid: from 2012-01-08T13:38:00 to 2013-01-06T13:39:27\n        Principals: \n                riskable\n        Critical Options: (none)\n        Extensions: \n                permit-agent-forwarding\n                permit-port-forwarding\n                permit-pty\n                permit-user-rc\n                permit-X11-forwarding',
                    'comment': 'riskable@portarisk\n',
                    'fingerprint': '80:57:2c:18:f9:86:ab:8b:64:27:db:6f:5e:03:3f:d9',
                    'keytype': 'RSA',
                    'name': 'id_rsa',
                    'public': 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA5NB/jsYcTkixGsQZGx1zdS9dUPmuQNFdu5QtPv2TLLwSc3k1xjnVchUsH4iHSnasqFNk6pUPlFQrX94MXaLUrp/tkR11bjmReIT2Kl2IrzKdsq6XVAek5EfqwjqIZYUPsDGZ8BpoHC3bM2f+3Ba+6ahlecfyYcfjy/XggZow6vBQEgGKBfMCjRfS0pMshpgwFGBTL+zrxicpljNRm0Km8YjgMEnsBeJN5Vi+qJ1Tbw0SpM/z50p5qkoxV7N/lmKzTh8HOQqs8HJZT5WBMk4xRQqI36c6CsR0VBizKnVkdDPN6eWM2TdkQN7cWXzasWKSfonFF/A1UyZv4vKo3EKRhQ== riskable@portarisk\n',
                    'randomart': '+--[ RSA 2048]----+\n|    .+ ..        |\n|    o....        |\n|    .oo.         |\n|    ..o.         |\n|     +  S        |\n|    . o o        |\n| + o   * E       |\n|o.*  .. o        |\n|...o+o           |\n+-----------------+'
                },
                IDElement = l.createIDItem(node, tempID, 500);
                nodeStyle = window.getComputedStyle(node, null),
                elemStyle = window.getComputedStyle(IDElement, null),
                nodeHeight = parseInt(nodeStyle['height'].split('px')[0]),
                height = parseInt(elemStyle['height'].split('px')[0]),
                marginBottom = parseInt(elemStyle['marginBottom'].split('px')[0]),
                paddingBottom = parseInt(elemStyle['paddingBottom'].split('px')[0]),
                borderBottomWidth = parseInt(elemStyle['borderBottomWidth'].split('px')[0]),
                borderTopWidth = parseInt(elemStyle['borderTopWidth'].split('px')[0]),
                elemHeight = height+marginBottom+paddingBottom+borderBottomWidth+borderTopWidth,
                max = Math.floor(nodeHeight/ elemHeight);
        } catch(e) {
            return 1;
        }
        u.removeElement(IDElement); // Don't want this hanging around
        return max;
    },
    newIDForm: function() {
        // Displays the dialog/form where a user can create or edit an SSH identity.
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            sshIDPanel = u.getNode('#'+prefix+'panel_ssh_ids'),
            identityForm = u.createElement('form', {'name': prefix+'ssh_id_form', 'class': 'ssh_id_form'}),
            nameInput = u.createElement('input', {'type': 'text', 'id': 'ssh_new_id_name', 'name': prefix+'ssh_new_id_name', 'placeholder': '<letters, numbers, underscore>', 'tabindex': 1, 'required': 'required', 'pattern': '[A-Za-z0-9_]+'}),
            nameLabel = u.createElement('label'),
            keytypeLabel = u.createElement('label'),
            keytypeSelect = u.createElement('select', {'id': 'ssh_new_id_keytype', 'name': prefix+'ssh_new_id_keytype'}),
            rsaType = u.createElement('option', {'value': 'rsa'}),
            dsaType = u.createElement('option', {'value': 'dsa'}),
            ecdsaType = u.createElement('option', {'value': 'ecdsa'}),
            bitsLabel = u.createElement('label'),
            bitsSelect = u.createElement('select', {'id': 'ssh_new_id_bits', 'name': prefix+'ssh_new_id_bits'}),
            bits256 = u.createElement('option', {'value': '256'}),
            bits384 = u.createElement('option', {'value': '384'}),
            bits521 = u.createElement('option', {'value': '521', 'selected': 'selected'}),
            bits768 = u.createElement('option', {'value': '768'}),
            bits1024 = u.createElement('option', {'value': '1024'}),
            bits2048 = u.createElement('option', {'value': '2048'}),
            bits4096 = u.createElement('option', {'value': '4096', 'selected': 'selected'}),
            ecdsaBits = [bits256, bits384, bits521],
            dsaBits = [bits1024],
            rsaBits = [bits768, bits1024, bits2048, bits4096],
            passphraseInput = u.createElement('input', {'type': 'password', 'id': 'ssh_new_id_passphrase', 'name': prefix+'ssh_new_id_passphrase', 'placeholder': '<Optional>', 'pattern': '.{4}.+'}), // That pattern means > 4 characters
            verifyPassphraseInput = u.createElement('input', {'type': 'password', 'id': 'ssh_new_id_passphrase_verify', 'name': prefix+'ssh_new_id_passphrase_verify', 'placeholder': '<Optional>', 'pattern': '.{4}.+'}),
            passphraseLabel = u.createElement('label'),
            commentInput = u.createElement('input', {'type': 'text', 'id': 'ssh_new_id_comment', 'name': prefix+'ssh_new_id_comment', 'placeholder': '<Optional>'}),
            commentLabel = u.createElement('label'),
            submit = u.createElement('button', {'id': 'submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            cancel = u.createElement('button', {'id': 'cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            nameValidate = function(e) {
                var nameNode = u.getNode('#'+prefix+'ssh_new_id_name'),
                    text = nameNode.value;
                if (text != text.match(/[A-Za-z0-9_]+/)) {
                    nameNode.setCustomValidity("Valid characters: Numbers, Letters, Underscores");
                } else {
                    nameNode.setCustomValidity("");
                }
            },
            passphraseValidate = function(e) {
                var passphraseNode = u.getNode('#'+prefix+'ssh_new_id_passphrase'),
                    verifyNode = u.getNode('#'+prefix+'ssh_new_id_passphrase_verify');
                if (passphraseNode.value != verifyNode.value) {
                    verifyNode.setCustomValidity("Error: Passwords do not match.");
                } else if (passphraseNode.value.length < 5) {
                    verifyNode.setCustomValidity("Error: Must be longer than four characters.");
                } else {
                    verifyNode.setCustomValidity("");
                }
            };
        submit.innerHTML = "Submit";
        cancel.innerHTML = "Cancel";
        nameLabel.innerHTML = "Name";
        nameLabel.htmlFor = prefix+'ssh_new_id_name';
        nameInput.oninput = nameValidate;
        passphraseInput.oninput = passphraseValidate;
        verifyPassphraseInput.oninput = passphraseValidate;
        keytypeLabel.innerHTML = "Keytype";
        keytypeLabel.htmlFor = prefix+'ssh_new_id_keytype';
        rsaType.innerHTML = "RSA";
        dsaType.innerHTML = "DSA";
        ecdsaType.innerHTML = "ECDSA";
        keytypeSelect.appendChild(ecdsaType);
        keytypeSelect.appendChild(dsaType);
        keytypeSelect.appendChild(rsaType);
        bitsLabel.innerHTML = "Bits";
        bitsLabel.htmlFor = prefix+'ssh_new_id_bits';
        bits521.innerHTML = "521";
        bits384.innerHTML = "384";
        bits256.innerHTML = "256";
        bits768.innerHTML = "768";
        bits1024.innerHTML = "1024"; // NOTE: Only valid option for DSA
        bits2048.innerHTML = "2048";
        bits4096.innerHTML = "4096";
        // Start with ECDSA options by default
        bitsSelect.appendChild(bits521);
        bitsSelect.appendChild(bits384);
        bitsSelect.appendChild(bits256);
        keytypeSelect.onchange = function(e) {
            // Change the bits to reflect the valid options based on the keytype
            u.toArray(bitsSelect.childNodes).forEach(function(node) {
                // Remove all bits options
                u.removeElement(node);
            });
            // Now add in the valid options
            if (keytypeSelect.selectedIndex == 0) { // ecdsa
                ecdsaBits.forEach(function(option) {
                    bitsSelect.appendChild(option);
                });
            } else if (keytypeSelect.selectedIndex == 1) { // dsa
                dsaBits.forEach(function(option) {
                    bitsSelect.appendChild(option);
                });
            } else if (keytypeSelect.selectedIndex == 2) { // rsa
                rsaBits.forEach(function(option) {
                    bitsSelect.appendChild(option);
                });
            }
        }
        passphraseLabel.innerHTML = "Passphrase";
        passphraseLabel.htmlFor = prefix+'ssh_new_id_passphrase';
        commentLabel.innerHTML = "Comment";
        commentLabel.htmlFor = prefix+'ssh_new_id_comment';
        identityForm.appendChild(nameLabel);
        identityForm.appendChild(nameInput);
        identityForm.appendChild(keytypeLabel);
        identityForm.appendChild(keytypeSelect);
        identityForm.appendChild(bitsLabel);
        identityForm.appendChild(bitsSelect);
        identityForm.appendChild(passphraseLabel);
        identityForm.appendChild(passphraseInput);
        identityForm.appendChild(verifyPassphraseInput);
        identityForm.appendChild(commentLabel);
        identityForm.appendChild(commentInput);
        identityForm.appendChild(submit);
        identityForm.appendChild(cancel);
        var closeDialog = go.Visual.dialog('New SSH Identity', identityForm);
        cancel.onclick = closeDialog;
        setTimeout(function() {
            setTimeout(function() {
                u.getNode('#'+prefix+'ssh_new_id_name').focus();
            }, 1000);
        }, 500);
        identityForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // Grab the form values
            var name = u.getNode('#'+prefix+'ssh_new_id_name').value,
                keytype = u.getNode('#'+prefix+'ssh_new_id_keytype').value,
                bits = u.getNode('#'+prefix+'ssh_new_id_bits').value,
                passphrase = u.getNode('#'+prefix+'ssh_new_id_passphrase').value,
                comment = u.getNode('#'+prefix+'ssh_new_id_comment').value,
                settings = {'name': name, 'keytype': keytype, 'bits': bits};
            if (passphrase) {
                settings['passphrase'] = passphrase;
            }
            if (comment) {
                settings['comment'] = comment;
            }
            go.ws.send(JSON.stringify({'ssh_gen_new_keypair': settings}));
            closeDialog();
            ssh.loadIDs();
        }
    },
    uploadIDForm: function() {
        // Displays the dialog/form where a user can upload an SSH identity (that's already been created)
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            sshIDPanel = u.getNode('#'+prefix+'panel_ssh_ids'),
            uploadIDForm = u.createElement('form', {'name': prefix+'ssh_upload_id_form', 'class': 'ssh_id_form'}),
            privateKeyFile = u.createElement('input', {'type': 'file', 'id': 'ssh_upload_id_privatekey', 'name': prefix+'ssh_upload_id_privatekey', 'required': 'required'}),
            privateKeyFileLabel = u.createElement('label'),
            publicKeyFile = u.createElement('input', {'type': 'file', 'id': 'ssh_upload_id_publickey', 'name': prefix+'ssh_upload_id_publickey', 'required': 'required'}),
            publicKeyFileLabel = u.createElement('label'),
            certificateFile = u.createElement('input', {'type': 'file', 'id': 'ssh_upload_id_cert', 'name': prefix+'ssh_upload_id_cert'}),
            certificateFileLabel = u.createElement('label'),
            submit = u.createElement('button', {'id': 'submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            cancel = u.createElement('button', {'id': 'cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        submit.innerHTML = "Submit";
        cancel.innerHTML = "Cancel";
        privateKeyFileLabel.innerHTML = "Private Key";
        privateKeyFileLabel.htmlFor = prefix+'ssh_upload_id_privatekey';
        publicKeyFileLabel.innerHTML = "Public Key";
        publicKeyFileLabel.htmlFor = prefix+'ssh_upload_id_publickey';
        certificateFileLabel.innerHTML = "Optional Certificate";
        certificateFileLabel.htmlFor = prefix+'ssh_upload_id_cert';
        uploadIDForm.appendChild(privateKeyFileLabel);
        uploadIDForm.appendChild(privateKeyFile);
        uploadIDForm.appendChild(publicKeyFileLabel);
        uploadIDForm.appendChild(publicKeyFile);
        uploadIDForm.appendChild(certificateFileLabel);
        uploadIDForm.appendChild(certificateFile);
        uploadIDForm.appendChild(submit);
        uploadIDForm.appendChild(cancel);
        var closeDialog = go.Visual.dialog('Upload SSH Identity', uploadIDForm);
        cancel.onclick = closeDialog;
        uploadIDForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // Grab the form values
            var privFile = u.getNode('#'+prefix+'ssh_upload_id_privatekey').files[0],
                pubFile = u.getNode('#'+prefix+'ssh_upload_id_publickey').files[0],
                certFile = u.getNode('#'+prefix+'ssh_upload_id_cert').files[0],
                privateKeyReader = new FileReader(),
                sendPrivateKey = function(evt) {
                    var data = evt.target.result,
                        settings = {
                            'name': privFile.fileName, // The 'name' here represents the name of the identity, not the file, specifically
                            'private': data,
                        };
                    go.ws.send(JSON.stringify({'ssh_store_id_file': settings}));
                },
                publicKeyReader = new FileReader(),
                sendPublicKey = function(evt) {
                    var data = evt.target.result,
                        settings = {
                            'name': privFile.fileName,
                            'public': data,
                        };
                    go.ws.send(JSON.stringify({'ssh_store_id_file': settings}));
                },
                certificateReader = new FileReader(),
                sendCertificate = function(evt) {
                    var data = evt.target.result,
                        settings = {
                            'name': privFile.fileName,
                            'certificate': data,
                        };
                    go.ws.send(JSON.stringify({'ssh_store_id_file': settings}));
                };
            // Get the data out of the files
            privateKeyReader.onload = sendPrivateKey;
            privateKeyReader.readAsText(privFile);
            publicKeyReader.onload = sendPublicKey;
            publicKeyReader.readAsText(pubFile);
            certificateReader.onload = sendCertificate;
            certificateReader.readAsText(certFile);
            closeDialog();
        }
    },
    uploadCertificateForm: function(identity) {
        // Displays the dialog/form where a user can add or replace a certificate associated with their identity
        // *identity* should be the name of the identity associated with this certificate
        var go = GateOne,
            u = go.Utils,
            ssh = go.SSH,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            sshIDPanel = u.getNode('#'+prefix+'panel_ssh_ids'),
            uploadCertForm = u.createElement('form', {'name': prefix+'ssh_upload_cert_form', 'class': 'ssh_id_form'}),
            certificateFile = u.createElement('input', {'type': 'file', 'id': 'ssh_upload_id_cert', 'name': prefix+'ssh_upload_id_cert'}),
            certificateFileLabel = u.createElement('label'),
            submit = u.createElement('button', {'id': 'submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            cancel = u.createElement('button', {'id': 'cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        submit.innerHTML = "Submit";
        cancel.innerHTML = "Cancel";
        certificateFileLabel.innerHTML = "Optional Certificate";
        certificateFileLabel.htmlFor = prefix+'ssh_upload_id_cert';
        uploadCertForm.appendChild(certificateFileLabel);
        uploadCertForm.appendChild(certificateFile);
        uploadCertForm.appendChild(submit);
        uploadCertForm.appendChild(cancel);
        var closeDialog = go.Visual.dialog('Upload X.509 Certificate', uploadCertForm);
        cancel.onclick = closeDialog;
        uploadCertForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // Grab the form values
            var certFile = u.getNode('#'+prefix+'ssh_upload_id_cert').files[0],
                certificateReader = new FileReader(),
                sendCertificate = function(evt) {
                    var data = evt.target.result,
                        settings = {
                            'name': identity,
                            'certificate': data,
                        };
                    go.ws.send(JSON.stringify({'ssh_store_id_file': settings}));
                };
            // Get the data out of the files
            certificateReader.onload = sendCertificate;
            certificateReader.readAsText(certFile);
            closeDialog();
        }
    },
    getConnectString: function(term) {
        // Asks the SSH plugin on the Gate One server what the SSH connection string is for the given *term*.
        GateOne.ws.send(JSON.stringify({'ssh_get_connect_string': term}));
    },
    deleteCompleteAction: function(message) {
        // Called when an identity is deleted
        GateOne.SSH.loadIDs();
    },
    handleConnect: function(connectString) {
        // Handles the 'sshjs_connect' action which should provide an SSH *connectString* in the form of user@host:port
        // The *connectString* will be stored in GateOne.terminals[term]['sshConnectString'] which is meant to be used in duplicating terminals (because you can't rely on the title).
        // Also requests the host's public certificate to have it displayed to the user.
        logDebug('sshjs_connect: ' + connectString);
        var go = GateOne,
            host = connectString.split('@')[1].split(':')[0],
            port = connectString.split('@')[1].split(':')[1],
            message = {'host': host, 'port': port},
            term = localStorage[go.prefs.prefix+'selectedTerminal'];
        go.terminals[term]['sshConnectString'] = connectString;
        go.ws.send(JSON.stringify({'ssh_get_host_fingerprint': message}));
    },
    handleReconnect: function(jsonDoc) {
        // Handles the 'sshjs_reconnect' action which should provide a JSON-encoded dictionary containing each terminal's SSH connection string.
        // Example *jsonDoc*: "{1: 'user@host1:22', 2: 'user@host2:22'}"
        var go = GateOne,
            dict = JSON.parse(jsonDoc);
        for (var term in dict) {
            go.terminals[term]['sshConnectString'] = dict[term];
            // Also fix the title while we're at it
//             go.Visual.setTitleAction({'term': term, 'title': dict[term]});
        }
    },
    keygenComplete: function(message) {
        // Called when we receive a message from the server indicating a keypair was generated successfully
        var go = GateOne,
            ssh = go.SSH,
            v = go.Visual;
        if (message['result'] == 'Success') {
            v.displayMessage('Keypair generation complete.');
        } else {
            v.displayMessage(message['result']);
        }
        ssh.loadIDs();
    },
    saveComplete: function(message) {
        // Called when we receive a message from the server indicating the uploaded identity was saved
        var go = GateOne,
            ssh = go.SSH,
            v = go.Visual;
        if (message['result'] == 'Success') {
            v.displayMessage('Identity saved successfully.');
        } else {
            v.displayMessage(message['result']);
        }
        ssh.loadIDs();
    },
    duplicateSession: function(term) {
        // Duplicates the SSH session at *term* in a new terminal
        var go = GateOne,
            connectString = GateOne.terminals[term]['sshConnectString'];
        if (!connectString.length) {
            return; // Can't do anything without a connection string!
        }
        go.Terminal.newTerminal()
        setTimeout(function() {
            // Give the browser a moment to get the new terminal open
            go.Input.queue('ssh://' + connectString + '\n');
            go.Net.sendChars();
        }, 250);
    },
    updateKH: function(known_hosts) {
        // Updates the sshKHTextArea with the given *known_hosts* file.
        // NOTE: Meant to be used as the callback function passed to GateOne.Utils.xhrGet()
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            sshKHTextArea = u.getNode('#'+prefix+'ssh_kh_textarea');
        sshKHTextArea.value = known_hosts;
        // Now show the panel
        go.Visual.togglePanel('#'+prefix+'panel_known_hosts');
    },
    createKHPanel: function() {
        // Creates a panel where the user can edit their known_hosts file and appends it to #gateone
        // If the panel already exists, leave it but recreate the contents
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            existingPanel = u.getNode('#'+prefix+'panel_known_hosts'),
            sshPanel = u.createElement('div', {'id': 'panel_known_hosts', 'class': 'panel sectrans'}),
            sshHeader = u.createElement('div', {'id': 'ssh_header', 'class': 'sectrans'}),
            sshHRFix = u.createElement('hr', {'style': {'opacity': 0}}),
            sshKHTextArea = u.createElement('textarea', {'id': 'ssh_kh_textarea', 'rows': 30, 'cols': 100}),
            save = u.createElement('button', {'id': 'ssh_save', 'class': 'button black', 'type': 'submit'}),
            cancel = u.createElement('button', {'id': 'ssh_cancel', 'class': 'button black'}),
            form = u.createElement('form', {
                'method': 'post',
                'action': go.prefs.url+'ssh?known_hosts=True'
            });
        sshHeader.innerHTML = '<h2>SSH Plugin: Edit Known Hosts</h2>';
        sshHeader.appendChild(sshHRFix); // The HR here fixes an odd rendering bug with Chrome on Mac OS X
        save.innerHTML = "Save";
        cancel.innerHTML = "Cancel";
        cancel.onclick = function(e) {
            e.preventDefault(); // Don't submit the form
            go.Visual.togglePanel('#'+prefix+'panel_known_hosts'); // Hide the panel
        }
        sshKHTextArea.onfocus = function(e) {
            sshKHTextArea.focus();
            go.Input.disableCapture(); // So users can paste into it
        }
        sshKHTextArea.onblur = function(e) {
            go.Input.capture(); // Go back to normal
        }
        form.onsubmit = function(e) {
            // Submit the modified known_hosts file to the server and notify when complete
            e.preventDefault(); // Don't actually submit
            var kh = u.getNode('#'+prefix+'ssh_kh_textarea').value,
                xhr = new XMLHttpRequest(),
                handleStateChange = function(e) {
                    var status = null;
                    try {
                        status = parseInt(e.target.status);
                    } catch(e) {
                        return;
                    }
                    if (e.target.readyState == 4 && status == 200 && e.target.responseText) {
                        go.Visual.displayMessage("SSH Plugin: known_hosts saved.");
                        // Hide the panel
                        go.Visual.togglePanel('#'+prefix+'panel_known_hosts');
                    }
                };
            if (xhr.addEventListener) {
                xhr.addEventListener('readystatechange', handleStateChange, false);
            } else {
                xhr.onreadystatechange = handleStateChange;
            }
            xhr.open('POST', go.prefs.url+'ssh?known_hosts=True', true);
            xhr.send(kh);
        }
        form.appendChild(sshHeader);
        form.appendChild(sshKHTextArea);
        form.appendChild(sshHRFix);
        form.appendChild(save);
        form.appendChild(cancel);
        if (existingPanel) {
            // Remove everything first
            while (existingPanel.childNodes.length >= 1 ) {
                existingPanel.removeChild(existingPanel.firstChild);
            }
            sshHeader.style.opacity = 0;
            existingPanel.appendChild(form);
        } else {
            sshPanel.appendChild(form);
            u.getNode(go.prefs.goDiv).appendChild(sshPanel);
        }
    },
    displayHostFingerprint: function(message) {
        // Displays the host's key as sent by the server via the sshjs_display_fingerprint action.
        // The fingerprint will be colorized using the hex values of the fingerprint as the color code with the last value highlighted in bold.
        // {"sshjs_display_fingerprint": {"result": "Success", "fingerprint": "cc:2f:b9:4f:f6:c0:e5:1d:1b:7a:86:7b:ff:86:97:5b"}}
        var go = GateOne,
            v = go.Visual;
        if (message['result'] == 'Success') {
            var fingerprint = message['fingerprint'],
                hexes = fingerprint.split(':'),
                text = '',
                colorized = '',
                count = 0;
            colorized += '<span style="color: #';
            hexes.forEach(function(hex) {
                if (count == 3 || count == 6 || count == 9 || count == 12) {
                    colorized += '">' + text + '</span><span style="color: #' + hex;
                    text = hex;
                } else if (count == 15) {
                    colorized += '">' + text + '</span><span style="text-decoration: underline">' + hex + '</span>';
                } else {
                    colorized += hex;
                    text += hex;
                }
                count += 1;
            });
            v.displayMessage('Fingerprint of <i>' + message['host'] + '</i>: ' + colorized);
        }
    }
});

})(window);