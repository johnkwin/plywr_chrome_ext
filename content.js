let filledSelectors = {};
let imagesUploaded = false; // Flag to prevent duplicate image uploads

const siteMappings = {
    "ebay.com": {
        supportsCents: true,
        "/sl/prelist/suggest": {
            "input_placeholder": [
                { key: "mpn", selector: 'input[placeholder="Tell us what you\'re selling"]', priority: 1 },
                { key: "title", selector: 'input[placeholder="Tell us what you\'re selling"]', priority: 2 }
            ]
        },
        "/lstng": {
            "input_placeholder": [
                { key: "title", selector: "input[name='title']", priority: 1 }
            ]
        },
        "default": {
            "mpn": [{ key: "mpn", selector: "input[name='universalProductCode']", priority: 2 }],
            "title": [{ key: "title", selector: "input[name='title']", priority: 1 }],
            "quantity": [{ key: "quantity", selector: "input[name='quantity']", priority: 1 }],
            "price": [{ key: "price", selector: "input[name='price']", priority: 1 }],
            "description": [{ key: "description", selector: "div[aria-label='Description']", priority: 1 }],
            "description2": [{ key: "description", selector: "textarea[aria-label='Description']", priority: 1 }]
        }
    },
    "facebook.com": {
        supportsCents: true,
        "default": {
            "title": [{ key: "title", selector: "label[aria-label='Title'] input", priority: 1 }],
            "price": [{ key: "price", selector: "label[aria-label='Price'] input", priority: 1 }],
            "description": [{ key: "description", selector: "label[aria-label='Description'] textarea", priority: 1 }],
            "images": [{ key: "images", selector: "input[type='file']", priority: 1 }]
        }
    },
    "mercari.com": {
        supportsCents: true,
        "default": {
            "title": [{ key: "title", selector: 'input[placeholder="What are you selling?"]', priority: 1 }],
            "price": [{ key: "price", selector: "input[name='sellPrice']", priority: 1 }],
            "description": [{ key: "description", selector: "textarea[id='sellDescription']", priority: 1 }],
            "images": [{ key: "images", selector: 'input[data-testid="SellPhotoInput"]', priority: 1 }]
        }
    },
    "grailed.com": {
        supportsCents: false,
        "/sell/new": {
            "title": [{ key: "title", selector: 'input[name="title"]', priority: 1 }],
            "price": [{ key: "price", selector: 'input[name="price"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[name="description"]', priority: 1 }]
        },
        "default": {
            "title": [{ key: "title", selector: 'input[name="title"]', priority: 1 }],
            "price": [{ key: "price", selector: 'input[name="price"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[name="description"]', priority: 1 }]
        }
    },
    "depop.com": {
        supportsCents: true,
        "default": {
            "title": [{ key: "title", selector: 'input[name="title"]', priority: 1 }],
            "price": [{ key: "price", selector: 'input[type="number"][aria-label="Item price"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[id="description"]', priority: 1 }]
        }
    },
    "post.craigslist.org": {
        supportsCents: false,
        "default": {
            "title": [{ key: "title", selector: 'input[id="PostingTitle"]', priority: 1 }],
            "price": [{ key: "price", selector: 'input[name="price"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[name="PostingBody"]', priority: 1 }],
            "images": [{ key: "images", selector: 'input[type="file"]', priority: 1 }]
        }
    },
    "stockx.com": {
        supportsCents: true,
        "default": {
            "mpn": [{ key: "mpn", selector: 'input[type="search"]', priority: 1 }],
            "title": [{ key: "title", selector: 'input[id="PostingTitle"]', priority: 2 }],
            "price": [{ key: "price", selector: 'input[placeholder="Enter Ask"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[name="PostingBody"]', priority: 1 }]
        }
    },
    "poshmark.com": {
        supportsCents: false,
        "default": {
            "title": [{ key: "title", selector: 'input[placeholder="What are you selling? (required)"]', priority: 1 }],
            "price": [{ key: "price", selector: 'input[data-vv-name="originalPrice"]', priority: 1 }],
            "price2": [{ key: "price", selector: 'input[data-vv-name="originalPrice"]', priority: 1 }],
            "description": [{ key: "description", selector: 'textarea[placeholder="Describe it! (required)"]', priority: 1 }],
            "images": [{ key: "images", selector: 'input[name="img-file-input"]', priority: 1 }]
        }
    }
};

function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations, obs) => {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector));
            obs.disconnect();
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function formatPrice(value, supportsCents) {
    if (!supportsCents) {
        return Math.floor(Number(value));
    }
    return value;
}

function applyMappingsToElement(element, value, key, selector, siteConfig) {
    if (key === "price") {
        console.log(`Key equals price, updating value to: ${formatPrice(value, siteConfig.supportsCents)}`);
        value = formatPrice(value, siteConfig.supportsCents);
    }
    if (element && element.type !== 'file') {
        if (element.value !== value.toString()) {
            simulatePaste(element, value);
            console.log(`Value updated for ${selector} with value: ${value}.`);
        } else {
            console.log(`No update needed for ${selector}; value already set to ${value}.`);
        }
    } else {
        console.error(`Element not found or is a file input for selector: ${selector}`);
    }
}

