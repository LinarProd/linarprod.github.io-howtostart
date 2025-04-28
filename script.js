function drawChordDiagram(shape) {
    const svgNS = "http://www.w3.org/2000/svg";
    const width = 200;
    const height = 250;
    const frets = 5;
    const strings = 6;
    const stringSpacing = width / 7;
    const fretSpacing = height / 7;
    const margin = stringSpacing;

    // Создаем SVG элемент
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Рисуем струны
    for (let i = 0; i < strings; i++) {
        const x = margin + i * stringSpacing;
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", margin);
        line.setAttribute("x2", x);
        line.setAttribute("y2", height - margin);
        line.setAttribute("class", "string");
        svg.appendChild(line);
    }

    // Рисуем лады
    for (let i = 0; i < frets + 1; i++) {
        const y = margin + i * fretSpacing;
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", margin);
        line.setAttribute("y1", y);
        line.setAttribute("x2", width - margin);
        line.setAttribute("y2", y);
        line.setAttribute("class", i === 0 ? "nut" : "fret");
        svg.appendChild(line);
    }

    // Находим минимальный и максимальный лад
    let minFret = 24;
    let maxFret = 0;
    shape.forEach(fret => {
        if (fret !== null && fret > 0) {
            minFret = Math.min(minFret, fret);
            maxFret = Math.max(maxFret, fret);
        }
    });

    // Определяем, нужно ли смещение
    // Смещаем только если минимальный лад > 3 или максимальный лад > 5
    let shouldOffset = minFret > 3 || maxFret > 5;
    let displayOffset = shouldOffset ? minFret - 1 : 0;

    // Если есть смещение, показываем номер лада
    if (shouldOffset) {
        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", margin - 15);
        text.setAttribute("y", margin + fretSpacing * 0.75);
        text.setAttribute("class", "fret-number");
        text.textContent = minFret.toString();
        svg.appendChild(text);
    }

    // Отмечаем позиции пальцев
    shape.forEach((fret, stringIndex) => {
        const x = margin + stringIndex * stringSpacing;
        if (fret === null) {
            // X для приглушенной струны
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", x);
            text.setAttribute("y", margin - 10);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("class", "muted");
            text.textContent = "×";
            svg.appendChild(text);
        } else if (fret === 0) {
            // Кружок для открытой струны
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", margin - 10);
            circle.setAttribute("r", 5);
            circle.setAttribute("class", "open");
            svg.appendChild(circle);
        } else {
            // Точка для зажатой струны
            const circle = document.createElementNS(svgNS, "circle");
            const displayFret = shouldOffset ? fret - displayOffset : fret;
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", margin + (displayFret - 0.5) * fretSpacing);
            circle.setAttribute("r", 8);
            circle.setAttribute("class", "dot");
            svg.appendChild(circle);
        }
    });

    // Очищаем и добавляем новую диаграмму
    const container = document.getElementById("chordDiagram");
    container.innerHTML = "";
    container.appendChild(svg);
}

document.getElementById('chordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Собираем значения из формы
    const inputShape = [];
    for (let i = 5; i >= 0; i--) {
        let val = document.getElementById('string' + i).value.trim().toUpperCase();
        if (val === 'X') {
            inputShape.push(null);
        } else if (val === '' || isNaN(val)) {
            inputShape.push(null);
        } else {
            inputShape.push(Number(val));
        }
    }

    try {
        const response = await fetch('chords.json');
        if (!response.ok) {
            throw new Error('Ошибка загрузки базы аккордов');
        }
        const chords = await response.json();
        
        let bestMatch = null;
        let bestScore = Infinity;

        // Перебираем все аккорды
        for (const chord of chords) {
            const score = compareShapes(inputShape, chord.shape);
            if (score < bestScore) {
                bestScore = score;
                bestMatch = chord;
            }
        }

        const resultDiv = document.getElementById('result');
        if (bestMatch && bestScore <= 1.5) {
            resultDiv.textContent = `Найденный аккорд: ${bestMatch.name}`;
            drawChordDiagram(bestMatch.shape);
        } else {
            resultDiv.textContent = 'Аккорд не найден';
            document.getElementById('chordDiagram').innerHTML = '';
        }
    } catch (error) {
        console.error('Ошибка при поиске аккорда:', error);
        document.getElementById('result').textContent = 'Произошла ошибка при поиске аккорда';
    }
});

function compareShapes(shape1, shape2) {
    if (!Array.isArray(shape1) || !Array.isArray(shape2) || 
        shape1.length !== 6 || shape2.length !== 6) {
        return Infinity;
    }

    let score = 0;
    for (let i = 0; i < 6; i++) {
        // Если оба значения null или оба 0, считаем их совпадающими
        if ((shape1[i] === null && shape2[i] === null) || 
            (shape1[i] === 0 && shape2[i] === 0)) {
            continue;
        }
        
        // Если одно значение null, а другое нет
        if (shape1[i] === null || shape2[i] === null) {
            score += 0.5;
            continue;
        }
        
        // Если значения не совпадают
        if (shape1[i] !== shape2[i]) {
            score += 1;
        }
    }
    return score;
}
