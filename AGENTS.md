# Fortune Room — Codex Project Instructions

## Product

Fortune Room is an atmospheric entertainment Android application built around short interactive prediction rituals.

The product is NOT presented as real clairvoyance or a serious esoteric service.

Core experience:

Fortune Room
→ interactive mystical object
→ short ritual
→ prediction/sign
→ return to room

Primary platform:
Android / RuStore.

Primary monetization:
advertising, especially rewarded ads.

The application must remain usable and pleasant without watching rewarded ads.

---

# Core Development Principle

SIMPLE CODE
+
BEAUTIFUL EXPERIENCE

Prefer a simple robust implementation with strong visual polish over unnecessary architectural complexity.

Do not introduce backend services, cloud infrastructure, Redux, Firebase, Supabase, native code or other heavy dependencies unless there is a concrete product requirement.

---

# Technology Stack

Use:

- Expo SDK 56
- React Native
- TypeScript
- Expo Router

Preferred libraries:

- react-native-reanimated
- react-native-gesture-handler
- @shopify/react-native-skia
- expo-image
- expo-audio
- expo-haptics
- expo-sqlite
- expo-notifications

Use Expo-supported APIs whenever possible.

Start development with Expo Go when the required functionality is supported.

Switch to an Expo Development Build when native functionality requires it, for example advertising SDKs.

Do NOT migrate away from Expo without a demonstrated technical reason.

---

# Visual Tools

The following Codex tools/skills may be available and SHOULD be used when useful:

- Image Gen
- Figma
- Figma Create Design
- Figma Implement Design
- 01 Superdesign

For visually important screens:

DO NOT immediately start by writing JSX.

First determine:

1. composition;
2. visual hierarchy;
3. required assets;
4. static vs animated layers;
5. animation sequence.

When appropriate:

Image Gen
→ assets

Figma / design skill
→ composition

Expo / React Native
→ implementation

For major visual changes, compare the implementation against screenshots or the approved design.

---

# Art Direction

The application should feel like:

- dark wood;
- deep navy;
- near-black backgrounds;
- bronze;
- aged paper;
- warm golden candlelight;
- glass;
- subtle smoke;
- subtle dust and particles.

Avoid:

- cheap purple neon;
- excessive stars;
- cliché fortune-teller imagery;
- casino aesthetics;
- excessive gradients;
- generic AI-generated mobile UI;
- emoji as final production artwork.

The atmosphere should be:

mysterious,
warm,
premium,
calm,
slightly playful.

Not frightening.

Not occult-heavy.

---

# Motion Design

Animations are a core part of the product.

They must feel:

- soft;
- deliberate;
- organic;
- slightly slow;
- premium.

Avoid abrupt transitions.

Use shared motion helpers when possible.

Common motion patterns should include:

- fade;
- scale;
- subtle bounce;
- glow pulse;
- object focus;
- ritual reveal;
- result reveal;
- room-to-ritual transition.

Do not duplicate the same animation implementation across rituals.

---

# React Native Skia

Use Skia when it materially improves visual quality, especially for:

- crystal ball effects;
- glow;
- blur;
- gradients;
- masks;
- particles;
- smoke-like effects;
- dynamic lighting.

Do NOT use Skia simply because it is available.

Static artistic elements should usually remain image assets.

---

# Asset Strategy

Prefer generated or manually prepared assets for complex artwork.

Do NOT attempt to recreate every visual element from Views and CSS-like styles.

Possible assets:

- Fortune Room background;
- wooden table;
- crystal sphere;
- pedestal;
- book;
- paper textures;
- cookie pieces;
- rune stones;
- decorative objects;
- smoke textures;
- light masks.

Prefer WebP/PNG where appropriate.

Keep source artwork and runtime assets organized separately.

---

# Ritual Architecture

Each ritual must be isolated.

Suggested conceptual structure:

src/
  rituals/
    crystal-ball/
    fortune-book/
    fortune-cookie/
    fortune-coin/
    runes/

A ritual must not directly depend on the internal implementation of another ritual.

Shared functionality belongs in shared services/components.

Do NOT create a giant App.tsx.

Do NOT place all ritual state into one giant global store.

---

# First Vertical Slice

The FIRST ritual is:

Crystal Ball.

Do not implement Book, Cookie, Coin or Runes until the Crystal Ball vertical slice has reached acceptable visual quality.

The Crystal Ball is the visual benchmark for the rest of the application.

Expected interaction:

1. user mentally asks a question;
2. user touches or holds the ball;
3. light haptic;
4. sphere subtly reacts;
5. internal light increases;
6. smoke/particles become more active;
7. environment subtly darkens;
8. glow reaches a peak;
9. second subtle haptic;
10. prediction gradually appears;
11. effects calm down.

Target reveal duration:
approximately 2–4 seconds.

The final result must feel satisfying on a physical Android device.

---

# Sound Design

Sound is part of the experience, not an afterthought.

Use short subtle sounds.

Examples:

Crystal Ball:
- glass resonance;
- subtle shimmer;
- low ambient tone.

Book:
- book opening;
- paper;
- page turning.

Cookie:
- crack;
- crumbs;
- paper unfolding.

