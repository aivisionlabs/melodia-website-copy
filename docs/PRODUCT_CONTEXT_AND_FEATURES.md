# Melodia — Product Context & Features

This document describes the **context** (why the product exists, who it serves, how it fits the market) and the **features** of Melodia in generic terms, without referencing specific technology or vendor names.

---

## Part 1: Product Context

### What Melodia Is

Melodia is a **personalized song creation platform** for the Indian market. It lets people create **custom songs** as gifts or for occasions—addressing a recipient by name, referencing their relationship, occasion, and story—and receive a **full song** (lyrics + music) they can listen to, download, and share.

### Problem It Solves

- **Gift personalization:** Generic gifts (cards, flowers, cakes) feel impersonal. A song written and sung *for* someone is memorable and emotional but has historically required hiring musicians or songwriters.
- **Accessibility:** Most people cannot write lyrics or produce music. They want a “song for my friend’s birthday” or “a wedding song for my sister” without musical skills.
- **Language and occasion fit:** India is multilingual and occasion-rich (weddings, birthdays, anniversaries, festivals, thank-yous, apologies, etc.). The product caters to multiple languages and occasions in one place.
- **Speed and convenience:** Users want to go from “I have an idea” to “I have a song” quickly—either instantly (self-serve) or within a short turnaround (expert-assisted).

### Who It Is For

| Audience | Need |
|----------|------|
| **Gift givers** | A unique, emotional gift for a loved one (birthday, anniversary, farewell, thank-you). |
| **Families & couples** | Wedding-related songs (Sangeet, Haldi, Mehendi), romantic or anniversary songs. |
| **Friends & colleagues** | Friendship songs, party songs, farewell or congratulations. |
| **Parents & caregivers** | Lullabies, kids’ songs, songs for parents. |
| **Corporates & teams** | Songs for events, retirements, or team celebrations. |
| **Anyone wanting a quick song** | Users who prefer a pre-made template and only need to add a name or minimal details. |

The product serves both **anonymous visitors** (try without signing up) and **registered users** (account for history, profile, and continuity).

### Market & Positioning

- **Geography:** India-first (pricing in INR, languages and occasions aligned to Indian use cases).
- **Positioning:** “Create personalized songs for any occasion” — the go-to platform for custom, occasion-based songs in multiple Indian languages.
- **Differentiation:** Combines **personalized lyrics** (from the user’s story and inputs) with **full music production** (not just karaoke or pre-recorded tracks), in a **guided, productized flow** (packages, clear steps, optional expert tier).

### How the Product Fits Together

- **Two creation paths:**  
  - **Custom:** User shares story and preferences → system generates lyrics → user can edit → system generates music → user gets one or more song variants.  
  - **Templated:** User picks a ready-made template → enters name (and any required fields) → system generates a personalized instance → user gets the song.
- **Monetization:** Packaged offerings (e.g. Starter, Creator, Maestro) with different levels of lyrics edits, song variants, and delivery (instant vs expert-assisted).
- **Ownership and access:** All created content is tied to the user (or anonymous session). “My Songs” (custom) and “My generated songs” (templates) are the central places to see status, listen, and manage outputs.

---

## Part 2: Features of the Product

Features are described in a **vendor- and implementation-agnostic** way.

---

### Creation & Input

| Feature | Description |
|---------|-------------|
| **Song request form** | User provides recipient name and relationship, occasion, languages, mood, and a story or additional details. Optional contact info (email, mobile). Form validates inputs and creates a request that drives the rest of the flow. |
| **Package selection** | User chooses a plan (e.g. Starter, Creator, Maestro) before or during creation. Package determines lyrics edit count, number of song variants, template usage, and delivery type (instant vs expert-assisted). |
| **Templated song input** | For template-based flow: user selects a template and fills required fields (e.g. name). Minimal input for a full song. |
| **“Use this style”** | From a library or sample song, user can start a *custom* song that follows the style of that reference. The system uses the reference to guide music style while still personalizing lyrics and content. |

---

### Lyrics

| Feature | Description |
|---------|-------------|
| **AI-generated lyrics** | Lyrics are generated from the song request (recipient, occasion, mood, story, language). Generation is done by an AI service; the product sends structured prompts and receives title, lyrics text, and suggested music style. |
| **Edit with AI** | User can request changes to the lyrics (e.g. “make it more romantic,” “add a verse about our trip”). Each request produces a new version. Edits are limited by package (e.g. number of “magic edits”). |
| **Lyrics versioning** | Multiple lyric drafts are kept per request. User can switch between versions and choose which one to use for music generation. |
| **Approval for music** | User explicitly approves one lyrics version before the system generates music, so the final song matches the chosen text. |
| **Expert-crafted lyrics (premium)** | In the highest-tier package, lyrics can be reviewed and refined by experts for quality and pronunciation before music generation. |

