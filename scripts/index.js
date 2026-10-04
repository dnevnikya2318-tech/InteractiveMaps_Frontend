const mainTitle = document.getElementById('main-title');
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const viewArea = document.getElementById('view-area');
const fullPreview = document.getElementById('full-preview');
const resetBtn = document.getElementById('reset-btn');
const imageWrapper = document.getElementById('image-wrapper');
const markersLayer = document.getElementById('markers-layer');
const popup = document.getElementById('label-popup');
const addLabelBtn = document.getElementById('add-label-btn');
const deletePopup = document.getElementById('delete-popup');
const deleteLabelBtn = document.getElementById('delete-label-btn');

// Label input counter logic
const titleInput = document.getElementById('title-input');
const titleInputCount = document.getElementById('title-input-count');
const titleInputMaxChar = titleInput.maxLength;

const descriptionInput = document.getElementById('description-input');
const descriptionInputCount = document.getElementById('description-input-count');
const descriptionInputMaxChar = descriptionInput.maxLength;
const token = localStorage.getItem('authToken');

let currMapId = null;
let currMarkImage = null;

document.addEventListener('DOMContentLoaded', () => {
    const userInfoElement = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Authentification 
    if (!token)
    {
        window.location.href = 'login.html';
        return;
    }

    // Getting data from token
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        const idKey = Object.keys(payload).find(key => key.includes('nameid'));
        const userId = payload[idKey] || payload.sub || payload.id;

        const nameKey = Object.keys(payload).find(key => key.endsWith('/name'));
        const username = payload[nameKey] || payload.unique_name || payload.name || "User";

        userInfoElement.innerText = `You are: ${username}`;
    } catch (e) {
        console.error('Error occured while reading token:', e);
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
        return;
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    })

})

titleInput.addEventListener('input', () => {
    const remaining = titleInputMaxChar - titleInput.value.length;
    titleInputCount.textContent = remaining;
});

descriptionInput.addEventListener('input', () => {
    const remaining = descriptionInputMaxChar - descriptionInput.value.length;
    descriptionInputCount.textContent = remaining;
});

class Point {
    constructor(id, mapId, title, description, x, y, size, markType, imagePath, imageName) {
        this.Id = id;
        this.MapId = mapId;
        this.Title = title;
        this.Description = description;
        this.X = x;
        this.Y = y;
        this.Size = size;
        this.MarkType = markType;
        this.ImagePath = imagePath;
        this.ImageName = imageName;
    }
}

// TO DELETE
// Проверить, необходим ли вообще этот класс, потому что он, кажется нигде не используется
class Map {
    constructor(id, ownerId, title, isPublic, imagePath, imageName){
        this.Id = id;
        this.OwnerId = ownerId;
        this.Title = title;
        this.IsPublic = isPublic;
        this.ImagePath = imagePath;
        this.ImageName = imageName;
    }
}

let popupPoint = null;
let selectedMarkerId = null;

function hidePopups() {
    const labelPopups = document.querySelectorAll('.marker-label');
    popup.classList.remove('show');
    deletePopup.classList.remove('show');
    labelPopups.forEach(el => {
        el.style.display = 'none';
    });
    popupPoint = null;
    selectedMarkerId = null;
}

function positionPopup(popupElement, x, y) {
    const rect = imageWrapper.getBoundingClientRect();
    const popupWidth = popupElement.offsetWidth;
    const popupHeight = popupElement.offsetHeight;

    const maxLeft = rect.width - popupWidth - 6;
    const maxTop = rect.height - popupHeight - 6;

    const left = Math.min(Math.max(x + 6, 4), maxLeft);
    const top = Math.min(Math.max(y + 6, 4), maxTop);

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
}

