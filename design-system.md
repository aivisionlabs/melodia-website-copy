# Melodia – Design System

This document defines the **design system** for the **Melodia** music generator website. It provides detailed guidance for colors, typography, spacing, imagery, iconography, and voice/tone to ensure consistent branding and styling across all components.

---

## 1. Brand Concept

* **Essence:** Energetic, social, and unapologetically joyful.
* **Goal:** Celebrate shared moments of happiness and connections through music.
* **Keywords:** Energetic, Social, Joyful, Vibrant.
* **Tagline Example:** *"Melodia - Create Personalized Songs for Loved Ones"*

---

## 2. Color Palette

Use the following colors consistently across the product.

| Role      | Name          | Hex       | Usage                                    |
| --------- | ------------- | --------- | ---------------------------------------- |
| Primary   | Bright Yellow | `#FFD166` | Buttons, highlights, key UI elements     |
| Secondary | Light Cream   | `#FDFDFD` | Backgrounds, cards, containers           |
| Accent    | Vibrant Coral | `#EF476F` | Calls-to-action, notifications, emphasis |
| Text      | Dark Teal     | `#073B4C` | Primary text, headings, strong contrast  |

**Implementation Notes:**

* Use **Primary Yellow** for CTAs and brand highlights.
* **Secondary Cream** is the default background.
* **Accent Coral** should be used sparingly for emphasis.
* **Dark Teal** is the default text color for readability.

---

## 3. Typography

### Fonts

* **Heading Font:** [Poppins](https://fonts.google.com/specimen/Poppins)

  * **Usage:** Titles, headlines, key callouts
  * **Weight Recommendation:** `600–700` for bold impact
  * **Tone:** Bold, friendly, energetic

* **Body Font:** [Montserrat](https://fonts.google.com/specimen/Montserrat)

  * **Usage:** Paragraphs, descriptions, UI text
  * **Weight Recommendation:** `400–500` for clean legibility
  * **Tone:** Geometric, approachable, modern

### Sizing Guidelines

* **H1:** 48px / Bold / Poppins / Line-height: 120%
* **H2:** 36px / Semi-bold / Poppins / Line-height: 125%
* **H3:** 28px / Semi-bold / Poppins
* **Body Large:** 18px / Regular / Montserrat
* **Body Medium:** 16px / Regular / Montserrat
* **Body Small:** 14px / Regular / Montserrat
* **Caption:** 12px / Montserrat / Light

---

## 4. Logo & Iconography

### Logo

* **Style:** Bold, friendly sans-serif wordmark.
* **Feel:** Approachable, confident, instantly recognizable.
* **Usage:**

  * Light backgrounds → Dark Teal logo
  * Dark backgrounds → White logo

### Icons

* **Style:** Simple, geometric, energetic.
* **Examples:** Stylized musical notes, sound waves, headphones.
* **Usage:**

  * Use consistent stroke width.
  * Favor rounded corners over sharp edges.
  * Maintain high recognizability.

---

## 5. Imagery Guidelines

Photography and illustrations should reinforce joy, connection, and authenticity.

* **Subject Matter:**

  * Friends laughing, sharing headphones, singing, dancing.
  * Candid, natural expressions of joy.

* **Mood & Tone:**

  * Vibrant, authentic, full of life.
  * Avoid corporate or overly staged stock photos.

* **Lighting:**

  * Bright, natural, warm tones.
  * Colors should complement the primary palette.

---

## 6. UI Components & Application

### Buttons

* **Primary Button**: Bright Yellow background (`#FFD166`), Dark Teal text, rounded corners (`border-radius: 8px`), bold Poppins.
* **Secondary Button**: Coral border, Transparent background, Coral text.
* **Hover States**: Darker shade of yellow/coral with subtle shadow.

### Cards

* Background: Light Cream (`#FDFDFD`)
* Border-radius: 12–16px
* Shadow: Soft, subtle to enhance depth

### Inputs

* Border: 1px solid Dark Teal (`#073B4C` at 40% opacity)
* Font: Montserrat Regular, 16px
* Focus state: Coral border highlight

### Navigation Bar

* Background: Light Cream
* Text: Dark Teal / Poppins
* Active item: Underlined in Coral

---

## 7. Accessibility Guidelines

* Ensure color contrast ratio of at least **4.5:1** for text.
* Provide **alt-text** for all imagery.
* Ensure all buttons have clear **focus states**.
* Avoid relying only on color to convey meaning.

---

## 9. Implementation Checklist

* [ ] Import **Poppins** and **Montserrat** from Google Fonts.
* [ ] Set global text color to **Dark Teal**.
* [ ] Apply **Bright Yellow** to primary CTAs.
* [ ] Use **Light Cream** as the default background.
* [ ] Follow sizing rules for headings and body text.
* [ ] Use authentic, candid imagery.
* [ ] Apply consistent button, card, and navigation styles.
* [ ] Ensure accessibility standards are met.
