async function safeGetGroups(windowId) {
  try { return await chrome.tabGroups.query({ windowId }); } catch { return []; }
}

async function collapseOtherGroups(windowId, activeGroupId) {
  const groups = await safeGetGroups(windowId);
  await Promise.all(groups.map(async group => {
    if (group.id !== activeGroupId && !group.collapsed) {
      try { await chrome.tabGroups.update(group.id, { collapsed: true }); } catch {}
    }
  }));
}

async function getOnlyOpenGroupInWindow(windowId) {
  const groups = await safeGetGroups(windowId);
  const expanded = groups.filter(group => !group.collapsed);
  if (expanded.length !== 1) return null;
  return expanded[0].id;
}

async function addTabToGroup(tabId, groupId) {
  if (tabId == null || groupId == null) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    const group = await chrome.tabGroups.get(groupId);
    if (tab.windowId === group.windowId && tab.groupId !== groupId) {
      await chrome.tabs.group({ tabIds: [tabId], groupId });
    }
  } catch {}
}

// Collapse other groups on group opening
chrome.tabGroups.onUpdated.addListener(async group => {
  if (group.collapsed === false) {
    await collapseOtherGroups(group.windowId, group.id);
  }
});

// Add new tabs to open groups
chrome.tabs.onCreated.addListener(async tab => {
  if (tab.id == null || tab.windowId == null) return;

  const destinationGroupId = await getOnlyOpenGroupInWindow(tab.windowId);
  if (destinationGroupId != null) {
    await addTabToGroup(tab.id, destinationGroupId);
  }
});
