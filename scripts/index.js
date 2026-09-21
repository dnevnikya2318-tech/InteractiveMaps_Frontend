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
//globalToken




titleInput.addEventListener('input', () => {
    const remaining = titleInputMaxChar - titleInput.value.length;
    titleInputCount.textContent = remaining;
});

descriptionInput.addEventListener('input', () => {
    const remaining = descriptionInputMaxChar - descriptionInput.value.length;
    descriptionInputCount.textContent = remaining;
});




class Point {
    constructor(x, y, title, description) {
        this.X = x;
        this.Y = y;
        this.Title = title;
        this.Description = description;
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

function createMarker(point) {
    // const id = `point-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    // Показывает координаты точки при нажатии на неё
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
        showImage(fileInput.files[0]);
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
            } catch (error) {
                console.error(error);
            }

            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            showImage(file);
        }
    }
});

function showImage(file) {
    const reader = new FileReader();
    
    reader.onload = () => {
        // 1. Записываем base64-строку в src картинки
        fullPreview.src = reader.result;

        // 2. Скрываем зону загрузки и показываем зону просмотра
        mainTitle.style.display = 'none';
        dropArea.style.display = 'none';
        viewArea.style.display = 'block';
    };

    reader.readAsDataURL(file);
}

// Возврат к загрузке при клике на "Отмена"
resetBtn.addEventListener('click', () => {
    fileInput.value = ''; // Очищаем выбранный файл в инпуте
    fullPreview.src = ''; // Очищаем превью
    markersLayer.innerHTML = '';
    hidePopups();

    // Переключаем видимость обратно
    viewArea.style.display = 'none';
    mainTitle.style.display = 'block';
    dropArea.style.display = 'flex';
});

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

addLabelBtn.addEventListener('click', () => {
    if (!popupPoint) return;

    const point = new Point(Math.round(popupPoint.x), Math.round(popupPoint.y), titleInput.value, descriptionInput.value);

    createMarker(point);

    titleInput.value = '';
    descriptionInput.value = '';

    hidePopups();
});

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