// TO UPDATE
// функции передаётся объект класса Point(x, y, title, description)
// При вызове функция создаёт на карте маркеры и соответствующие им описания
// TODO:
// Изменить наполнение html элементов в соответствии с новыми полями класса Point
// Добавить секцию с изображением, которое загружается напрямую из S3
function createMarker(point) {
    // создание уникального идентификатора
    // Изменить, так как должно происходить на бэкенде при создании сущности.
    // считывание с нового поля Id в Point???
    const id = crypto.randomUUID();

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.dataset.id = id;
    marker.style.left = `${point.X}px`;
    marker.style.top = `${point.Y}px`;

    const label = document.createElement('div');
    const pointTitle = document.createElement('h1');
    const pointDescription = document.createElement('p');
    const hr = document.createElement('hr');
    pointTitle.className = 'point-title';
    pointDescription.className = 'point-description';
    pointTitle.textContent = `${point.Title}`;
    pointDescription.textContent = `${point.Description}`;
    label.appendChild(pointTitle);
    label.appendChild(hr);
    label.appendChild(pointDescription);

    
    label.className = 'marker-label';
    label.dataset.id = id;
    label.style.left = `${point.X}px`;
    label.style.top = `${point.Y + 10}px`;
    label.style.display = 'none';

    // TO UPDATE
    // Добавить кнопку UPDATE 
    const showDeleteHandler = (e) => {
        hidePopups();
        e.preventDefault();
        e.stopPropagation();
        selectedMarkerId = id;

        const rect = imageWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        deletePopup.classList.add('show');
        positionPopup(deletePopup, x, y);

        popup.classList.remove('show');
    };

    marker.addEventListener('contextmenu', showDeleteHandler);
    label.addEventListener('contextmenu', showDeleteHandler);
    // Показывает данные точки при нажатии на неё
    marker.addEventListener('click', (e) => {
        hidePopups();
        e.stopPropagation();
        const rect = imageWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        label.style.display = 'flex';

        positionPopup(label, x, y);
        
    });

    markersLayer.appendChild(marker);
    markersLayer.appendChild(label);
}

dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        uploadMap(fileInput.files[0])
    }
});

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drop-zone--over');
});

['dragleave', 'dragend'].forEach(type => {
    dropArea.addEventListener(type, () => {
        dropArea.classList.remove('drop-zone--over')
    });
});

dropArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropArea.classList.remove('drop-zone--over');

    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];

        uploadMap(file);
    }
});

// TO UPDATE
// Добавить вызов функции createMarker для всех полученных маркеров из json
function showMap(filePath) {
    fullPreview.src = filePath;

    mainTitle.style.display = 'none';
    dropArea.style.display = 'none';
    viewArea.style.display = 'block';

    const response = await fetch(`http://localhost:5064/landmarks/map/${currMapId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    response.forEach(element => {

}

async function showTitle() {
    const response = await fetch(`http://localhost:5064/maps/${currMapId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const mapTitleInput = document.getElementById('mapTitleInput');
    const mapTitleForm = document.getElementById('mapTitleForm');
    map = await response.json();
    console.log(map.title);

    mapTitleInput.style.visibility = 'visible';
    mapTitleInput.value = map.title;
    mapTitleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        mapTitleInput.blur();
        
        try {
            const oldResponse = await fetch(`http://localhost:5064/maps/${currMapId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            oldMap = await oldResponse.json();
            const newResponse = await fetch(`http://localhost:5064/maps/${currMapId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                 },
                body: JSON.stringify({ ownerId: oldMap.ownerId, title: mapTitleInput.value, isPublic: oldMap.isPublic, imagePath: oldMap.imagePath, imageName: oldMap.imageName })
            })
        } catch (error) {
            console.error("Error occured while updating maps title: ", error);
            return;
        }})
    
}
function hideTitle() {
    mapTitleInput.style.visibility = 'hidden';
    mapTitleInput.value = '';
}
function resetMap() {
    fileInput.value = ''; // Очищаем выбранный файл в инпуте
    fullPreview.src = ''; // Очищаем превью
    markersLayer.innerHTML = '';
    currMapId = null;
    hidePopups();
    hideTitle();
    
    // Переключаем видимость обратно
    viewArea.style.display = 'none';
    mainTitle.style.display = 'block';
    dropArea.style.display = 'flex';
}
// Возврат к загрузке при клике на "Отмена"
resetBtn.addEventListener('click', () => resetMap());