---

### Music Generation

| Feature | Description |
|---------|-------------|
| **Music from lyrics** | Approved lyrics (and metadata such as style) are sent to a music-generation service. The service returns one or more audio variants. |
| **Song variants** | The system can produce multiple versions of the same song (e.g. different arrangements or styles). User can listen to each and select a favorite. |
| **Style from reference** | When “Use this style” is used, the reference song’s style (e.g. voice/persona) can be used so the new song sounds consistent with that reference. |
| **Status and progress** | User sees status such as “processing” or “in progress” and can open a “View progress” or “Listen” experience when the song is ready. |
| **Retry on failure** | If music generation fails, user can retry from the same lyrics so they do not lose their work. |

---

### Playback & Content Management

| Feature | Description |
|---------|-------------|
| **My Songs (custom)** | Single list of the user’s custom song requests and generated songs. Each item shows status and the right action: Listen, View progress, Retry, or choose variant. |
| **My generated songs (templates)** | List of songs created from templates for this user/session. Shows status (e.g. in progress, ready) and link to playback. |
| **Song playback** | Dedicated page or player for each song: play audio, see lyrics, and switch between variants if available. |
| **Variant selection** | When multiple variants exist, user can pick one; the choice is saved so the preferred version is easy to access later. |
| **Search and filters** | On “My Songs,” user can search or filter (e.g. by status) to find specific requests or songs. |
| **Download and sharing** | User can download the song and share the link so others can listen (within the product’s sharing model). |

---

### User Identity & Access

| Feature | Description |
|---------|-------------|
| **Anonymous use** | User can complete the full flow (request, lyrics, music, payment) without creating an account. Identity is maintained via session/cookie so “My Songs” and “My generated songs” work in that session. |
| **Registration and login** | Optional account (email/password). On signup or login, any anonymous activity can be merged into the account so no content is lost. |
| **Profile** | Registered users can manage profile and account settings. |
| **Ownership** | All created content is tied to the current identity (anonymous or registered). Only that identity sees their lists and can perform actions (e.g. delete, re-generate) as per product rules. |

---

### Payments

| Feature | Description |
|---------|-------------|
| **Package-based payment** | User pays for the chosen package (e.g. Starter, Creator, Maestro). Payment can be integrated at the appropriate step in the flow (e.g. before or after lyrics/music generation, as per product design). |
| **Payment for both user types** | Payment is supported for both anonymous and registered users so conversion is not blocked by signup. |
| **Refund policy** | Product has a refund policy and related documentation (e.g. refund page) so users know when and how refunds apply. |

---

### Discovery & Marketing

| Feature | Description |
|---------|-------------|
| **Library** | Curated list of sample or showcase songs. Users can browse and, where supported, start a custom song “in the style of” a library song. |
| **Occasion pages** | Dedicated pages for occasions (e.g. birthday, anniversary, wedding, Sangeet, Haldi, Mehendi, farewell, thank-you). They help discovery and funnel users into creation or pricing. |
| **Blog and content** | Blog or content section for tips, stories, and SEO. |
| **FAQ, About, Contact** | Standard informational pages so users can understand the product, delivery, and support. |
| **Analytics and tracking** | Events (e.g. funnel steps, CTA clicks, playback) and optional partner/UTM parameters for marketing and optimization. |

---

### Administration

| Feature | Description |
|---------|-------------|
| **Song admin** | Back-office to manage songs, requests, and related data (e.g. status, lyrics, audio). |
| **Templated songs admin** | Create, edit, and manage templates (content, required fields, process to generate demo/preview songs). |
| **Personas / style references** | Manage “personas” or style references used for “Use this style” and similar-style generation. |
| **Partners and tracking** | Manage partner/affiliate setup and UTM or referral tracking. |
| **Blog admin** | Create and manage blog or marketing content. |

---

## Summary

- **Context:** Melodia exists to give anyone in India a way to create **personalized, full songs** for **any occasion** and **multiple languages**, without musical skill—either through a **custom story-to-song** path or a **template-based** path, with clear packages and optional expert help.
- **Features:** The product covers **input and request capture**, **AI-generated and editable lyrics with versioning**, **music generation with variants and style-from-reference**, **playback and content lists**, **anonymous and registered identity**, **payments**, **discovery (library, occasions, blog)**, and **admin tools** for songs, templates, and marketing.

This document stays generic and does not reference specific AI, music, or payment providers; for technical and integration details, see the rest of the docs folder.
