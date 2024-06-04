let allFiles = [];
const siteMappings = {
    "eBay": "https://www.ebay.com/sl/prelist/suggest",
    "Facebook Marketplace": "https://www.facebook.com/marketplace/create/item",
    "Mercari": "https://www.mercari.com/sell/",
    "Grailed": "https://www.grailed.com/sell/new",
    "Depop": "https://www.depop.com/products/create/",
    "Craigslist": "https://post.craigslist.org/",
    "StockX": "https://stockx.com/sell",
    "Poshmark": "https://poshmark.com/sell"
};

document.addEventListener('DOMContentLoaded', function() {
    let selectedSites = [];
    const sitesContainer = document.getElementById('sites-container');
    const postButton = document.getElementById('post-button');

    Object.keys(siteMappings).forEach(site => {
        const card = document.createElement('div');
        card.className = 'site-card';
        card.textContent = site;
        card.dataset.site = site;

        card.onclick = function() {
            card.classList.toggle('selected');
            const index = selectedSites.indexOf(site);
            if (index > -1) {
                selectedSites.splice(index, 1);
            } else {
                selectedSites.push(site);
            }
        };

        sitesContainer.appendChild(card);
    });

    postButton.onclick = function() {
        if (selectedSites.length > 0) {
            console.log("Selected sites to post:", selectedSites);
            chrome.runtime.sendMessage({ action: "postListings", sites: selectedSites });
        } else {
            console.log("No sites selected");
        }
    };

    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            const files = imageInput.files;
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const dataUrl = e.target.result;
                    allFiles.push(dataUrl);
                    appendThumbnail(dataUrl);
                    saveImages();
                };
                reader.readAsDataURL(file);
            });
        });
    } else {
        console.error('imageInput element not found');
    }

    loadFormData();
    loadImages();

    const thumbnailContainer = document.getElementById('thumbnailContainer');
    thumbnailContainer.addEventListener('click', function() {
        imageInput.click();
    });

    document.querySelectorAll('#title, #price, #quantity, #mpn, #description').forEach(input => {
        input.addEventListener('input', saveFormData);
    });
    
    function getCurrentState() {
        return {
            title: document.getElementById('title').value,
            price: document.getElementById('price').value,
            quantity: document.getElementById('quantity').value,
            mpn: document.getElementById('mpn').value,
            description: document.getElementById('description').value
        };
    }

    function saveFormData() {
        const dataToSave = getCurrentState();
        chrome.storage.local.set({'formData': dataToSave}, function() {
            console.log('Data saved');
        });
    }

    function loadFormData() {
        chrome.storage.local.get('formData', function(data) {
            if (data.formData) {
                document.getElementById('title').value = data.formData.title;
                document.getElementById('price').value = data.formData.price;
                document.getElementById('quantity').value = data.formData.quantity;
                document.getElementById('mpn').value = data.formData.mpn;
                document.getElementById('description').value = data.formData.description;
            }
        });
    }
});

function appendThumbnail(dataUrl) {
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const wrapper = document.createElement('div');
    wrapper.classList.add('thumbnail-wrapper');

    const imgElement = document.createElement('img');
    imgElement.classList.add('thumbnail');
    imgElement.src = dataUrl;
    wrapper.appendChild(imgElement);

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-button');
    removeButton.textContent = 'X';
    removeButton.onclick = function(event) {
        event.stopPropagation();
        thumbnailContainer.removeChild(wrapper);
        const index = allFiles.indexOf(dataUrl);
        if (index > -1) {
            allFiles.splice(index, 1);
            saveImages();
        }
    };
    wrapper.appendChild(removeButton);
    thumbnailContainer.appendChild(wrapper);
}

function saveImages() {
    chrome.storage.local.set({storedImages: allFiles}, function() {
        console.log('Images have been saved.');
    });
}

function loadImages() {
    chrome.storage.local.get('storedImages', function(data) {
        if (data.storedImages) {
            data.storedImages.forEach(dataUrl => {
                appendThumbnail(dataUrl);
            });
            allFiles = data.storedImages.slice();
        } else {
            console.log('No stored images to load.');
        }
    });
}
