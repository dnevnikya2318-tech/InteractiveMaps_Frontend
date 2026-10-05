const mainTitle = document.getElementById('mainTitle');
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const viewArea = document.getElementById('viewArea');
const fullPreview = document.getElementById('fullPreview');
const resetBtn = document.getElementById('resetBtn');
const imageWrapper = document.getElementById('imageWrapper');
const markersLayer = document.getElementById('markersLayer');
const popup = document.getElementById('labelPopup');

const token = localStorage.getItem('authToken');
const putLabelBtn = document.getElementById('putLabelBtn');
const updateLabelBtn = document.getElementById('updateLabelBtn');

let currMapId = null;
let currMarkImage = null;

let currPoint = null;

let popupPoint = null;
let selectedMarkerId = null;

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

//TOUPDATE
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('map');

    if (!fileId) {
        console.error('No file ID in URL!');
        window.location.href = 'login.html';
        return;
    }

    const backendUrl = `http://localhost:5064/maps/public/${fileId}`
    fetch(backendUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        renderPublicData(data);
    })
    .catch(error => {
        console.error('Error occured during loading:', error);
    });
})

function renderPublicData(data) {
    
}





//TOUPDATE
function hidePopups() {
    const labelPopups = document.querySelectorAll('.marker-label');
    popup.classList.remove('show');
    deletePopup.classList.remove('show');
    labelPopups.forEach(el => {
        el.style.display = 'none';
    });
    popupPoint = null;
    selectedMarkerId = null;
    currPoint = null;
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

//TOUPDATE
// При вызове функция создаёт на карте маркеры и соответствующие им описания
function createMarker(point) {
    const id = point.Id;

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.dataset.id = id;
    marker.style.left = `${point.X}px`;
    marker.style.top = `${point.Y}px`;
    marker.textContent = point.MarkType;
    marker.style.color = markerColorSelection(point.MarkType);
    marker.style.width = `${9 + point.Size}px`;
    marker.style.height = `${9 + point.Size}px`;
    marker.style.fontSize = `${point.Size}px`;

    if (point.MarkType == "⌖"){
        marker.style.fontWeight = 500;
    }

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
    if (point.ImagePath != null)
    {
        const labelImg = document.createElement('img');
        labelImg.src = point.ImagePath;
        label.appendChild(labelImg);
    }

    
    label.className = 'marker-label';
    label.dataset.id = id;
    label.style.left = `${point.X}px`;
    label.style.top = `${point.Y + 10}px`;
    label.style.display = 'none';

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

//TOUPDATE
async function showMap(filePath) {
    fullPreview.src = filePath;

    mainTitle.style.display = 'none';
    dropArea.style.display = 'none';
    viewArea.style.display = 'block';
    markersLayer.innerHTML = '';

    try {
        const response = await fetch(`http://localhost:5064/landmarks/map/${currMapId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        data.forEach(element => {
            const point = new Point(
                element.id,
                element.mapId,
                element.title,
                element.description,
                element.x,
                element.y,
                element.size,
                element.markType,
                element.imagePath,
                element.imageName
            );
            createMarker(point);
    })} catch(error) {
        console.log(error);
    }
}

//TOUPDATE
async function showTitle() {
    const response = await fetch(`http://localhost:5064/maps/${currMapId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const mapTitleInput = document.getElementById('mapTitleInput');
    const mapTitleForm = document.getElementById('mapTitleForm');
    map = await response.json();

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

// При нажатии левой кнопкой мыши на свободное место карты убирается всплывающее окно
fullPreview.addEventListener('click', (e) => {
    hidePopups();
});

const markerColorSelection = (markType) => {
    let rgb = null;
    switch (markType) {
        case "☠":
            rgb = "rgb(139, 26, 26)";
            break;
        case "⚗":
            rgb = "rgb(201, 148, 26)";
            break;
        case "⌂":
            rgb = "rgb(196, 169, 106)";
            break;
        case "★":
            rgb = "rgb(232, 213, 163)";
            break;
        case "⚔":
            rgb = "rgb(204, 51, 51)";
            break;
        case "📜":
            rgb = "rgb(255, 255, 255)";
            break;
        case "◆":
            rgb = "rgb(122, 106, 74)";
            break;
        case "⌖":
            rgb = "rgb(106, 158, 181)";
            break;
        case "▲":
            rgb = "rgb(74, 103, 65)";
            break;
        case "⊕":
            rgb = "rgb(122, 74, 154)";
            break;
        default:
            rgb = "rgb(255, 255, 255)"
            break;
    }
    return rgb;
}