fullPreview.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    hidePopups();

    const rect = imageWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    popupPoint = { x, y };

    popup.classList.add('show');

    positionPopup(popup, x, y);
});

// При нажатии левой кнопкой мыши на свободное место карты убирается всплывающее окно
fullPreview.addEventListener('click', (e) => {
    hidePopups();
});

addLabelBtn.addEventListener('click', async () => {
    if (!popupPoint) return;

    const markImageName = null;
    const markImagePath = null;
    if (currMarkImage != null)
    {
        const imageUploadResponse = await s3Response(currMarkImage);
        markImageName = imageUploadResponse.imageName;
        markImagePath = imageUploadResponse.imageUrl;
    }

    try {
        const response = await fetch('http://localhost:5064/landmarks', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                mapId: currMapId, 
                title: titleInput.value, 
                description: descriptionInput.value, 
                x: Math.round(popupPoint.x),
                y: Math.round(popupPoint.y),
                size: parseInt(sizeResult.textContent, 10),
                markType: sizePreview.textContent,
                imagePath: markImagePath, 
                imageName: markImageName })
        });
        if (!response.ok) {
            throw new Error('Unexpected error.');
        }
        markId = await response.json();

        const point = new Point(
            markId,
            currMapId, 
            titleInput.value, 
            descriptionInput.value, 
            Math.round(popupPoint.x), 
            Math.round(popupPoint.y), 
            parseInt(sizeResult.textContent, 10), 
            sizePreview.textContent,
            markImagePath,
            markImageName
        );

        createMarker(point);

        titleInput.value = '';
        descriptionInput.value = '';

        hidePopups();
    } catch (error) {
        console.error(error);
    }


    
    
});

// TO UPDATE
// Добавить DELETE запрос в базу данных
deleteLabelBtn.addEventListener('click', () => {
    if (!selectedMarkerId) return;

    document.querySelectorAll(`[data-id="${selectedMarkerId}"]`).forEach(el => el.remove());

    hidePopups();
});



const getUserId = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        const idKey = Object.keys(payload).find(key => key.includes('nameid'));
        const userId = payload[idKey] || payload.sub || payload.id;
        return userId;
    } catch (e) {
        console.error('Error occured while reading token:', e);
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
        return;
    }
}

const s3Response = async (fileObject) => {
    const formData = new FormData();

    formData.append('file', fileObject);

    try {
        const response = await fetch('http://localhost:5064/api/images/upload', {
            method: 'POST',
            headers: {
                    'Authorization': `Bearer ${token}`
                },
            body: formData
        });

        if (!response.ok){
            const errorText = await response.text();
            throw new Error('Unexpected error: ', errorText);
        }

        const data = await response.json();

        return data;
    } catch (error){
        console.error('Error occured during upload.');
    }
}

//sidebar logic
const menuBtn = document.getElementById('main-emblem');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');


function toggleMenu() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeMenu() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
    loadMapsList(getUserId(token));
});

async function loadMapsList(userId) {
    const sidebarContent = document.getElementById('sidebar-content');

    try {
        const response = await fetch(`http://localhost:5064/maps/user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Connection error: ${response.status}`);
        }

        const data = await response.json();

        sidebarContent.innerHTML = '';

        data.forEach(element => {
            // Add Title item
            const div = document.createElement('div');
            div.textContent = element.title;
            div.Id = element.id;
            div.addEventListener('click', () => {
                showMap(element.imagePath);
                currMapId = div.Id;
                showTitle();
            });
            sidebarContent.append(div);
            // Add Delete Button item
            const delButton = document.createElement('button');
            delButton.textContent = '🗑';
            delButton.addEventListener('click', () => deleteMap(element.id, element.imageName));
            sidebarContent.append(delButton);
        });

    } catch (error) {
        console.error("Failed to load maps: ", error);
    }
    
}

async function uploadMap(file) {
    if (file.type.startsWith('image/')) {
        const ownerId = getUserId(token);

        const s3Data = await s3Response(file);
        
        try {
            const response = await fetch('http://localhost:5064/maps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: ownerId, title: "My Map", isPublic: false, imagePath: s3Data.imageUrl, imageName: s3Data.imageName })
            });
            if (!response.ok) {
                throw new Error('Unexpected error.');
            }
            currMapId = await response.json();
        } catch (error) {
            console.error(error);
        }
        showMap(s3Data.imageUrl);
        showTitle();
    }
}

