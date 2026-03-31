# Design System Specification: The Luminous Archive

## 1. Overview & Creative North Star
**Creative North Star: The Luminous Archive**
This design system moves away from the "generic SaaS" aesthetic by embracing the depth of OLED technology and the precision of high-end editorial layouts. It is built on the concept of **The Luminous Archive**—where information isn't just displayed, it is curated within a multi-dimensional space. 

By utilizing a "Linear meets Vercel" philosophy, we prioritize information density and functional beauty. We break the rigid, boxed-in "template" look through intentional asymmetry, overlapping glass surfaces, and a high-contrast typography scale that favors dramatic display sizes against hyper-precise data points.

## 2. Color & Tonal Architecture
The palette is optimized for OLED displays, utilizing a true-black foundation to ensure infinite contrast and power efficiency, layered with deep indigos and ethereal violets.

### Surface Hierarchy & The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or tonal transitions.
- **The Foundation:** Use `surface_dim` (#0c1324) for the main application canvas.
- **Nesting Depth:** Use the `surface_container` tiers to create hierarchy. A `surface_container_low` (#151b2d) card sitting on a `surface` background provides a soft, natural lift that looks more sophisticated than a bordered box.
- **The Glass & Gradient Rule:** For floating elements or high-priority AI insights, use Glassmorphism. Apply `surface_variant` (#2e3447) at 40% opacity with a `24px` backdrop blur. 
- **Signature Textures:** Main CTAs and AI-driven components should utilize a subtle linear gradient from `primary` (#bdc2ff) to `primary_container` (#818cf8) at a 135-degree angle to provide "visual soul."

## 3. Typography
The system pairs the approachable, humanist geometry of **Plus Jakarta Sans** with the technical rigor of **JetBrains Mono**.

- **Editorial Impact:** Use `display-lg` and `headline-lg` for hero moments and key AI summaries. These should be set with tight letter-spacing (-0.02em) to feel authoritative.
- **Technical Precision:** Use **JetBrains Mono** for all timecodes, data arrays, and metadata. This font change signals to the user that they are looking at "raw" or "computed" data, creating a clear cognitive distinction from the narrative text.
- **Information Density:** Utilize `label-sm` for secondary metadata. In an information-dense environment, the clarity of Plus Jakarta Sans at small scales allows us to pack more value into the screen without causing fatigue.

## 4. Elevation & Depth
Depth is a functional tool, not a decoration. We convey hierarchy through **Tonal Layering** and ambient light.

- **The Layering Principle:** Stacking follows the natural logic of light. The "highest" elements (modals, popovers) use `surface_container_highest`. The "lowest" (backgrounds) use `surface_container_lowest`.
- **Ambient Shadows:** Shadows must be ultra-diffused. For floating modals, use a shadow with a `40px` blur, `0%` spread, and `8%` opacity. The shadow color should be tinted with `primary` (#bdc2ff) to mimic the glow of the screen rather than a "dirty" grey.
- **The "Ghost Border" Fallback:** If accessibility requirements demand a container boundary, use a "Ghost Border." This is an `outline_variant` (#454653) set to **15% opacity**. It should be felt, not seen.

## 5. Components

### Premium Buttons
- **Style:** 10px radius (`md` scale). 
- **Primary:** Gradient fill (Primary to Primary Container) with a subtle white inner-glow (top edge) to simulate a tactile, glass-like edge.
- **Secondary:** Transparent background with a `Ghost Border` and 8% `on_surface` hover state.

### AI Indicator Dots & Glows
- **AI Status:** Use `secondary` (#cebdff) for AI-active states. 
- **The Pulse:** Active AI processing should be represented by a 4px dot with a 12px radial blur (glow) using the `AI Violet` token. This provides a "living" feel to the interface.

### Glassmorphism Cards
- **Construction:** 16px radius (`lg` scale). 
- **Background:** `surface_variant` at 60% opacity + `backdrop-filter: blur(16px)`.
- **Spacing:** Use the `8` (1.75rem) spacing token for internal padding to give the content room to breathe within the dense layout.

### Data Lists
- **Rule:** Forbid divider lines. 
- **Implementation:** Use vertical white space (Spacing scale `4` or `5`) and subtle background shifts on hover (`surface_bright` at 5% opacity) to separate list items.

## 6. Do’s and Don’ts

### Do:
- **Use Asymmetry:** Place metadata (JetBrains Mono) in unexpected locations, like the top-right of a card, to break the "grid" feel.
- **Embrace the Dark:** Allow large areas of `#020617` to exist. Negative space in OLED is a premium asset.
- **Layer with Purpose:** Only use glassmorphism for elements that literally "float" over other content.

### Don’t:
- **Don't use 100% white text:** Always use `on_surface` or `on_surface_variant` to prevent eye strain in dark mode.
- **Don't use solid borders:** Never use a solid 1px line to separate headers from body content; use a spacing increase or a weight shift.
- **Don't over-glow:** AI glows should be subtle (opacity < 30%). If the screen looks like a neon sign, the editorial "high-end" feel is lost.