const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(
  projectRoot,
  "src/rituals/fortune-book/content/fortune-book-ru-1200.json",
);
const outputPath = path.join(
  projectRoot,
  "src/rituals/fortune-cookie/content/fortune-cookie-ru-700.json",
);

const playfulLines = [
  "Сегодня удача предпочитает тех, кто не хмурится.",
  "Случайный поворот окажется приятнее продуманного маршрута.",
  "Маленькая прихоть сегодня подскажет верное направление.",
  "Неожиданная улыбка откроет дверь быстрее серьёзного разговора.",
  "Позволь плану немного пошалить — результат тебя удивит.",
  "Сегодня полезно оставить место для счастливой нелепости.",
  "Нужная идея появится, когда ты перестанешь выглядеть занятым.",
  "Один добрый жест вернётся в особенно забавной форме.",
  "Не спорь со случайностью, если она предлагает хороший вариант.",
  "Твой лучший аргумент сегодня может оказаться простой улыбкой.",
  "Небольшое приключение уже притворяется обычным делом.",
  "Серьёзный вопрос неожиданно решится почти играючи.",
  "Сегодня интуиция может говорить с лёгкой улыбкой.",
  "Приятная случайность выберет самый неподходящий момент.",
  "Кто-то рядом скоро удивит тебя хорошим чувством юмора.",
  "Необычная идея заслуживает хотя бы одной весёлой попытки.",
  "Сегодня маленькая награда найдёт тебя без подсказок.",
  "Случайная фраза окажется полезнее длинного совета.",
  "Разреши себе выбрать вариант, который звучит интереснее.",
  "Хорошая новость может прийти в неожиданной упаковке.",
  "Один спонтанный шаг заметно улучшит сегодняшний маршрут.",
  "Сегодня привычная вещь покажет свою забавную сторону.",
  "Лёгкость окажется убедительнее слишком серьёзного плана.",
  "Короткая прогулка принесёт неожиданно удачную мысль.",
  "Неожиданный комплимент окажется совершенно заслуженным.",
  "Сегодня стоит довериться своему самому любопытному вопросу.",
  "Маленькая смелость скоро станет приятной историей.",
  "Случайный выбор добавит дню недостающую искру.",
  "Удачная идея появится между двумя обычными делами.",
  "Сегодня полезный ответ может прозвучать несерьёзно.",
  "Кто-то оценит деталь, которую ты добавил играючи.",
  "Небольшой сюрприз уже ищет удобный момент.",
  "Сегодня твоя находчивость приятно удивит окружающих.",
  "Неидеальный план подарит очень удачный поворот.",
  "Обычный вечер способен придумать необычное продолжение.",
];

const targets = {
  hopeful: 280,
  neutral: 175,
  mysterious: 105,
  cautionary: 105,
};

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const wordCount = (text) => text.trim().split(/\s+/u).length;
const eligible = source.entries.filter(
  (entry) =>
    Object.hasOwn(targets, entry.tone) &&
    entry.line.length >= 30 &&
    entry.line.length <= 85 &&
    wordCount(entry.line) >= 5 &&
    wordCount(entry.line) <= 13,
);

function takeEvenly(values, count) {
  if (values.length < count) throw new Error(`Need ${count} entries, found ${values.length}`);
  return Array.from({ length: count }, (_, index) => values[Math.floor((index * values.length) / count)]);
}

const selected = Object.entries(targets).flatMap(([tone, count]) =>
  takeEvenly(eligible.filter((entry) => entry.tone === tone), count).map((entry) => ({
    text: entry.line,
    category: entry.theme,
    tone,
  })),
);

selected.push(
  ...playfulLines.map((text) => ({
    text,
    category: "playful",
    tone: "playful",
  })),
);

const textSet = new Set(selected.map((entry) => entry.text));
if (selected.length !== 700 || textSet.size !== 700) {
  throw new Error(`Expected 700 unique entries, got ${selected.length}/${textSet.size}`);
}

const entries = selected.map((entry, index) => ({
  id: `FC_${String(index + 1).padStart(4, "0")}`,
  ...entry,
}));

const pack = {
  version: 1,
  language: "ru",
  ritual: "fortune-cookie",
  entryCount: entries.length,
  entries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`);
process.stdout.write(`${outputPath}: ${entries.length} entries\n`);