overlay.addEventListener('click', closeMenu);


// Map delete popup logic
async function deleteMap(id, imageName) {
    const popupOverlay = document.getElementById('deletePopupOverlay');
    const cancelBtn = document.getElementById('deleteMapCancelBtn');
    const confirmInput = document.getElementById('confirmInput');
    const confirmBtn = document.getElementById('deleteMapConfirmBtn');
    const deleteForm = document.getElementById('deletePopupForm');

    closeMenu();

    popupOverlay.classList.add('active');
    confirmInput.focus();

    function closePopup() {
        popupOverlay.classList.remove('active');
        deleteForm.reset();
        confirmBtn.disabled = true;
    }

    cancelBtn.addEventListener('click', closePopup);

    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });

    confirmInput.addEventListener('input', (e) => {
        if (e.target.value.trim() === 'delete') {
            confirmBtn.disabled = false;
        } else {
            confirmBtn.disabled = true;
        }
    });

    deleteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (confirmInput.value.trim() === 'delete') {
            confirmBtn.disabled = true;
            await fetch(`http://localhost:5064/maps/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                } 
            });
            resetMap();
            closePopup();
        }
    })

}

// Mark change logic
const sizeIncrement = document.getElementById("sizeIncrement");
const sizeDecrement = document.getElementById("sizeDecrement");
const sizeResult = document.getElementById("sizeResult");
const sizePreview = document.getElementById("sizePreview");

sizeIncrement.addEventListener('click', () => {
    let currentFontSize = parseInt(sizeResult.textContent, 10);
    
    if(currentFontSize < 25) {
        currentFontSize++;

        sizeResult.textContent = currentFontSize;

        sizePreview.style.width = currentFontSize + 9 + 'px';
        sizePreview.style.height = currentFontSize + 9 + 'px';
        sizePreview.style.fontSize = currentFontSize + 'px';

    }
})

sizeDecrement.addEventListener('click', () => {
    let currentFontSize = parseInt(sizeResult.textContent, 10);
    
    if(currentFontSize > 10) {
        currentFontSize--;

        sizeResult.textContent = currentFontSize;

        sizePreview.style.width = currentFontSize + 9 + 'px';
        sizePreview.style.height = currentFontSize + 9 + 'px';
        sizePreview.style.fontSize = currentFontSize + 'px';

    }
})

// Mark image upload logic
const uploadMarkImageBox = document.getElementById('uploadMarkImageBox');
const markImageInput = document.getElementById('markImageInput');
const previewMarkImage = document.getElementById('previewMarkImage');
const uploadPlusIcon = document.getElementById('uploadPlusIcon');
const removeMarkImageBtn = document.getElementById('removeMarkImageBtn');

// Box click opens file explorer
uploadMarkImageBox.addEventListener('click', () => {
    if (markImageInput.files.length === 0) {
        markImageInput.click();
    }
});

// 2. 
markImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];

    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewMarkImage.src = e.target.result;
            previewMarkImage.style.display = 'block';
            uploadPlusIcon.style.display = 'none';
            removeMarkImageBtn.style.display = 'flex';
            uploadMarkImageBox.style.borderStyle = 'solid';
        }

        reader.readAsDataURL(file);
    }
});

// 3. Image removal logic
removeMarkImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    markImageInput.value = '';
    previewMarkImage.src = '';
    previewMarkImage.style.display = 'none';
    uploadPlusIcon.style.display = 'block';
    removeMarkImageBtn.style.display = 'none';
    uploadMarkImageBox.style.borderStyle = 'dashed';
});

function removeMarkImage () {
    markImageInput.value = '';
    previewMarkImage.src = '';
    previewMarkImage.style.display = 'none';
    uploadPlusIcon.style.display = 'block';
    removeMarkImageBtn.style.display = 'none';
    uploadMarkImageBox.style.borderStyle = 'dashed';
}