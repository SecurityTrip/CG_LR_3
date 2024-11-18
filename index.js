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

// Функция для сравнения цветов
function colorsMatch(colorA, colorB) {
    return colorA[0] === colorB[0] && colorA[1] === colorB[1] && colorA[2] === colorB[2] && colorA[3] === colorB[3];
}

// Модифицированный алгоритм закраски с «затравкой»
function seedFill(x, y, color) {
    const targetColor = ctx.getImageData(x, y, 1, 1).data;

    //if (!colorsMatch(targetColor, color)) return;

    const stack = [[x, y]];

    while (stack.length > 0) {
        const [sx, sy] = stack.pop();

        // Начинаем закрашивание пикселей слева и справа от текущей точки
        let left = sx;
        let right = sx + 1;

        while (left >= 0 && colorsMatch(ctx.getImageData(left, sy, 1, 1)?.data, targetColor)) {
            drawPixel(left, sy, color);
            left--;
        }

        while (
            right < canvas.width &&
            colorsMatch(
                ctx.getImageData(right, sy, 1, 1)?.data,
                targetColor
            )
            ) {
            drawPixel(right, sy, color);
            right++;
        }

        console.log(`Filled from Left: ${left + 1} to Right: ${right - 1}`);

        // Теперь проходим по диапазону от left + 1 до right - 1
        for (let ix = left + 1; ix < right; ix++) {
            // Проверка строки выше
            if (sy - 1 >= 0 && !colorsMatch(ctx.getImageData(ix, sy - 1, 1, 1)?.data, color) && colorsMatch(ctx.getImageData(ix, sy - 1, 1, 1)?.data, targetColor)) {
                stack.push([ix, sy - 1]);
                console.log(`Pushing pixel above (${ix}, ${sy - 1})`);
            }
            // Проверка строки ниже
            if (
                sy + 1 < canvas.height &&
                !colorsMatch(
                    ctx.getImageData(ix, sy + 1, 1, 1)?.data,
                    color
                ) &&
                colorsMatch(
                    ctx.getImageData(ix, sy + 1, 1, 1)?.data,
                    targetColor
                )
            ) {
                stack.push([ix, sy + 1]);
                console.log(`Pushing pixel below (${ix}, ${sy + 1})`);
            }
        }
    }
}

// Матрица узора
const patternMatrix = [
    [0, 0, 1, 0, 0, 1, 0 ,0],
    [0, 1, 0, 0, 0, 0, 1 ,0],
    [1, 0, 0, 0, 0, 0, 0 ,1],
    [0, 0, 0, 1, 1, 0, 0 ,0],
    [0, 0, 0, 1, 1, 0, 0 ,0],
    [1, 0, 0, 0, 0, 0, 0 ,1],
    [0, 1, 0, 0, 0, 0, 1 ,0],
    [0, 0, 1, 0, 0, 1, 0 ,0]
];

// Алгоритм "короеда"
function barkBeetleFill(x, y, color1, color2) {
    const targetColor = ctx.getImageData(x, y, 1, 1).data;
    if (colorsMatch(targetColor, color1)) return;

    const stack = [[x, y]];
    const patternHeight = patternMatrix.length;
    const patternWidth = patternMatrix[0].length;

    while (stack.length > 0) {
        const [px, py] = stack.pop();

        if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;

        const pixelColor = ctx.getImageData(px, py, 1, 1).data;

        if (colorsMatch(pixelColor, targetColor)) {
            // Определяем цвет клетки на основе матрицы
            const matrixRow = Math.floor(py % patternHeight);
            const matrixCol = Math.floor(px % patternWidth);
            const fillColor = patternMatrix[matrixRow][matrixCol] === 1 ? color1 : color2;

            drawPixel(px, py, fillColor);

            stack.push([px + 1, py]); // справа
            stack.push([px - 1, py]); // слева
            stack.push([px, py + 1]); // снизу
            stack.push([px, py - 1]); // сверху
        }
    }
}



// Функция для перерисовки всех сохранённых фигур и закрасок
function redrawShapes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const shape of shapes) {
        const { type, startX, startY, endX, endY, color } = shape;
        switch (type) {
            case 'line':
                drawLine(startX, startY, endX, endY, color);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                drawCircle(startX, startY, radius, color);
                break;
            case 'bezier':
                drawQuadraticBezier({ x: startX, y: startY }, { x: (startX + endX) / 2, y: (startY + endY) / 2 }, { x: endX, y: endY }, color);
                break;
            case 'fill':
                seedFill(startX, startY, color);
                break;
            case 'barkBeetleFill':
                const color2 = '#FFFFFF';
                barkBeetleFill(startX, startY, color, color2);
                break;
        }
    }
}

// Сохранение фигур или закрасок
function saveShape(type, startX, startY, endX, endY, color, color1, color2) {
    shapes.push({ type, startX, startY, endX, endY, color, color1, color2 });
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
    redrawShapes();

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
        seedFill(currentX, currentY, ctx.fillStyle);
        saveShape('fill', currentX, currentY, null, null, ctx.fillStyle);
    } else if (drawMode.value === 'barkBeetleFill') {
        barkBeetleFill(currentX, currentY, ctx.fillStyle);
        saveShape('barkBeetleFill', currentX, currentY, null, null, ctx.fillStyle);
    } else {
        saveShape(drawMode.value, startX, startY, currentX, currentY, ctx.strokeStyle);
    }

    redrawShapes();
});
