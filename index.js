// Основные настройки
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const drawMode = document.getElementById('drawMode');

let startX, startY, isDrawing = false;
let shapes = [];

// Установка цвета из выбора
colorPicker.addEventListener('input', () => {
    ctx.strokeStyle = colorPicker.value;
    ctx.fillStyle = colorPicker.value;
});

// Функция для рисования пикселя
function drawPixel(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
}

// Алгоритм Брезенхэма для линий
function drawLine(x0, y0, x1, y1, color) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        drawPixel(x0, y0, color);

        if (x0 === x1 && y0 === y1) break;

        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

// Алгоритм Брезенхэма для окружностей
function drawCircle(x0, y0, radius, color) {
    let x = 0;
    let y = radius;
    let d = 3 - 2 * radius;

    function drawCirclePixels(cx, cy, x, y, color) {
        drawPixel(cx + x, cy + y, color);
        drawPixel(cx + x, cy - y, color);
        drawPixel(cx - x, cy + y, color);
        drawPixel(cx - x, cy - y, color);
        drawPixel(cx + y, cy + x, color);
        drawPixel(cx + y, cy - x, color);
        drawPixel(cx - y, cy + x, color);
        drawPixel(cx - y, cy - x, color);
    }

    while (y >= x) {
        drawCirclePixels(x0, y0, x, y, color);
        x++;

        if (d > 0) {
            y--;
            d = d + 4 * (x - y) + 10;
        } else {
            d = d + 4 * x + 6;
        }
    }
}

// Функция для рисования квадратичной кривой Безье
function drawQuadraticBezier(P0, P1, P2, color) {
    const steps = 1000;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.pow(1 - t, 2) * P0.x + 2 * (1 - t) * t * P1.x + Math.pow(t, 2) * P2.x;
        const y = Math.pow(1 - t, 2) * P0.y + 2 * (1 - t) * t * P1.y;

        drawPixel(Math.round(x), Math.round(y), color);
    }
}

// Модифицированный алгоритм закраски с «затравкой»
function seedFill(x, y, color) {
    const targetColor = ctx.getImageData(x, y, 1, 1).data;
    const stack = [[x, y]];

    while (stack.length > 0) {
        const [px, py] = stack.pop();
        const pixelColor = ctx.getImageData(px, py, 1, 1).data;

        // Проверка, является ли текущий цвет таким же, как и цвет начальной точки
        if (pixelColor[0] === targetColor[0] && pixelColor[1] === targetColor[1] &&
            pixelColor[2] === targetColor[2] && pixelColor[3] === targetColor[3]) {

            drawPixel(px, py, color);

            // Добавляем соседние пиксели в стек для проверки
            stack.push([px + 1, py]); // справа
            stack.push([px - 1, py]); // слева
            stack.push([px, py + 1]); // снизу
            stack.push([px, py - 1]); // сверху
        }
    }
}



// Сохранение фигуры
function saveShape(type, startX, startY, endX, endY, color) {
    shapes.push({ type, startX, startY, endX, endY, color });
}

// Управление рисованием с помощью мыши
canvas.addEventListener('mousedown', (e) => {
    startX = e.offsetX;
    startY = e.offsetY;
    isDrawing = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (drawMode.value) {
        case 'line':
            drawLine(startX, startY, currentX, currentY, ctx.strokeStyle);
            break;
        case 'circle':
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
            drawCircle(startX, startY, radius, ctx.strokeStyle);
            break;
        case 'bezier':
            drawQuadraticBezier({ x: startX, y: startY }, { x: (startX + currentX) / 2, y: (startY + currentY) / 2 }, { x: currentX, y: currentY }, ctx.strokeStyle);
            break;
    }
});

canvas.addEventListener('mouseup', (e) => {
    const currentX = e.offsetX;
    const currentY = e.offsetY;
    isDrawing = false;

    if (drawMode.value === 'fill') {
        seedFill(currentX, currentY, ctx.fillStyle); // Закраска затравочным алгоритмом
    } else {
        saveShape(drawMode.value, startX, startY, currentX, currentY, ctx.strokeStyle);
    }
});