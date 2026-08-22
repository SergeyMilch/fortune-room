export type CoinOutcome = "sun" | "moon";

const readings: Record<CoinOutcome, readonly string[]> = {
  sun: [
    "Обстоятельства благоприятствуют действию",
    "Сейчас первый шаг важнее полного плана",
    "Возможность стоит использовать, пока она открыта",
    "Ясность придёт, когда вы начнёте действовать",
    "Решение получит поддержку обстоятельств",
    "Сомнения слабее той возможности, что перед вами",
    "Направление выбрано верно — двигайтесь дальше",
    "Сейчас инициатива окажется своевременной",
  ],
  moon: [
    "Сейчас лучше оставить ситуацию без вмешательства",
    "В вопросе ещё не хватает важной детали",
    "Возвращение к этому позже даст более ясный ответ",
    "Пауза сейчас полезнее поспешного решения",
    "Обстоятельствам нужно дать время проявиться",
    "Не всё скрытое уже готово стать явным",
    "Лучший ход сейчас — наблюдать и не торопиться",
    "Дождитесь более спокойного момента для решения",
  ],
};

export function drawCoinOutcome(random: () => number = Math.random): CoinOutcome {
  return random() < 0.5 ? "sun" : "moon";
}

export function drawCoinReading(
  outcome: CoinOutcome,
  random: () => number = Math.random,
): string {
  const options = readings[outcome];
  const index = Math.min(options.length - 1, Math.floor(random() * options.length));
  return options[index];
}

