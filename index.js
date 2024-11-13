const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const drawMode = document.getElementById('drawMode');

let startX, startY, isDrawing = false;
let shapes = [];
let pattern = null;

// Установка цвета из выбора
colorPicker.addEventListener('input', () => {
    ctx.strokeStyle = colorPicker.value;
    ctx.fillStyle = colorPicker.value;
    pattern = null; // Сбрасываем узор при смене цвета
});

// Функции для рисования

function drawLine(x0, y0, x1, y1, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

function drawCircle(x0, y0, x1, y1, color) {
    const radius = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x0, y0, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawBezier(x0, y0, x1, y1, color) {
    const controlX = (x0 + x1) / 2;
    const controlY = y0 - Math.abs(x1 - x0) / 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(controlX, controlY, x1, y1);
    ctx.stroke();
}

// Перерисовка всех фигур
function redrawShapes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const shape of shapes) {
        const { type, startX, startY, endX, endY, color } = shape;
        switch (type) {
            case 'line':
                drawLine(startX, startY, endX, endY, color);
                break;
            case 'circle':
                drawCircle(startX, startY, endX, endY, color);
                break;
            case 'bezier':
                drawBezier(startX, startY, endX, endY, color);
                break;
        }
    }
}

// Сохранение фигуры
function saveShape(type, startX, startY, endX, endY, color) {
    shapes.push({ type, startX, startY, endX, endY, color });
}

// Стирание фигуры
function eraseShape(x, y) {
    shapes = shapes.filter(shape => {
        const { startX, startY, endX, endY } = shape;
        const withinX = Math.min(startX, endX) <= x && x <= Math.max(startX, endX);
        const withinY = Math.min(startY, endY) <= y && y <= Math.max(startY, endY);
        return !(withinX && withinY);
    });
    redrawShapes();
}

// Вспомогательные функции для алгоритма "затравки"

// Получаем текущий цвет пикселя
function getPixelColor(x, y) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
}

// Устанавливаем цвет или узор пикселя
function setPixelColor(x, y, colorOrPattern) {
    if (colorOrPattern instanceof CanvasPattern) {
        ctx.fillStyle = colorOrPattern;
    } else {
        ctx.fillStyle = colorOrPattern;
    }
    ctx.fillRect(x, y, 1, 1);
}

// Рекурсивная функция для алгоритма затравки
function floodFill(x, y, targetColor, fillColor) {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const currentColor = getPixelColor(x, y);
    if (currentColor !== targetColor || currentColor === fillColor) return;
    setPixelColor(x, y, fillColor);
    floodFill(x + 1, y, targetColor, fillColor);
    floodFill(x - 1, y, targetColor, fillColor);
    floodFill(x, y + 1, targetColor, fillColor);
    floodFill(x, y - 1, targetColor, fillColor);
}

// Вызов floodFill с использованием выбранного цвета или узора
function fillArea(x, y, usePattern = false) {
    const targetColor = getPixelColor(x, y);
    let fillColor = ctx.fillStyle;

    if (usePattern) {
        // Генерация шаблона из небольшого квадрата
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        const patternCtx = patternCanvas.getContext('2d');
        patternCtx.fillStyle = colorPicker.value;
        patternCtx.fillRect(0, 0, 5, 5);
        patternCtx.fillRect(5, 5, 5, 5);
        pattern = ctx.createPattern(patternCanvas, 'repeat');
        fillColor = pattern;
    }

    if (targetColor !== fillColor) {
        floodFill(x, y, targetColor, fillColor);
    }
}

// Управление рисованием с помощью мыши
canvas.addEventListener('mousedown', (e) => {
    startX = e.offsetX;
    startY = e.offsetY;
    isDrawing = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || drawMode.value === 'fill' || drawMode.value === 'erase') return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;
    redrawShapes();

    switch (drawMode.value) {
        case 'line':
            drawLine(startX, startY, currentX, currentY, ctx.strokeStyle);
            break;
        case 'circle':
            drawCircle(startX, startY, currentX, currentY, ctx.strokeStyle);
            break;
        case 'bezier':
            drawBezier(startX, startY, currentX, currentY, ctx.strokeStyle);
            break;
    }
});

canvas.addEventListener('mouseup', (e) => {
    const currentX = e.offsetX;
    const currentY = e.offsetY;
    isDrawing = false;

    if (drawMode.value === 'fill') {
        fillArea(e.offsetX, e.offsetY, false); // Закраска цветом
    } else if (drawMode.value === 'patternFill') {
        fillArea(e.offsetX, e.offsetY, true); // Закраска узором
    } else if (drawMode.value === 'erase') {
        eraseShape(e.offsetX, e.offsetY);
    } else {
        saveShape(drawMode.value, startX, startY, currentX, currentY, ctx.strokeStyle);
    }
});
