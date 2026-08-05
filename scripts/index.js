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



class Point {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
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
    const id = `point-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.dataset.id = id;
    marker.style.left = `${point.X}px`;
    marker.style.top = `${point.Y}px`;

    const label = document.createElement('div');
    label.className = 'marker-label';
    label.dataset.id = id;
    label.textContent = `(${point.X}, ${point.Y})Чтобы изменить атрибут для каждого элемента определенного класса, найдите их с помощью querySelectorAll и используйте метод setAttribute в цикле.`;
    label.style.left = `${point.X}px`;
    label.style.top = `${point.Y + 10}px`;
    label.style.display = 'none';

    const showDeleteHandler = (e) => {
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

        label.style.display = 'block';

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

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drop-zone--over');

    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];

        if (file.type.startsWith('image/')) {
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

    const point = new Point(Math.round(popupPoint.x), Math.round(popupPoint.y));

    createMarker(point);

    hidePopups();
});

deleteLabelBtn.addEventListener('click', () => {
    if (!selectedMarkerId) return;

    document.querySelectorAll(`[data-id="${selectedMarkerId}"]`).forEach(el => el.remove());

    hidePopups();
});