Coin:
- whoosh;
- spin;
- metallic impact.

Runes:
- stone;
- subtle low resonance;
- reveal shimmer.

Never use loud or repetitive sounds.

Provide:

Sound ON/OFF.

---

# Haptics

Use haptic feedback sparingly.

Suggested language:

interaction
→ light

ritual climax
→ medium

result
→ light/subtle

Do not vibrate continuously.

Provide:

Haptic ON/OFF.

---

# Prediction Engine

AI is NOT required for prediction generation in MVP.

Predictions should come from a local curated dataset.

Suggested fields:

- id
- text
- category
- tone

Categories may include:

- general
- love
- decision
- work
- mood
- change
- caution
- positive
- mysterious

Predictions must not:

- claim certainty;
- predict death or serious illness;
- provide medical advice;
- provide financial advice;
- encourage dangerous behavior.

---

# Daily Prediction

Daily prediction must be deterministic for the same user and calendar day.

Use a stable user seed combined with the local date.

Opening the app repeatedly on the same day must NOT produce a new daily prediction.

Test:

- app restart;
- timezone/local date behavior;
- day rollover.

---

# Local-First

MVP should work offline.

No mandatory account.

No backend unless explicitly approved.

Persist:

- user seed;
- history;
- favorites;
- streak;
- daily prediction;
- unlocked cosmetics;
- settings;
- statistics;
- ad frequency state.

Use SQLite for structured persistent data.

Use lightweight key-value storage only where appropriate.

---

# Ads

Advertising must not interrupt the ritual itself.

Never show interstitial ads:

- on first app launch;
- before first prediction;
- during an animation;
- after every interaction;
- after every ritual.

Interstitial ads should use frequency caps.

Rewarded ads must be voluntary.

Potential rewarded actions:

- second sign;
- another cookie;
- ask the ball again;
- tomorrow preview;
- bonus cosmetic currency;
- temporary cosmetic unlock.

Ad provider logic must be wrapped behind an internal AdsService abstraction.

Do not couple ritual code directly to the Yandex SDK.

---

# Retention

Important retention systems:

- Daily Prediction
- streak
- history
- favorites
- share cards
- prediction feedback
- cosmetics/unlocks

Do not implement all retention systems at once.

Build incrementally.

---

# Prediction Feedback

Later the user may mark a prediction as:

- yes;
- partially;
- no.

Statistics are entertainment only.

Never frame these statistics as proof that the application predicts the future.

---

# Sharing

Predictions should be shareable as attractive image cards.

Use the native Android share sheet.

Share assets should carry subtle Fortune Room branding without looking like spam.

---

# Debug / Developer Lab

Maintain a developer screen.

It should eventually allow:

- launch specific ritual;
- animation speed 0.5x / 1x / 2x;
- force prediction ID;
- reset daily prediction;
- reset streak;
- unlock cosmetics;
- add test currency;
- sound test;
- haptic test;
- skip intro;
- debug FPS when useful.

Development shortcuts must not leak into production UI.

---

# Code Quality

Use TypeScript strictly.

Keep components reasonably small.

Separate:

- presentation;
- business logic;
- storage;
- animation orchestration;
- services.

Avoid premature abstractions.

Avoid giant shared utility files.

Avoid unrelated refactoring while implementing a focused feature.

When modifying one ritual, do not modify other rituals unless necessary.

---

# Tests

Before completing a meaningful task, run the appropriate available checks.

Prefer:

- typecheck;
- lint;
- unit tests.

Business logic that should have automated tests includes:

- prediction selection;
- daily seed;
- date rollover;
- streak logic;
- history persistence;
- duplicate prevention;
- ad frequency caps.

Purely visual quality must be evaluated manually.

---

# Android Validation

Visual and interaction work must ultimately be tested on a real Android device.

Pay attention to:

- FPS;
- dropped frames;
- animation timing;
- touch responsiveness;
- haptic timing;
- audio synchronization;
- different screen sizes;
- safe areas.

A visually correct screenshot is not sufficient if the interaction feels bad on device.

---

# Workflow For Visual Features

For a significant visual feature:

1. understand the desired experience;
2. inspect existing project design;
3. decide which assets are needed;
4. use Image Gen when appropriate;
5. use Figma/design skills when useful;
6. implement a minimal version;
7. run on Android;
8. inspect screenshot/video;
9. polish timing and visual effects;
10. only then continue to the next major feature.

Do not implement five unfinished rituals in parallel.

---

# Current Priority

CURRENT PROJECT PRIORITY:

CRYSTAL BALL VERTICAL SLICE.

Until explicitly told otherwise:

DO NOT build:
- Fortune Book;
- Fortune Cookie;
- Fortune Coin;
- Runes.

Focus on making the Crystal Ball experience excellent first.

## EAS Build Usage

Do not run cloud EAS builds during normal development.

Do NOT execute:

eas build

without explicit user approval.

The Expo Free plan has a limited monthly EAS cloud build quota.

For Android development, prefer local compilation:

npx expo run:android

After the native development build is installed, use:

npx expo start

for normal JS/TS iteration.

Rebuild locally only when native dependencies or native configuration change.

Reserve EAS cloud builds primarily for intentional release/validation builds.