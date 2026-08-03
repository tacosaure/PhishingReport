const QUICK_REPORT_ADDRESS = "phishing-reports@yourdomain.com"; // hardcoded target for Quick Report

// --- Entry point 1: toolbar button click while viewing a message -> Quick Report ---
messenger.messageDisplayAction.onClicked.addListener(async (tab) => {
  const message = await messenger.messageDisplay.getDisplayedMessage(tab.id);
  if (message) {
    await reportMessage(message, QUICK_REPORT_ADDRESS, "Security (Quick Report)", true);
  }
});

// --- Entry point 2: right-click context menu in the message list ---
messenger.menus.create({
  id: "quick-report",
  title: "Quick Report Suspicious Email",
  contexts: ["message_list"]
});

messenger.menus.create({
  id: "advanced-report",
  title: "Advanced Report (choose team)…",
  contexts: ["message_list"]
});

messenger.menus.onClicked.addListener(async (info, tab) => {
  const messages = await messenger.mailTabs.getSelectedMessages(tab.id);

  if (info.menuItemId === "quick-report") {
    for (const message of messages.messages) {
      await reportMessage(message, QUICK_REPORT_ADDRESS, "Security (Quick Report)", true);
    }
  }

  if (info.menuItemId === "advanced-report") {
    for (const message of messages.messages) {
      await openTeamPicker(message);
    }
  }
});

// --- Open the small popup window where the user picks a team (Advanced Report) ---
async function openTeamPicker(message) {
  await messenger.windows.create({
    url: `popup.html?messageId=${message.id}`,
    type: "popup",
    width: 320,
    height: 260
  });
}

// --- Listen for the user's team choice coming from popup.js ---
messenger.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "report-to-team") {
    const message = await messenger.messages.get(msg.messageId);
    await reportMessage(message, msg.teamEmail, msg.teamName, false);
  }
});

// --- Core logic: send the report to the given address, move to Junk, notify ---
// isQuickReport: true  -> hardcoded address is the "to" recipient
//                false -> hardcoded address is bcc'd alongside the chosen team as "to"
async function reportMessage(message, reportAddress, teamName, isQuickReport) {
  try {
    const details = isQuickReport
      ? {
          to: [reportAddress],
          subject: `[Reported] ${message.subject}`,
          body: `A user has reported this email as suspicious to ${teamName}. The original message is attached.`
        }
      : {
          to: [reportAddress],
          bcc: [QUICK_REPORT_ADDRESS],
          subject: `[Reported] ${message.subject}`,
          body: `A user has reported this email as suspicious to ${teamName}. The original message is attached.`
        };

    // Get the raw original message so headers are preserved for analysis
    const raw = await messenger.messages.getRaw(message.id);
    const blob = new Blob([raw], { type: "message/rfc822" });

    // Compose the report email with the original attached as .eml
    const composeTab = await messenger.compose.beginNew(undefined, details);
    await messenger.compose.addAttachment(composeTab.id, {
      file: new File([blob], "reported-email.eml", { type: "message/rfc822" }),
      name: "reported-email.eml"
    });

    // Send automatically (requires "compose.send" permission)
    await messenger.compose.sendMessage(composeTab.id);

    // Move the original message to the account's Junk/Spam folder
    let movedToJunk = false;
    const junkFolder = await findJunkFolder(message.folder.accountId);
    if (junkFolder) {
      await messenger.messages.move([message.id], junkFolder);
      movedToJunk = true;
    }

    // Notify the user of the outcome
    messenger.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Email Reported",
      message: movedToJunk
        ? `Reported to ${teamName} and moved to Spam.`
        : `Reported to ${teamName}. (Could not find a Spam folder to move it to.)`
    });

  } catch (err) {
    console.error("Failed to report message:", err);
    messenger.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Report Failed",
      message: err.message
    });
  }
}

// --- Helpers: locate the Junk/Spam folder for the message's account ---
async function findJunkFolder(accountId) {
  const account = await messenger.accounts.get(accountId);
  return searchFoldersForJunk(account.folders);
}

function searchFoldersForJunk(folders) {
  for (const folder of folders) {
    if (folder.type === "junk") {
      return folder;
    }
    if (folder.subFolders && folder.subFolders.length > 0) {
      const found = searchFoldersForJunk(folder.subFolders);
      if (found) return found;
    }
  }
  return null;
}