function waitForInputAndHandleImages(imageFiles, hostname) {
    console.log("Setting up MutationObserver and polling");

    const checkInputExistence = () => {
        const input = document.querySelector('input[type="file"]');
        if (input && !imagesUploaded) {
            const currentUrl = window.location.href;
            if (hostname === "grailed.com" && currentUrl.includes("/sell/for-sale") && input.id === "editAvatar") {
                console.log("Omitting image upload for Grailed for-sale page.");
                return true;
            }
            console.log("Input found, attempting to upload images.");
            handleImageUpload(imageFiles, hostname, input);
            imagesUploaded = true; // Set the flag to true after uploading images
            return true;
        }
        return false;
    };

    const observer = new MutationObserver((mutations, observer) => {
        console.log("Mutation observed");
        if (checkInputExistence()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const pollingInterval = setInterval(() => {
        if (checkInputExistence()) {
            clearInterval(pollingInterval);
            observer.disconnect();
        }
    }, 1000);

    console.log("Observer and polling have been set up.");
}

function handleImageUpload(imageFiles, hostname, input) {
    console.log("handleImageUploads called with hostname:", hostname);
    if (!imageFiles.length) {
        console.log("No images to upload.");
        return;
    }

    if (input.files.length > 0) {
        console.log("Images have already been uploaded, skipping re-upload.");
        imagesUploaded = true; // Ensure flag is set if images already exist
        return;
    }

    const dataTransfer = new DataTransfer();

    const filePromises = imageFiles.map(dataUrl =>
        fetch(dataUrl)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], 'upload.jpg', { type: 'image/jpeg' });
                dataTransfer.items.add(file);
            })
            .catch(err => console.error('Failed to fetch image blob:', err))
    );

    Promise.all(filePromises).then(() => {
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("Images uploaded successfully.");
    });
}

function simulatePaste(element, value) {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function handleIframeContent(iframe, effectiveMappings, formData) {
    if (!iframe.contentWindow || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    Object.keys(effectiveMappings).forEach(fieldKey => {
        const fieldMappings = effectiveMappings[fieldKey];
        fieldMappings.forEach(mapping => {
            const value = formData[mapping.key];
            if (value) {
                applyUpdatesInIframe(iframeDoc, mapping.selector, value);
            }
        });
    });

    const retryDuration = 7000;
    const retryInterval = setInterval(() => {
        Object.keys(effectiveMappings).forEach(fieldKey => {
            const fieldMappings = effectiveMappings[fieldKey];
            fieldMappings.forEach(mapping => {
                const value = formData[mapping.key];
                if (value) {
                    retryUpdateIfNecessary(iframeDoc, mapping.selector, value);
                }
            });
        });
    }, 2000);

    setTimeout(() => clearInterval(retryInterval), retryDuration);
}

function retryUpdateIfNecessary(iframeDoc, selector, intendedValue) {
    const elements = iframeDoc.querySelectorAll(normalizeSelector(selector));
    elements.forEach(element => {
        const currentValue = element.isContentEditable ? element.innerText : element.value;
        if (currentValue !== intendedValue) {
            updateElement(element, intendedValue);
            console.log(`Content mismatch detected and corrected for selector: ${selector}`);
        } else {
            console.log(`Content already matches the intended value for selector: ${selector}, no update needed.`);
        }
    });
}

function applyUpdatesInIframe(iframeDoc, selector, value, logRetry = false) {
    const elements = iframeDoc.querySelectorAll(normalizeSelector(selector));
    elements.forEach(element => {
        updateElement(element, value);
        if (logRetry) {
            console.log(`Retrying update for selector ${selector} with value: ${value}`);
        }
    });
}

function updateElement(element, value) {
    if (element.isContentEditable) {
        element.innerText = value;
    } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
    }
}

function normalizeSelector(selector) {
    return selector.replace(/(\[.+?=)['"]?(.*?)['"]?\]/g, (match, p1, p2) => {
        let normalizedValue = p2.replace(/"/g, '\\"');
        return `${p1}"${normalizedValue}"` + ']';
    });
}

function checkAndClickPoshmarkModalButton() {
    const modalButton = document.querySelector('div[data-test="modal-footer"] button.btn.btn--primary');
    if (modalButton) {
        modalButton.click();
        console.log("Clicked the Poshmark modal button.");
    }
}

chrome.storage.local.get(['formData', 'storedImages'], function(data) {
    if (data.formData) {
        const url = new URL(window.location.href);
        const hostname = url.hostname.replace('www.', '');
        const pathname = url.pathname;
        const domainMappings = siteMappings[hostname] || {};
        let effectiveMappings = { ...domainMappings.default };

        if (hostname === "poshmark.com" && pathname.includes("/create-listing")) {
            setTimeout(checkAndClickPoshmarkModalButton, 1000);
        }

        if (data.storedImages && data.storedImages.length > 0) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function() {
                    waitForInputAndHandleImages(data.storedImages, hostname);
                });
            } else {
                waitForInputAndHandleImages(data.storedImages, hostname);
            }
        }

        Object.keys(domainMappings).forEach(path => {
            if (pathname.includes(path) && path !== 'default') {
                Object.keys(domainMappings[path]).forEach(key => {
                    effectiveMappings[key] = [...(effectiveMappings[key] || []), ...domainMappings[path][key]];
                });
            }
        });

        Object.keys(effectiveMappings).forEach(fieldKey => {
            const fieldMappings = effectiveMappings[fieldKey];
            if (Array.isArray(fieldMappings)) {
                fieldMappings.forEach(mapping => {
                    const value = data.formData[mapping.key];
                    if (value !== undefined) {
                        waitForElement(mapping.selector, (element) => {
                            const siteConfig = siteMappings[hostname] || { supportsCents: true };
                            if (!filledSelectors[mapping.selector] || filledSelectors[mapping.selector] < mapping.priority) {
                                applyMappingsToElement(element, value, mapping.key, mapping.selector, siteConfig);
                                filledSelectors[mapping.selector] = mapping.priority;
                            }
                        });
                    }
                });
            }
        });

        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentWindow && iframe.contentDocument) {
                    handleIframeContent(iframe, effectiveMappings, data.formData);
                }
            } catch (error) {
                console.error('Error processing iframe:', error);
            }
        });
    }
});
