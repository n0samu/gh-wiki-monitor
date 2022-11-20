function fetchHtml(url) {
  return UrlFetchApp.fetch(url).getContentText();
}

function getPrevHashes(wikiEdits) {
  // Loop through the all the edits except the oldest one, which doesn't have a previous edit
  for (i = 0; i < wikiEdits.length - 1; i++) {
    wikiEdits[i]['prev'] = wikiEdits[i + 1]['hash'];
  }
  return wikiEdits;
}

function fetchWikiEdits(repoInfo) {
  // Helper functions
  function getElemText(parentElem, selector) {
    return $(parentElem).find(selector).text().trim();
  }

  // Selectors to get info from the wiki history page
  const rowSelector = '#version-form li';
  const editSummarySelector = 'p';
  const usernameSelector = '.mt-1 span';
  const hashSelector = '.pl-2';

  // Load page into Cheerio
  const pageUrl = repoInfo['wikiUrl'] + '_history';
  const pageHtml = fetchHtml(pageUrl);
  const $ = Cheerio.load(pageHtml);

  // Parse wiki history and return as JSON array
  var wikiEdits = [];
  $(rowSelector).each((index, element) => {
    var rowData = {
      "hash": getElemText(element, hashSelector),
      "username": getElemText(element, usernameSelector),
      "summary": getElemText(element, editSummarySelector)
    };
    wikiEdits.push(rowData);
  });
  return getPrevHashes(wikiEdits);
}

function generateDiffUrl(repoInfo, wikiEdit) {
  const compareUrl = repoInfo['wikiUrl'] + '_compare/';
  if ('prev' in wikiEdit) {
    return compareUrl + wikiEdit['prev'] + '..' + wikiEdit['hash'];
  } else {
    return compareUrl + wikiEdit['hash'];
  }
}

function sendEmailNotification(emailAddress, repoInfo, wikiEdit) {
  const subject = 'Wiki change notification for ' + repoInfo['name'];
  const diffUrl = generateDiffUrl(repoInfo, wikiEdit);
  const message = `
  The ${repoInfo['name']} wiki was changed by ${wikiEdit['username']}.

  Summary: ${wikiEdit['summary']}

  View Changes: ${diffUrl}

  View History: ${repoInfo['wikiUrl'] + '_history'}
  `;
  GmailApp.sendEmail(emailAddress, subject, message);
}

function postToWebhook(url, payload) {
  const options = {
    "method" : "post",
    "payload" : payload,
  };
  return UrlFetchApp.fetch(url, options).getResponseCode();
}

function sendDiscordNotification(webhookUrl, repoInfo, wikiEdit) {
  const githubLogoUrl = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

  const diffUrl = generateDiffUrl(repoInfo, wikiEdit);
  const userUrl = 'https://github.com/' + wikiEdit['username'];
  const message = `
  **The [${repoInfo['name']} wiki](<${repoInfo['wikiUrl']}>) was changed by [${wikiEdit['username']}](<${userUrl}>)**.

  Summary: ${wikiEdit['summary']}

  [View Changes](<${diffUrl}>) | [View History](<${repoInfo['wikiUrl'] + '_history'}>)
  `;

  const payload = {
    'username': 'GitHub',
    'avatar_url': githubLogoUrl,
    'content': message
  };
  const response = postToWebhook(webhookUrl, payload);
  if (response >= 300) {
    Logger.log("Failed to send Discord notification. The response from the webhook was: " + response);
  }
}

function getNumNewObjs(oldArr, newArr, keyName) {
  for (const [index, elem] of newArr.entries()) {
    if (oldArr[0][keyName] === elem[keyName]) {
      return index;
    }
  }
  return newArr.length;
}

function main() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const githubRepo = scriptProperties.getProperty('GITHUB_REPO');
  const emailAddress = scriptProperties.getProperty('EMAIL_ADDRESS');
  const webhookUrl = scriptProperties.getProperty('DISCORD_WEBHOOK');
  const oldEdits = JSON.parse(scriptProperties.getProperty('WIKI_EDIT_DATA'));
  if (githubRepo === null) {
    Logger.log('Please set script property GITHUB_REPO to a repository name such as n0samu/gh-wiki-monitor');
    return;
  }
  if (emailAddress === null && webhookUrl === null) {
    Logger.log('Please set script property EMAIL_ADDRESS or DISCORD_WEBHOOK');
    return;
  }

  const repoInfo = {
    'name': githubRepo,
    'wikiUrl': 'https://github.com/' + githubRepo + '/wiki/'
  };

  const wikiEdits = fetchWikiEdits(repoInfo);
  var dataChanged = false;
  if (oldEdits === null) {
    Logger.log("First run - storing existing wiki edits");
    dataChanged = true;
  } else {
    const numNewEdits = getNumNewObjs(oldEdits, wikiEdits, 'hash');
    const newEdits = wikiEdits.slice(0, numNewEdits);
    for (wikiEdit of newEdits) {
      dataChanged = true;
      if (emailAddress !== null) {
        sendEmailNotification(emailAddress, repoInfo, wikiEdit);
      }
      if (webhookUrl !== null) {
        sendDiscordNotification(webhookUrl, repoInfo, wikiEdit);
      }
    }
  }
  if (dataChanged) {
    scriptProperties.setProperty('WIKI_EDIT_DATA', JSON.stringify(wikiEdits));
  }
}
