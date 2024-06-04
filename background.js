chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ listingsData: {} });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    });
});

const siteConfig = {
    "facebook.com/marketplace/create/item": {
        triggerReload: true,
        excludePatterns: ['?step=delivery', '?step=audience'],
        reloadedTabs: new Set()
    },
    "stockx.com/sell": {
        triggerReload: true,
        excludePatterns: [],
        reloadedTabs: new Set()
    }
};

const siteMappings = {
    "eBay": "https://ebay.com/sl/prelist/suggest",
    "Facebook Marketplace": "https://facebook.com/marketplace/create/item",
    "Mercari": "https://mercari.com/sell/",
    "Grailed": "https://grailed.com/sell/new",
    "Depop": "https://www.depop.com/products/create/",
    "Craigslist": "https://post.craigslist.org/",
    "StockX": "https://stockx.com/sell",
    "Poshmark": "https://poshmark.com/sell"
};

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        Object.keys(siteConfig).forEach(site => {
            const config = siteConfig[site];
            if (changeInfo.url.includes(site) && !config.excludePatterns.some(pattern => changeInfo.url.includes(pattern))) {
                if (!config.reloadedTabs.has(tabId)) {
                    console.log(`Detected change at ${site}, reloading...`);
                    config.reloadedTabs.add(tabId);
                    chrome.tabs.reload(tabId);
                }
            } else {
                if (config.reloadedTabs.has(tabId)) {
                    config.reloadedTabs.delete(tabId);
                    console.log(`Tab ${tabId} navigated away from ${site}, reset reload status.`);
                }
            }
        });
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "postListings") {
        handlePosting(request.sites);
    }
});

function handlePosting(sites) {
    sites.forEach(site => {
        openAndPost(site);
    });
}

function openAndPost(site) {
    const siteUrls = siteMappings[site];
    if (!siteUrls) {
        console.error(`No URL found for site: ${site}`);
        return;
    }

    chrome.tabs.create({ url: siteUrls }, function(tab) {
        console.log(`Opened ${site} in a new tab with ID: ${tab.id}`);
    });
}
