// Collapses other groups when a group is activated.
// New tabs join a group only while a group is explicitly active/open in that window.

const WINDOW_ACTIVE_GROUP = new Map(); // windowId -> groupId

async function safeGetTabs(query) {
  try { return await chrome.tabs.query(query); } catch { return []; }
}

async function safeGetGroups(query) {
  try { return await chrome.tabGroups.query(query); } catch { return []; }
}

async function collapseOtherGroups(windowId, activeGroupId) {
  const groups = await safeGetGroups({ windowId });
  await Promise.all(groups.map(async group => {
    if (group.id !== activeGroupId && !group.collapsed) {
      try { await chrome.tabGroups.update(group.id, { collapsed: true }); } catch {}
    } else if (group.id === activeGroupId && group.collapsed) {
      try { await chrome.tabGroups.update(group.id, { collapsed: false }); } catch {}
    }
  }));
}

async function getOpenGroupInWindow(windowId) {
  const groups = await safeGetGroups({ windowId });
  // If no group is expanded, there is no destination group for new tabs.
  const expanded = groups.filter(group => !group.collapsed);
  if (expanded.length !== 1) return null;
  return expanded[0].id;
}

async function addTabToGroup(tabId, groupId) {
  if (groupId == null) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    const group = await chrome.tabGroups.get(groupId);
    if (tab.windowId === group.windowId && tab.groupId !== groupId) {
      await chrome.tabs.group({ tabIds: [tabId], groupId });
    }
  } catch {}
}

async function handleActivatedTab(tab) {
  if (!tab || tab.id == null || tab.windowId == null) return;

  // Selecting a tab in a group activates that group and collapses the others.
  if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    WINDOW_ACTIVE_GROUP.set(tab.windowId, tab.groupId);
    await collapseOtherGroups(tab.windowId, tab.groupId);
    return;
  }

  // An ungrouped tab means the user is no longer working inside a group.
  // Do not keep assigning new tabs to a stale previously active group.
  const openGroup = await getOpenGroupInWindow(tab.windowId);
  if (openGroup == null) WINDOW_ACTIVE_GROUP.delete(tab.windowId);
  else WINDOW_ACTIVE_GROUP.set(tab.windowId, openGroup);
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    await handleActivatedTab(await chrome.tabs.get(tabId));
  } catch {}
});

// Clicking a group header changes its collapsed state. Do not create or select
// tabs in response; only synchronize the active-group tracking and collapse peers.
chrome.tabGroups.onUpdated.addListener(async group => {
  if (group.collapsed === false) {
    WINDOW_ACTIVE_GROUP.set(group.windowId, group.id);
    await collapseOtherGroups(group.windowId, group.id);
  } else if (group.collapsed === true) {
    const remainingOpenGroup = await getOpenGroupInWindow(group.windowId);
    if (remainingOpenGroup == null) {
      WINDOW_ACTIVE_GROUP.delete(group.windowId);
    } else {
      WINDOW_ACTIVE_GROUP.set(group.windowId, remainingOpenGroup);
      await collapseOtherGroups(group.windowId, remainingOpenGroup);
    }
  }
});

chrome.tabs.onCreated.addListener(async tab => {
  if (tab.id == null || tab.windowId == null) return;

  // A tab is grouped only when exactly one group is currently expanded.
  // If all groups are collapsed (or multiple groups are open), leave it ungrouped.
  setTimeout(async () => {
    const destinationGroupId = await getOpenGroupInWindow(tab.windowId);
    if (destinationGroupId != null) {
      await addTabToGroup(tab.id, destinationGroupId);
    }
  }, 150);
});

chrome.windows.onRemoved.addListener(windowId => {
  WINDOW_ACTIVE_GROUP.delete(windowId);
});

// Initialize tracking from each window's current state without opening tabs.
(async () => {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    if (win.id == null) continue;
    const groups = await safeGetGroups({ windowId: win.id });
    const expanded = groups.filter(group => !group.collapsed);
    if (expanded.length === 1) {
      WINDOW_ACTIVE_GROUP.set(win.id, expanded[0].id);
      await collapseOtherGroups(win.id, expanded[0].id);
    } else {
      WINDOW_ACTIVE_GROUP.delete(win.id);
    }
  }
})();
