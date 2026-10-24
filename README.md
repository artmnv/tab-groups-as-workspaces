## Tab Groups as Workspaces

A Chrome extension that simplifies tab group management by automatically collapsing inactive groups and organizing newly opened tabs.

### Features

* Automatic group collapsing: When a group is expanded, all other groups in the same window are automatically collapsed.
* Smart tab grouping: Newly opened tabs are automatically added to the currently expanded group.
* Ungrouped tabs when all groups are collapsed: If all groups are collapsed, newly opened tabs remain outside any group.

### Installation

1. Download and extract the extension ZIP archive into a folder.
2. Open Chrome and navigate to chrome://extensions.
3. Enable Developer mode in the top-right corner.
4. Click Load unpacked.
5. Select the extracted chrome_group_focus folder.

The extension will start working immediately after installation.

### Updating

If the extension is already installed:

1. Extract the updated archive.
2. If you extracted it to the same folder used by the existing installation, open chrome://extensions and click Reload on the extension card.
3. If you are using a different folder, remove the old extension and load the new folder using Load unpacked.

### Permissions

The extension requires the following Chrome permissions:

* tabGroups — Detects group state changes and expands or collapses groups.
