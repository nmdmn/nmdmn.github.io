# Abstract — Audiovisual Refinement Plan

> **Status:** Core refinement implemented locally; hardware/cross-browser release checks remain.
> **Review date:** 2026-10-06.
> **Scope:** Refine the existing experience, not redesign or rebuild it.
> **Creative direction:** Stone is the instrument. The pond remembers it.

## 1. Purpose and review basis

Make the experience feel like a coherent, professional audiovisual instrument rather than an editorial website containing an audio-reactive sculpture.

This plan follows a review of the authored JavaScript, shaders, HTML, styles, documentation, MIDI arrangement, and current Safari compositions, plus web research into interactive WebGL experiences, audiovisual installations, and kinetic sculpture. Dependencies and generated bundles are not the design baseline.

Distinguish three kinds of evidence:

- **Code findings:** Observable behavior in the pre-refinement implementation.
- **Design judgments:** Subjective assessments of composition, readability, and coherence.
- **Proposals:** Changes to prototype and evaluate, not already approved or implemented features.

Reference comparisons are based on published project descriptions, documentation, and case studies. They are not controlled, side-by-side performance benchmarks or claims that every reference was personally experienced. Browser inspection is not conclusive direct listening or physical-phone validation.

### Baseline change during review

The user replaced `assets/audio/bass.mp3` during the review, causing a Parcel rebuild, then clarified that its musical content is unchanged except for a very deep, subtle kick on each beat. Preserve the supplied audio and existing bass calibration; do not retune, replace the score, or invent kick MIDI. The normal startup duration/peak/headroom safeguards still apply. Safari confirmed the same common decoded loop length during implementation. Any additional audio files supplied by the user are left untouched and are not automatically substituted into the mixer.

`README.md` describes the implemented baseline. This document retains the original review and research, tracks implementation below, and records what still needs release validation. The user authorized the complete refinement after the review, rather than stopping at the originally recommended Phase 1 gate.

## 2. Assessment

The project already has a distinctive identity, synchronized stems, MIDI note identities, rigid masonry choreography, perspective-registered HTML, and a genuine mirrored-camera reflection. Its largest gap is **orchestration, not effect count**.

The following scores are provisional creative judgments against strong interactive-WebGL work and audiovisual installations, not official award scores or measured benchmarks.

| Dimension | Assessment | Main gap |
| --- | --- | --- |
| Identity and art direction | 8.5/10 | Protect the memorable ancient inverted masonry. |
| Composition and typography | 8/10 | Text sometimes dominates the musical surface. |
| Musical timing architecture | 8/10 | Strong shared-clock/MIDI foundation; audible-output latency remains unverified. |
| Musical readability | 6/10 | Accurate mappings do not always create readily perceived gestures. |
| Layered choreography | 5.5/10 | Audio accumulates; visual responses largely replace one another. |
| Environmental coherence | 6/10 | Pond, dust, and projection fields mostly run independently of musical gestures. |
| Dramaturgy and finale | 6.5/10 | Strong spatial chapters; less development within the repeating arrangement. |
| Shipping confidence | Not scored | Requires physical-device profiling, broader browser checks, and direct listening. |

**Overall creative assessment: approximately 7/10.** This is an indicative summary, not a calculated weighted average. There is substantial headroom without rebuilding the project.

## 3. Research and reference library

Borrow principles, not the references' visual identities. The strongest recurring lesson is that a coherent medium and clear cause-and-effect relationship matter more than accumulating effects.

### Primary creative references

| Reference and source | Relevant principle | Application to Abstract |
| --- | --- | --- |
| [Aether — Architecture Social Club × Max Cooper](https://www.architecturesocialclub.co.uk/work/aether) | A consistent spatial medium can express varied musical patterns and narrative. | Give stems distinct gestures within one material language rather than separate visualizer systems. |
| [Simple Harmonic Motion — Memo Akten](https://memo.tv/projects/2019/shm/) | Complex behavior can emerge from the interaction of simple patterns. | Compose a few bounded stone-motion rules and their interactions. |
| [Brixels — BREAKFAST](https://theartistbreakfast.com/brixels) | Discrete architectural elements can form readable continuous kinetic fields. | Evaluate brick motion at the whole-surface scale, not only at individual blocks. |
| [Cadence — Reuben Margolin](https://www.reubenmargolin.com/waves/cadence/) | Coordinated phase and propagation create fluid motion from discrete components. | Refine the long lead's traveling force, spatial continuity, and settling. |
| [Coala Music particle visualizer — ARKx / Codrops](https://tympanus.net/codrops/2023/12/19/creating-audio-reactive-visuals-with-dynamic-particles-in-three-js/) | Audio-reactive particles gain coherence from a procedural motion field. | Use pond particles to reveal forces rather than merely scaling or bouncing with volume. |
| [Lusion: Where Digital Craft Meets Ambitious Experimentation — Codrops, 2026](https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/) | Bespoke systems, experimentation, and consistent craft distinguish immersive web work. | Improve this project's particular identity rather than adopt a generic visualizer aesthetic. |
| [Patatap — Jono Brandel × Lullatone](https://patatap.com/) | Immediate sound/visual cause and effect makes interaction understandable. | A short-note attack should be recognizable without reading the listening cue. |

The Coala/Codrops article also links to its [demo](https://tympanus.net/Tutorials/ParticlesMusicVisualizer) and [source code](https://github.com/tgcnzn/Interactive-Particles-Music-Visualizer). These are implementation references, not a recommendation to replace our MIDI-driven instrument with an FFT-only particle visualizer.

### Supporting references and limits

- [Ryoji Ikeda — test pattern](https://www.ryojiikeda.com/project/testpattern/): useful for precise audiovisual correspondence and disciplined visual grammar. Do **not** borrow its intense flicker or strobe language.
- [Ryoichi Kurokawa — subassemblies, L.E.V.](https://levfestival.com/19/en/lev-madrid/ryoichi-kurokawa-subassemblies-2/): relevant to the relationship between architectural matter, fragmentation, and audiovisual composition. Do not use it to justify generic random destruction.
- [Refik Anadol — Unsupervised](https://refikanadol.com/works/unsupervised/): useful for continuity between a field and its environment. It is a data-art/environmental reference, not evidence of equivalent MIDI mapping or browser performance. Its dense visual language would overwhelm our minimalist composition.
- [Active Theory — Listening Together case study](https://medium.com/active-theory/listening-together-2e676f5e7201): broader context for music-centered spatial web experiences. Full article fetching was blocked during research; treat it as a further-reading link, not a fully reviewed technical source.
- [Lusion — My Little Storybook](https://lusion.co/projects/my_little_story_book/): supporting web-craft reference for cohesive assets and interactions, not a direct audio-visualizer comparator.
- [COMSOL — Visualizing sound with Chladni plates](https://www.comsol.com/blogs/how-do-chladni-plates-make-it-possible-to-visualize-sound): conceptual context for pitch-selected spatial response. Abstract's bass regions remain an artistic register map, not a physical eigenfrequency simulation.

### Technical timing reference

[MDN — AudioContext.getOutputTimestamp()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp) explains the relationship between the audio output-device position and the performance clock. This is the basis for investigating audible-output-aware visual timing. Also consult [MDN — outputLatency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency).

Use capability checks and actual-device measurements. Do not subtract a guessed constant, double-count latency, or promise universal Bluetooth synchronization.

## 4. Review findings (pre-refinement)

The following findings motivated the implementation. Their proposals are tracked in Section 6; they should not be read as a list of bugs still present in the current source.

### 4.1 Audible layers lose their visual representation

`src/scripts/audio-mixer.js` mixes stems cumulatively. In contrast, `src/scripts/stone-surface.js` crossfades pads into sequence, removes both before the settled bass chapter, and introduces only long-lead waves in the finale.

At settled short lead, pads have zero surface weight despite remaining audible. At the finale, the top instrument does not visually express the complete ensemble promised by the copy.

**Proposal:** Separate actual audibility from chapter emphasis. Preserve quieter supporting responses and bounded combined motion. Cumulative choreography does not require every stem to have equal prominence or retain the same visible mechanism in every view. In particular, preserve tip reassembly before the finale.

### 4.2 Accuracy is stronger than visibility

The first two approved views show the paving at a shallow angle. Meaningful pitch patches can be difficult to read even when the score mapping is correct.

**Proposal:** Improve patch shape, attack contrast, visible edge movement, and shadow readability within those views. Evaluate movement in projected screen pixels. Do not solve this by automatically increasing displacement or changing approved camera poses.

### 4.3 Environmental systems are mostly independent

`src/scripts/atmosphere.js` already contains projection particle sheets and ambient dust. Its update receives time and overhead framing, not musical features. `src/scripts/pond-drops.js` deliberately schedules independent randomized drops.

**Proposal:** Add restrained musical consequences alongside existing ambient behavior. Preserve independent drops rather than turning every environmental event into a beat trigger.

### 4.4 The final inscription competes with the paving

The overhead view exposes the instrument clearly, but the central inscription occupies much of the active surface.

**Proposal:** Test a compact final inscription first. Consider an explicit listen-focused view only if needed. Preserve registered HTML, selectable text, essential controls, navigation, accessibility, and white margins.

### 4.5 Processing-clock timing is not necessarily audible timing

Current note evaluation follows `AudioContext.currentTime`. Shared scheduling prevents stem drift, but does not establish that the visual onset matches the sound reaching the listener.

**Proposal:** Investigate output-aware evaluation and feature alignment, with a guarded fallback. Retain one shared start and loop; never introduce independent MIDI timers or stem rescheduling.

### 4.6 Beam geometry remains coupled to core radiance

The beam vertex shader uses `uEmission` for length, while the sculpture assigns that uniform bass-reactive core radiance. Opacity and width are separately restrained, but length still follows the core response.

**Proposal:** Separate beam geometry/reveal control from core radiance. Keep the approved internal energy intensity rather than weakening the core to quiet the projector.

## 5. Creative direction and invariants

### Stone is the instrument. The pond remembers it.

| Stem | Primary gesture | Possible supporting consequence |
| --- | --- | --- |
| Pads | Broad sustained pitch-mapped relief, retaining six voice identities. | Slow organization of a sparse near-water field where visible. |
| Short lead | Quick local attacks on the same pitch-mapped stone instrument. | Brief disturbances followed by readable settling. |
| Bass | Existing five ordered masonry resonance regions in the opened mechanism. | Broad low-pressure reflection response; bounded top-joint pressure after reassembly is a prototype, not a commitment. |
| Long lead | Directional traveling force across upper paving. | Restrained trailing response, not a competing second wave system. |

### Preserve

- Original first-two-section cameras, pyramid rotation, and left/right projection switch.
- Matte chipped masonry, missing blocks, uneven top, stable stone IDs, and rigid shapes.
- Shared pads/sequence pitch locations and all six independent pads MIDI voices.
- Five separate bass pitch regions and bounded overlapping-note mixtures, subject to replacement-audio verification.
- Reversible scroll-driven tip opening/reassembly, clearance preparation, and reveal gates.
- Approved recessed green core intensity and restrained projector/connector hierarchy.
- Native/reverse scrolling, deep links, synchronized projected HTML, real links, and motion controls.
- Genuine mirrored-camera reflection and reflection-only floor; empty floor remains unchanged.
- Independent randomized pond-drop bursts and final white margins.
- Explicit playback consent, silent entry, continuous synchronized stems, cumulative/reverse mixing, 25% channel gains, smooth fades, and clipping headroom.
- Exact inactive/rest restoration and existing hidden-page, interruption, and context-loss safeguards.

### Reject by default

Rainbow spectrum bars, floating rings/halos, neon masonry contours, camera shake, generic random brick jitter, luminous pond boundaries, a dense magical particle carpet, beat-reactive typography, and making every system pulse together.

### Particle proposal

Prototype sparse mineral/silt-like motes immediately above the pond, not a visible floor material. Their motion should reveal bounded forces and recovery, with near-still intervals between events. Use real world-space positions, depth occlusion, and deterministic seeds; protect text and white margins.

Do not spend GPU work on particles outside the composition. Fade or disable them when the pond is not meaningfully visible, especially in the overhead finale. A luminous particle floor or increased reflected core emission would require a separate art-direction decision.

## 6. Implementation phases

### Phase 0 — Re-establish the audio baseline

**Priority:** Required before calibrating new motion.

**Files:** `src/scripts/audio-mixer.js`, `src/scripts/audio-features.js`, `src/scripts/midi-player.js`; inspect corresponding audio/MIDI assets.

- [x] Confirm the replacement's common decoded duration with normal startup safeguards; retain note alignment per the user's unchanged-score clarification.
- [x] Preserve existing bass RMS/attack/release calibration as requested; retain normal peak scanning and combined headroom calculation.
- [x] Inspect representative score phases, rests, release tails, loop transitions, and browser compositions; record geometry-sweep evidence below.
- [x] Implement output-aware timing with capability checks, valid timestamp handling, pause/reset behavior, and safe context-clock fallback.
- [x] Align measured stem/gain features through a bounded history rather than shifting MIDI alone.

**Acceptance:** One shared audio start/loop; no independent score stretching, invented notes, changed consent behavior, or raised channel-gain ceiling. Document measurements and distinguish direct listening from scheduling inspection.

### Phase 1 — Make the existing instrument convincing

**Priority:** Highest creative impact. No new particles yet.

**Files:** `src/scripts/stone-surface.js`, `src/scripts/stone-motion.js`, `src/scripts/sculpture.js`, `src/scripts/sketch.js`, relevant beam shaders.

- [x] Separate audibility from chapter emphasis without applying gain attenuation twice.
- [x] Retain pads beneath sequence instead of fading pads to zero.
- [x] Compose bounded pads, sequence, and long-lead contributions in the finale.
- [x] Implement restrained actual-bass pressure in nonnegative top-joint strain after reassembly; no added vertical stroke or fake kick notes.
- [x] Refine first-two-view patch shape and sequence attack/settling without changing cameras or raising the lift ceiling.
- [x] Keep stable pitch/voice identities, rigid geometry, safe combined displacement bounds, and exact zero-input restoration.
- [x] Keep material, depth, reflection, and CPU-anchor sampling consistent.
- [x] Decouple beam geometry from core radiance without changing approved core brightness.

**Acceptance:** Short attacks are identifiable, sustained pads remain perceptible, and the finale reads as an ensemble. Approved cameras and tip reassembly remain unchanged. Verify clearance for combined fields rather than assuming individual safe fields are safe when added.

**Review gate:** Compare representative musical moments before/after with identical camera, audio phase, and viewport. Do not proceed to environmental additions until the primary instrument is convincing.

### Phase 2 — Prototype the pond response

**Priority:** Secondary; conditional on Phase 1 review.

**Implemented file:** `src/scripts/pond-field.js`.
**Integration:** `src/scripts/sculpture.js`, relevant pond shaders; reuse existing feature data.

- [x] Add one bounded `Three.Points` system, seeded data, and audio-clock note ages.
- [x] Register the local field to the pyramid's world-space X/Z position and yaw while keeping motes just above the fixed pond, not lifted with the sculpture.
- [x] Derive sparse displacement/recovery from musical fields, not a generic volume multiplier.
- [x] Add musical reflection distortion only within reflected ink, composing with unchanged independent drops and optical bounds.
- [x] Preserve baseline haze, finite-value safeguards, and the unchanged empty-floor mask.
- [x] Exclude motes from the mirrored pass and mask projected panels, header/footer, and margin safe areas.
- [x] Cull near-water bounds against the camera, fade before the finale, and take a zero-work musical shader branch during silence.
- [x] Avoid a running fluid simulation, event queues, extra render targets, or additional fullscreen passes.

**Acceptance:** The environment feels connected but remains subordinate. Turning particles off does not remove the primary musical meaning. Independent drops retain their original behavior, and silence/motion-off restores the baseline.

**Review gate:** Compare particles off/on. Keep them only if they improve hierarchy and perceived causality, not merely activity. Counts and detail tiers are determined by profiling, not an arbitrary particle target.

### Phase 3 — Compose phrases, hierarchy, and the finale

**Priority:** After core gestures and the pond prototype are evaluated.

**Files:** A small choreography module if justified; `src/scripts/atmosphere.js`, `src/scripts/projections.js`, `src/index.html`, and styles as needed.

- [x] Derive four-bar phrase boundaries/density from MIDI through the actual tempo map; retain the common audio-loop boundary.
- [x] Shape patch breadth gently within phrases without overriding note identity, onset timing, or audible rests.
- [x] Keep the sparse long-lead ending honest; no synthetic activity fills its rests.
- [x] Retain separate scroll-driven composition and audio-driven local motion.
- [x] Keep guides/frames quiet; no beat-reactive letters or meters.
- [x] Compact final copy/frame placement to expose more paving while preserving registration and controls; inspect wide/compact layouts.
- [x] Correct the user-reported finale reading regression: hold the DOM above the shared maximum stone lift, never at the instantaneous peak height. Keep only stone-bound connector endpoints musical.
- [x] Evaluate the need for a listen-focused UI: omitted because the compact inscription exposes the instrument without another mode.

**Acceptance:** A stationary chapter develops musically, not just through endless ambient drift. The full composition is understandable without explanatory cues. Returning or reversing scroll does not replay queued transients or restart stems.

### Phase 4 — Performance and release polish

**Priority:** Required before calling the refinement production-ready.

**Files:** `src/scripts/app.js`, affected rendering/lifecycle modules, and documentation.

- [ ] Complete hardware profiling of reflection, shadow refresh, postprocessing, particles, and field evaluation; local rendering comparisons are recorded below.
- [ ] Agree on target devices and frame-pacing budgets from measured baseline performance.
- [x] Provide compact decorative density (192 vs 576 motes), camera culling, a zero-input shader branch, and no extra fullscreen pass; musical identities/timing are unchanged.
- [x] Add conservative sustained-frame-pressure tiers for optional pond/projection particles and dust, with warmup/reset handling and slower recovery. Preserve text, stone choreography, reflection fields, and audio at every tier.
- [ ] Validate with `yarn start`, Safari STP, other major browsers, and physical phones.
- [ ] Directly listen for startup clicks, loop discontinuities, and audiovisual alignment on speakers and headphones.
- [x] Check forward/reverse navigation, deep links, mute, silent entry, motion-off, hidden-tab behavior, and WebGL context loss/restoration in Safari STP.
- [x] Exercise the reduced-motion preference-change handler and explicit user override locally; confirm fixed finale text and zero reactive geometry under reduced motion.
- [ ] Validate real OS reduced-motion preferences and audio-device interruptions on the final target devices; the local preference-handler check used a controlled browser fixture, not changed system settings.
- [x] Run `git diff --check` and `yarn build --no-cache`; inspect bundled stem references and output.
- [x] Update `README.md` and this plan to distinguish implemented work, omitted experiments, and remaining uncertainties.

**Acceptance:** Stable frame pacing on agreed devices, no new clearance failures or synchronization regressions, unchanged floor/white margins, usable accessibility/fallbacks, and successful production output. No unit tests are required for this work; use browser, audio, visual, and build validation.

## 7. Review protocol and decision boundaries

For each phase, retain matched before/after observations covering dense passages, isolated attacks, held notes, rests, loop transitions, and forward/reverse chapter changes. Evaluate wide and compact compositions separately.

Ask at each review:

1. Can a viewer recognize the featured musical gesture without the listening cue?
2. Are earlier audible stems represented without obscuring the featured stem?
3. Does an environmental response have a perceivable cause, or is it decoration?
4. Does charcoal stone still feel rigid, heavy, chipped, and matte?
5. Are projected text, navigation, reflection, and white space still readable?
6. Is inactive restoration exact, with no residual glow, motion, or floor tint?
7. Is the improvement worth its measured rendering and maintenance cost?

Decision points requiring a visual review, not automatic implementation:

- Bass-pressure choreography on the reassembled top.
- Whether pond particles improve the experience enough to retain.
- Any listen-focused UI or substantial final-copy change.
- Any additional render target, simulation, emissive layer, or changed floor appearance.

## 8. Next review

Review the implemented choreography and restrained pond response in the running experience. Remaining release work is physical-device/cross-browser profiling and direct listening, not adding more effects by default. The original Phase 0/1-only recommendation was superseded by the user's authorization to implement the complete refinement.

Do not equate completion with adding every proposed effect. The goal is coherent musical perception, and a simpler result that achieves it is preferable.

## 9. Implementation record and validation evidence

### Implemented

- Product identity is **Abstract** throughout authored UI, metadata, accessibility labels, and documentation.
- Earlier audible stems retain quieter top-stone responses; the finale combines pads, sequence, traveling lead fronts, and restrained bass strain.
- Positive combined lift has one `.48` ceiling; lead-only lift remains below `.17`. Lateral fields integrate nonnegative axis-separable strain.
- Six pad tracks, stable pitch locations, the five opened-tip bass regions, original cameras, tip reassembly, core-radiance cap, audio gains, and independent pond drops are retained.
- Valid output timestamps drive visual note evaluation; a fixed 64-sample/channel history at most 60 Hz aligns measured strength and gains, with a live endpoint for high-refresh fades.
- One non-emissive mote draw and a shared analytic reflection field replace the idea of a dense particle floor. No new render target, simulation, audio source, or fullscreen pass was added.
- The final inscription is smaller and shorter. A separate listen mode and reactive typography were omitted.
- Following user feedback, its reading plane is now fixed at pyramid-local **4.07**, including clearance above the **.48** shared lift ceiling. It remains scene-registered but never follows a musical peak; connector endpoints continue tracking stones.
- Optional decoration scales through full/half/hidden tiers under sustained frame pressure. This is release polish, not permission to change approved cameras, resolution, core brightness, or musical timing.

### Local evidence

- Safari decoded all four current stems to **2,143,256 stereo frames at 48 kHz**, each **44.65116666666667 seconds**. Existing peak/headroom safeguards passed; no bass calibration or audio-file edit was made.
- A one-off geometry sweep evaluated **2,490 configurations**: two field resolutions, five chapter/transition positions, and the complete score loop at `.18`-second intervals, including prior-cycle tails and full-strength stress input.
- Across **310 top stones / 2,367 baseline-separated neighbor pairs**, the sweep found **zero new overlaps** and **zero ordering failures**. Maximum combined lift was **.4755681** and maximum per-axis lateral travel **.0886738** world units. Zero input restored all field texels exactly.
- Pads retained six track counts: **16, 2, 6, 15, 7, 2**. Four-bar metadata retained eight phrases for pads/sequence/bass and seven for the shorter lead score; these are not independent loop lengths.
- Live short-lead observation captured simultaneous pad/sequence activity in **66 of 90 sampled frames**, with unchanged source objects. A shorter finale observation confirmed supporting pad/sequence activity alongside lead waves; Safari visibility suspension limited that run, so it is not a full timing benchmark.
- A 120-frame wide pads observation showed approximately **17 ms median / 21 ms p95** intervals. This is local desktop evidence only, not a phone-performance claim or guaranteed frame budget.
- A warm compact rendering comparison observed **52 draw calls** with the musical pond versus **51 without it**. Removing reflection reduced that sample to 39 calls, as did removing bloom. Timing resolution was too coarse for reliable sub-millisecond component claims; complete hardware profiling remains open.
- Forward/reverse traversal kept the same four source objects and the original cumulative gain targets. Compact panels stayed inside header/footer safe areas; the finale retained its closed tip and disabled pond field.
- Before the readability correction, motion-off restored zero surface texels, top anchor height **3.55**, beam width **1**, no motes/music packets/drops, and exact closed-tip rest transforms while audio continued running. The corrected reading anchor now stays permanently at **4.03** (plane **4.07**); stone-bound anchors still restore to their original rest positions.
- Muting cleared active score output and musical geometry without replacing sources. Silent entry created no sources and preserved deep-linked chapter interactivity.
- Forced WebGL loss cleared note output and disabled projections; restoration re-enabled projections without replacing audio sources. Local shader/GL inspection reported no rendering errors.
- Production build and whitespace checks passed. No unit-test suite was introduced. Temporary scene-inspection hooks are removed before delivery.

### Finale correction and continued polish

- A controlled browser sweep covered **1,117 samples / two common score loops per layout** with full-strength feature input, including rests, attacks, release tails, and wraparound. Wide and compact layouts each produced **exactly one text transform** while peak stone height ranged from zero to approximately **.421 / .419**. Wide connector heights changed in 930 sample steps; the reading plane did not.
- The compact **390×740** viewport retained an interactive finale rectangle within all safe margins, approximately **262×218** pixels at **(64, 254)**. Visual inspection confirmed the complete inscription over the paving.
- A subsequent live compact playback observation captured **78 rendered frames** before Safari visibility suspension. The text again held one transform while peak stone height varied **.156–.203**; median/p95 intervals were approximately **17 ms** within that short sample. This is not a full-loop acoustic test or a phone benchmark.
- Controlled preference-change/override inspection confirmed reduced motion disables continuous rendering and reactive geometry without shifting the final text or replacing audio sources. Real OS/device preference validation remains open.
- A one-off frame-pressure exercise left normal 60 Hz input unchanged, ignored a pause through warmup, reduced sustained 20 Hz input to half then hidden decoration, and exercised slow recovery. No unit-test suite or production diagnostics UI was added.
- Controlled browser tier comparison preserved identical text matrices, stone heights, pad field uniforms, and source objects. Wide pond counts changed **576 → 288 → 0**, projection particles **960 → 480 → 0**, and dust **180 → 90 → 0**. At zero motes, the musical reflection field remained active and unchanged. Compact budgets scale **192 → 96 → 0**, **320 → 160 → 0**, and **72 → 36 → 0**. Shader/GL inspection reported no errors.
- User audio replacements/backups encountered during this pass were left untouched; bass calibration and the four authored mixer URLs are unchanged.

### Still unverified

Physical-phone performance, comprehensive non-Safari behavior, acoustic audiovisual alignment across output devices, real hardware interruptions, and conclusive direct listening for the intermittent startup click. Do not describe these as solved or infer a new award-style score from the implementation.

## 10. User-directed face layers and preset credits

- Each section now credits **Massive X** and its preset. Pad voice order was clarified by the user as **Lola, Cathedralium, Bohrium, Claws, Anxious Flutter, Mumble Grow**. Short lead: **Becker**; bass: **Art Dual**; long lead: **The End**.
- The three connected masonry faces now retain permanent pads / sequence / bass ownership and cumulative audibility. The existing cameras and top-paving instrument are preserved. Prior faces keep responding even when temporarily hidden by perspective; no new camera trick is used to expose all three sides of a convex object simultaneously.
- Six ordered pad bands respond independently, sequence adds short localized pressure crests, and bass adds broad pitch-selected course pressure. One shared small RGB face field moves existing rigid stones outward, not surface colours or added indicators.
- Only **758 seated casing stones** are eligible; the prepared tip paths and top two courses have zero side weights. CPU guides, material/depth shaders, and genuine reflection sample the same field. Per-axis travel is bounded below **.10**, with no vertical displacement or added draw/pass.
- A combined casing/paving stress sweep evaluated **2,490 configurations**, two field resolutions, five chapter/transition positions, and a full loop including prior-cycle tails. Across **50,065 baseline-separated neighbor pairs**, there were **zero new overlaps**. Peak side field was **.0943074**, peak top lift **.4755681**, and zero input restored both fields exactly.
- Safari shader/GL inspection reported no errors. Forward/reverse chapter traversal retained source objects and gain targets. Compact preset typography was visually inspected; the pad panel fits above the footer after removing its redundant listening cue. Bass spacing was tightened to accommodate credits without changing the camera.
- Per the user's final gain correction, only the **long lead** now targets **20%**, while pads, short lead, and bass remain **25%**. Peak/headroom calculation uses the per-channel limits. Fades, common loop, explicit consent, continuously running sources, and quarter-gain-relative visual attenuation are preserved. Browser inspection confirmed final chapter targets **[.25, .25, .25, .20]**.
- Audio replacements/backups remain user-owned and untouched. Temporary inspection hooks are removed. Broader physical-device and acoustic checks remain open; this pass does not claim they are complete.

## 11. User-reported startup burst

- The user committed the two-part exports under the original `pads.mp3`, `sequence.mp3`, `bass.mp3`, and `lead.mp3` names. Preserve those filenames, the exact midpoint loop, existing MIDI repetition, and `.25/.25/.25/.20` gain limits.
- Found a resume path that could wake with the previous master gain before applying a new fade. The audible route now stays disconnected through a literal-zero buffer warm-up; gains are reset again on the running clock before the route reconnects. A permanently zero-gain sink keeps existing source clocks advancing. Wake-up failures/timeouts stay silent and permit retry.
- The user reported the transient persisted after the first routing change; its acoustic cause is still unconfirmed. Added a second, independent safeguard to the decoded intro: 20 ms of zero samples followed by a smooth rise to unchanged PCM at 180 ms, plus interactive rather than playback latency. No supplied audio file or repeating-half sample is edited; original peaks still determine conservative headroom.
- One-off live Safari AudioWorklet capture covered 48,000 stereo frames: zero output before the shared source start and through the opening 20 ms; maximum difference from the expected guarded PCM and gain envelopes was approximately **1.03e-8**. This is browser-engine evidence, not a physical output-device recording.
- Comparing all four guarded buffers with fresh decodes found zero sampled differences after 180 ms and zero differences across every repeating-half sample. Resume inspection retained source identities and `startedAt`; forced warm-up failure left output disconnected with zero master gain, and retry succeeded. Cumulative forward/reverse gains and mute/unmute remained intact.
- User listening confirmation on a fresh page load remains required. Do not describe the reported acoustic artifact as conclusively eliminated based only on these captures. No unit tests were introduced; temporary inspection hooks are removed before delivery.

## 12. User-directed living seam labyrinth

- Direction: sparse green presences travel through the actual gaps between moving casing stones, leaving fading emerald trails and occasional dim forks. Keep the porous stone matte; do not add permanent neon outlines, floating particles, or a global surface tint.
- Research: [Codrops Geometry Painter / molten fissures and bioluminescence](https://tympanus.net/codrops/2026/08/11/exploring-procedural-geometry-with-three-js-and-webgpu/), [Nervous System Xylem + Hyphae](https://n-e-r-v-o-u-s.com/projects/networks/networks-sketches), [Memo Akten Simple Harmonic Motion](https://memo.tv/projects/2019/shm), and [ILM Tron: Ares visual development](https://www.ilm.com/inside-the-ilm-art-department-tron-ares). Borrow traveling fronts, biological branching and compositional restraint, not their full scene architectures or assets.
- Implemented a deterministic graph of **2,140 physical joint segments**, with **698 / 700 / 742** per face and **758 eligible stones**. Surviving neighboring cells/course overlaps define the corridors; missing stones are not bridged. Tip paths and top two courses remain excluded. Face-owned routes connect within each face rather than transferring instruments at a corner.
- Prepared **251 MIDI-note routes** and optional forks once at startup. A one-off route inspection found **zero empty routes, zero disconnected transitions, zero differences on regeneration**, with all **six pad tracks** represented. Pads explore slowly, sequence packets move faster with short echoes, bass fronts favor courses. Progress is analytic from audible note age, not accumulated frame delta or a new scheduler.
- One depth-tested recessed ribbon batch adds **8,560 vertices / 4,280 triangles**. CPU emitter positions reuse the exact side displacement sampler and exterior-plane rotation; HDR heads and bounded wakes use fixed-storage occupancy. A small per-stone edge atlas adds localized, subdued bounced-light approximation, not broad stone emission. The material/depth motion, side pressure, tip choreography, core cap, camera poses, DOM registration and audio implementation are otherwise untouched.
- Local compact render comparison measured **51 draws without / 53 with** the batch: one added main draw and one genuine mirrored-camera draw. No new fullscreen pass, render target, light, shadow caster, or audio source. Mobile shortens trails; existing frame-pressure tiers reduce optional forks while primary paths and geometry remain unchanged.
- A wide sweep covered **896 configurations / two score periods** across settled chapters; a compact **390×740** sweep covered **784 configurations / two periods** across seven settled/transition positions, explicitly evaluating the seam field even when Safari suspended the page. No invalid occupancy/position values were found. Heads/wakes/edge spill stayed within **1.25 / .9 / 1**. Finale DOM produced exactly one transform per layout. Re-evaluating identical note phases was deterministic, including a zero-difference repeated-period comparison.
- Safari main/depth/reflection shaders compiled with GL error zero. Controlled mobile screenshot inspection retained the raised first-two panels and footer clearance; short-lead panel gap was about **86.7 px** at 390×740. Silent entry had no music sources or seam energy. Live cumulative/reverse navigation retained four source objects, `startedAt`, midpoint boundaries, and **.25/.25/.25/.20** targets; mute/motion-off cleared the seam field and edge spill exactly.
- The user changed `bass.mp3` and supplied `kick.mp3` during this pass, triggering preview reload. Both remain untouched; kick is not automatically wired into playback. The current bass still reports **4,286,512 valid frames at 48 kHz**, and browser preparation retained the common **89.30233333333334-second** duration and exact midpoint. Bass calibration and MIDI are unchanged.
- Production build/whitespace checks and removal of temporary inspection hooks are required before delivery. No unit-test suite was introduced. Physical-phone performance, broader-browser behavior, and direct acoustic/device-interruption checks remain open.

## 13. Separate kick, finale paths, and travel refinement

- Added the supplied `kick.mp3` as a fifth synchronized stem assigned to chapter 3 alongside bass, retained under the cumulative finale mix. All five start/loop/mute/resume together; kick has no MIDI URL or fabricated score. The loader reports the actual five-channel count. Supplied MP3s remain untouched.
- Gains: pads / short lead / bass **.25**, long lead / kick **.20**. All five decoded peaks participate in the conservative bound. Safari selected **.8341179681611262** master headroom, with **.9** worst-case summed peak ceiling; measured settled mix PCM peaks across chapters were **.183062 / .245872 / .374163 / .377288**. No compressor or normalization alters the reverberant dynamics. All five have **4,286,512 stereo frames at 48 kHz** and retain the original **44.65116666666667** midpoint / **89.30233333333334** end.
- User clarified that the kick is heavily low-passed with substantial reverb and should pulse smoothly. Removed provisional spectral-flux/onset detection. Its isolated **20–180 Hz RMS level**, normalized over `.008–.30` and smoothed with **45 ms attack / 180 ms release**, directly drives the tip's safe convex mode blend, shared outward breath and approved radiance bounds. Bass MIDI/volume never drives the tip; kick never drives bass side paths. Existing scroll opening/reassembly and restrained projector remain intact.
- Extended the physical seam graph onto **843 top-paving joints / 310 crown stones** in a single **607-node** connected component. The existing long lead supplies **17 routes**, activated only for chapter 4 (`progress >= 2.5`) and scaled by its existing overhead emphasis and actual audibility. Crown ribbons sample the same bilinear stone translations and authored heights, remain recessed, and share the side batch, reflection and localized edge-spill shader. Total: **2,983 segments / 11,932 vertices / 5,966 triangles / 268 note routes**. Finale text stays fixed; no camera or audio-loop changes.
- User requested less crown lift in chapters 1/2 and more exposed side joints. Crown Y relief is now **.75×** at progress 0/1, easing back to unchanged full relief by progress 2. Lateral strain, finale lead lift and `.48` shared ceiling are unchanged. Side outward travel increased **.10 → .12** per-axis cap; no added Y shift, rotation, tip motion or top-course side weights.
- One-off Node wide/compact two-period sweep: **1,024 configurations / 5,366 baseline-separated nearby casing pairs**, **zero new overlaps**, sampled maximum casing shift **.11095990594** per axis. Sampled early/finale relief maxima were **.354494 / .392262**. Top connectivity inspection found zero missing-neighbor or invalid-length segments.
- Safari live forward/reverse checks retained all five source objects, common `startedAt`, identical midpoint/end loop boundaries, and correct cumulative targets. Mute cleared the full seam atlas and kick level. Offline analysis of six seconds of the supplied repeating kick showed nonzero smooth volume crests with its attack-trigger feature always exactly zero. Physical listening and phone performance remain user-side checks.
- Final Safari isolation audit confirmed: varying bass MIDI/level did not change tip positions or radiance, kick did change both, and varying kick did not change the side seam atlas. Forced long-lead activity still produced zero crown occupancy through progress **2.49**, with nonzero occupancy at **2.5 / 3**. All **268 routes** were nonempty.
- Finale sweeps covered **298 wide / 224 compact configurations** over two score periods, with zero invalid positions/occupancy and one DOM transform per layout. Sampled crown ribbons remained below **3.891980**, against the fixed **4.03** reading anchor. Repeated-phase seam occupancy matched exactly. Desktop **1380×900** and compact **390×740** screenshots retained the matte stone, sparse green routes, fixed text and white margins. First-two compact panel/footer gaps remained **63.2 / 86.7 px**. Main/reflection shaders compiled with GL error zero; disabled seam emission cleared both atlases. Temporary inspection hooks removed before delivery.

## 14. Suspended crown gravity well

- User requested a new chapter-4 design: rigid middle bricks descend like a bird's-eye gravity well, revealing contained, wildly swirling green-white magic. Preserve the brick surface and musical joint travelers, rather than replacing the crown with a smooth funnel or black circular sprite.
- Implemented a reversible quintic descent at progress **2.52–3**, with **1.72** maximum sink and radial support **.32–1.50**. The existing CPU/GPU bilinear texture carries the entire rigid translation; original crown dimensions/rotations, lateral strain, outer silhouette, camera and first-three-section poses remain. Musical lift is attenuated toward the well centre, with the original positive ceiling retained at the rim.
- Buried support fragments use a matching **color/depth/reflection clearance volume**. The crown is never clipped. This opens real depth below the stepped paving instead of placing a fake hole on a still-solid lid. A quiet crown-corner check required about **.56436** clearance; full-strength two-period MIDI sampling across both texture tiers required **.64258**. The cutaway reserves `.075` tile seating plus `.70 × reveal` stepped clearance. This is a rendering cutaway, not a physical excavation/rigid-body simulation.
- Added a true 3D **.64-radius** core at **Y 2.48**: counter-rotating turbulent emerald threads and white fire, shader-deformed spherical folds, a shared **500-triangle** geometry with one optional outer shell, and one short-range unshadowed green spill light. Existing HDR bloom/finite-value pipeline and mirrored camera handle it; no new fullscreen pass, target, explosion timer, kick event or audio channel. Actual long-lead level adds bounded pressure. Motion-off gives a static phase; frame-pressure degradation hides only the optional shell.
- Crown path geometry now has three folded spans per existing edge, joining shared highest-lip corner anchors through actual recessed/vertical joints. Graph topology and **268 routes** remain unchanged. The one shared batch now has **18,676 vertices / 9,338 triangles**. CPU displacement values are cached per crown stone, with no per-frame graph/geometry allocation. Compact measured corner joins differed from their shared anchors by at most **1.2e-7** world units.
- Redesigned only the finale's projected typography into title-above / credits-and-return-below rim captions around a transparent viewing window. The semantic title/preset/link and static fallback remain. Reading anchor **4.03**, DOM plane **4.07**, native snap stops, approved camera and white margins are preserved; typography never follows sphere or musical peaks.
- One-off original-vs-new paving comparison: **2,048 configurations** across eight pre-well positions, both layouts, and two score periods; **maximum sample difference zero** through progress **2.52**. Quiet forward/reverse profile sweep: **242 configurations**, zero invalid values, exact return to zero, deterministic final restoration, lowest sampled crown top **1.81345**.
- Safari compact finale sweep: **224 configurations / two score periods**, zero invalid seam/position values, exactly one DOM transform, exact restoration of both paving and folded ribbons after reversal, lowest sampled musical crown top **1.81370**. Shader compilation and GL error checks passed. At **390×702**, the refined rim panel remained within the composition with about **169 px** footer clearance. Screenshot inspection retained the stone steps, visible green-white core, sparse joint light, reflection-only floor and white margins.
- Live five-stem checks retained all source objects, common start and **44.65116666666667 / 89.30233333333334** loop boundaries, plus `.25/.25/.25/.20/.20` gain targets. Motion-off retained the well/core, froze chaos, and suppressed musical seams. Reversing to chapter 3 closed the well/clearance volume and hid the sphere without restarting audio. Audio files, mixer/startup protection and kick-only tip pulses are untouched.
- Production build, whitespace validation and removal of temporary inspection hooks required before delivery. No unit-test suite introduced. Broader-browser, physical-phone performance and physical listening checks remain open.

### Additional steering: nearly invisible lift in chapters 1–3

- User requested a significant further reduction, now covering all first three chapters rather than only chapters 1/2. Musical Y relief is **.10× original strength** through progress **2.5**, with an early ceiling below **.048**. Full strength eases back only as the overhead finale arrives at **2.5–3**. Gravity-well descent, long-lead rim motion at chapter 4, side travel, lateral strain and note identity are not reduced.
- One-off **1,792-configuration** wide/compact two-period comparison against the preceding version: first-three-section full-strength-input lift peaks **.04755180 / .04705545 / .04073428**, **zero lateral-field differences**, and **zero finale-field differences**. The earlier 2,048-configuration exact pre-well match preceded this intentional minimal-lift change; it is not a claim that the newly requested musical Y reduction leaves those chapters numerically unchanged.

### Additional steering: early crown light, quiet finale, proud joint lips

- Added **127 prepared crown journeys** for the existing 48 pad / 79 sequence notes. Section 1 has slow six-voice top explorers; section 2 adds the existing faster short-lead packets and real analysed echoes while pads remain. These use the same actual top graph, note clocks, strength and audibility as the side routes, with no new audio channel, beat, draw batch or timer. Early roof light fades over **1.12–1.5** so section 3 retains its bass/kick focus.
- User then explicitly disabled magical pathfinding in chapter 4. All side/crown head and trail occupancy and localized edge spill now fade over **2.10–2.5** and are exactly zero from **2.5 onward**. The gravity well, green-white core, musical stone displacement and cumulative music remain. Previously prepared long-lead seam journeys are retained but never rendered in chapter 4.
- User requested a slight outward shift for oblique-camera legibility. Both casing ribbons and shared crown lip/corner anchors now use **+.0025** outward offset instead of **−.004** recession (**.0065** net nudge). Widths, graph registration, RGB energy, bloom strength and depth testing are unchanged; solid stones still occlude unrelated paths. Occupancy is sparse, never a permanent grid or whole-stone glow.

### Additional steering: small lead-reactive black hole

- Replaced the turbulent green-white surface with an **opaque, depth-writing black sphere**, a thin green/bright-white photon rim and a depth-tested additive atmosphere. Research references: [Eric Bruneton's beam-traced black holes](https://ebruneton.github.io/black_hole_shader/), [view-dependent rim lighting](https://threejsroadmap.com/blog/rim-lighting-shader), and [Three.js atmospheric glow discussion](https://discourse.threejs.org/t/how-to-create-an-atmospheric-glow-effect-on-surface-of-globe-sphere/32852). This implementation is an artistic thin-shell optical-path/Fresnel approximation, not relativistic lensing. Normal/view vectors are evaluated in view space for both main and mirrored cameras; the spherical silhouette has no vertex turbulence.
- User requested more movement tied to lead audio. The existing isolated, output-aware lead RMS envelope drives **0–22%** radius expansion, rim thickness/radiance, **10–28 rad/s** continuous angular flow and gentle local spill. Measured lead brightness subtly colors the green-white edge and widens the shell. No MIDI trigger, synthetic beat, kick/bass response or audio-routing change. Analytic shutter integration plus pixel derivatives soften the fast streaks. Motion-off resets phase/size/pressure to a static quiet state; mute leaves only ambient rotation.
- User requested a smaller sphere to avoid bricks. Radius reduced **.64 → .43** (~33%); maximum lead swell is **.5246**, and the maximum atmosphere radius is **.5539776**. A **4,466-configuration** two-period wide/compact sweep with full-strength musical input and all **310 crown bricks** found **zero overlaps** against conservative oriented boxes in the settled finale, minimum sampled clearance **.03026887**. An initial .48-radius candidate did not have sufficient clearance and was reduced further before delivery.
- Shared smooth-sphere geometry has **4,992 wide / 1,840 compact triangles** per mesh; the optional atmosphere alone may disappear under frame pressure. No extra fullscreen pass, render target or shadow light. Safari checks confirmed lead-only size response, static motion-off, reverse closure, zero finale paths and GL error zero. Screenshots at **1380×862 / 390×702** retained small black center, narrow green-white rim, readable stationary captions and the stepped well. Physical-phone performance, actual listening and broader-browser visuals remain open.

## 15. Grazing-angle seam polish and green well atmosphere

- User confirmed deployed playback now works after redeployment. Earlier release inspection found successful HTTP loads but mismatched decoded lengths: pads/lead **44.651 s**, other stems **89.302 s**, triggering the deliberate shared-duration safeguard. Current local exports retain the common full duration. No mixer safeguard or audio file was changed to conceal the mismatch.
- User requested richer postprocessing and more visible paths on angled faces, especially chapter-2 crown joints. Found a thin planar emitter with poor grazing-angle coverage and a bloom blend suppressing dark-stone glow by up to 90%. Added crossed **.018 crown / .014 side** light skins to the existing batch, sharing real musical occupancy and ordinary depth tests. Secondary skins emit at **62%** strength; bounded **1–1.8×** view-angle compensation and stronger HDR heads/wakes improve coverage without a permanent grid, disabled occlusion or raised brick displacement.
- Tight-scale HDR bloom weights now **[1, .82, .40, .14, .04]**, radius **.18**, early baseline strength **.32** (finale baseline remains **.18**). Darkest stone retains **24%**, rather than 10%, of the bounded chromatic bloom veil. Paper stays below extraction threshold; exposure, approved cameras, tip/projector motion and the nearly invisible chapter-1–3 lift remain untouched. Edge spill stays occupied/local with **.020** reach. All paths remain exactly off from progress **2.5**.
- One batch now has **37,352 vertices / 18,676 triangles**, still one main + one mirrored draw while active, with no extra seam pass/target/light. A **640-configuration** two-period wide/compact sweep found zero invalid geometry, unchanged **1.25** head occupancy ceiling and zero finale occupancy/spill leaks. An isolated crown-only chapter-2 GPU comparison at **1024×626** gained **332 pixels** above a two-value green difference from the crossed skin alone. No screenshot review or hardware performance claim is inferred from that pixel comparison.
- User clarified that the green black-hole illumination/fog belongs inside **section 4's well**, not section 2. Increased the existing short-range emerald spill light (no new light/shadow pass) and added a bounded depth-terminated scattering volume, integrated into the existing finite sanitization pass. Both existing composer targets have independent depth textures; the pass reads scene depth from its input while writing the other buffer, avoiding framebuffer feedback. No new fullscreen pass, scene render, render target or simulation.
- Haze uses **12 wide / 8 compact / 6 degraded samples**, ellipsoidal cavity bounds, capped optical depth, subtle lead-only pressure and slow ambient density variation. It skips the opaque horizon, reverses with the scroll-authored well, and freezes to an authored quiet state in motion-off; it never re-enables chapter-4 seam light. The main-camera haze is not separately volumetrically rendered in the mirror; the physically rendered green stone illumination still reflects.
- Haze-on/off GPU sampling found **zero outer 20-pixel margin changes** and identical sampled black-hole center RGB. Safari checked distinct depth attachments, shader/GL error zero, compact sampling, the degraded six-step branch, static motion-off and reverse closure at **1024×626 / 390×702**. No sound source was started during the isolated shader checks. Final `yarn build --no-cache` and `git diff --check` passed; the temporary development inspection hook was removed. Physical-device profiling, broader-browser checks and direct acoustic testing remain open.

### Follow-up: remove the visible fog sphere

- User reported a hard-edged extra sphere in the finale haze. Removed the annular density and ellipsoidal skin; fog now uses diffuse Gaussian air, subtle asymmetric drift and generous **.85–1.48 radial / .48–1.04 vertical** feathering. Box bounds **±1.52 X/Z / ±1.08 Y** only bound integration; density is already zero before those boundaries, so they are not a visible fog surface.
- Replaced binary horizon exclusion with a smooth transition and the hard optical-depth clamp with exponential saturation. The intended opaque black hole, photon rim, seam polish, green stone light, existing sample/detail budgets and scene-depth occlusion remain unchanged.
- A one-off **978,285-sample** density sweep found zero invalid/negative samples and exactly zero density on all integration faces. Representative radial density decays from **.1528 at .85** to **.00131 at 1.40**, **.0000163 at 1.47**, and zero by **1.48**, well before the integration limit. Smooth opacity stays below **.4512**. No test suite or inspection hook was added.
- Final production build passed. A normal silent-entry Safari run at **390×702** compiled/rendered the softened finale with GL error zero, no console warnings/errors and no inspection hook. No screenshot review or acoustic test was performed in this correction.

## 16. Seal the well interior and research white orbital fragments

- User reported a narrow view through the finale into the white background/floor. The existing buried-course cutaway can remove the backing beneath otherwise intact narrow crown joints. Added `well-lining.js`: a continuous, matte, depth-writing inner cup **.025 below the shared clearance floor**, with sides rising beneath the outer paving. Crown stones, authored missing blocks, early chapters, seam emission, black-hole size and audio are unchanged. The lining appears only with the well and restores deterministically on reversal; it is not a screen-space black aperture or a plate covering the crown.
- Geometry: **1,513 vertices / 2,952 triangles**, one additional main/mirrored draw while visible, no new light/postprocessing pass. A **41,472-ray** transition sweep with rays offset from exact triangle boundaries found zero misses; mesh topology has only its intentional 72-edge open rim and zero internal holes. Sampled clearance below the shader floor was at least **.0249998**; final backing remained inside the original pyramid envelope with at least **.0195785** cardinal inset. No invalid coordinates or restoration differences were found. Exact-boundary CPU ray tests can produce numerical misses; those were investigated separately rather than treated as physical mesh holes.
- Safari silent-entry GPU checks passed at **390×702 / 1380×862**, with GL error zero. An isolated wide lining-on/off comparison changed **127 cavity pixels** by over 20 RGB values; this is local backing-coverage evidence, not a count of verified white pixels or a hardware performance result. Final production build and whitespace checks passed; the temporary development hook was removed.
- User also requested internet research for **white curved shells/fragments orbiting the black hole**. Closest reference: [NASA's accretion-disk visualization](https://svs.gsfc.nasa.gov/13326/) describes differential rotation stretching bright knots into lanes/arcs; [Three.js Roadmap's black-hole tutorial](https://threejsroadmap.com/blog/raytracing-a-black-hole-with-webgpu) demonstrates elongated rotating structure and softened edges; [Stride's ribbon/trail documentation](https://doc.stride3d.net/4.0/en/manual/particles/ribbons-and-trails.html) describes curved strips connecting particles. These are references, not adopted dependencies or a WebGPU migration.
- **Proposed next effect, not yet implemented:** a small batched/instanced set of tapered white curved ribbon fragments hugging the horizon, with slightly different orbital planes/rates, smoothly fading tails and analytic shutter blur. Keep them broken rather than form a full ring; retain real sphere/stone depth occlusion, lead-only pressure, motion-off and bounded cavity clearance. A dense point cloud, full accretion disk, whole-scene radial blur and full relativistic ray tracing are not recommended for this composition.

### Follow-up: brick-filled interior; no orbiting little stones

- White orbital ribbons were implemented and user-approved. The subsequent interior refinement adds 606 smaller crown bricks replacing 58 selected parents and 2,732 supporting bricks in four courses, sharing existing chipped geometry, matte materials, displacement and depth handling. Earlier chapters restore the original crown; the continuous lining remains gap-sealing backing below the masonry.
- User rejected the little stones rotating alongside the ribbons. Removed that entire debris batch and its per-frame orbital transforms, retaining the stepped interior masonry and white ribbons unchanged. A preliminary clearance test for the rejected debris found possible overlaps; that debris is no longer part of the delivered scene. This is not a new physical-device or acoustic validation.
- Removed the temporary development inspection hook before delivery.

## 17. Codebase cleanup and performance review

- Reviewed all authored JavaScript modules, shaders, HTML and styles. Preserve composition and quality rather than reduce stone counts, shadow/reflection resolution, bloom passes, haze samples or audio safeguards. No dependency changes, media edits, new effects, commits or test suite.
- Removed nine unreferenced shaders from the previous parametric-form/particle/connector implementation. Removed the obsolete bass MIDI-selector class while keeping its collision-prepared spatial support, unused scroll velocity/update loop, unused FFT spectral-flux onset detector and history slot, unused maximum-height tracking/helper, unreachable projection conditionals and unused listening-cue CSS. The MIDI-derived hits, isolated kick RMS, calibrated feature followers and output-aligned history retain their actual consumed outputs.
- Crown fields precompute fixed grid coordinates/well weights, reuse double-precision one-dimensional Gaussian distances and skip unchanged purely structural fields. Side fields skip empty faces/zero-pressure exponentials. An attempted separable side-distance cache measured slower and was discarded; retain only measured/safe changes.
- Active seam poses sample each of **758 casing stones once**, rather than **4,280** edge-neighbour samples; cache fixed stone sine/cosine. Never prepare the **17 long-lead journeys** that cannot render with finale paths disabled (**268 → 251** primary routes; early crown journeys retained). Inactive atlases clear only at the active-to-inactive transition; occupancy, spill and geometry remain exact in the comparison sweep.
- Projected DOM is cached against scroll progress, clearance-dependent tip reveal, viewport/layout and explicit measure/context invalidation. No unchanged per-frame style/ARIA writes. Do not traverse the entire sculpture subtree to update reading planes. Corner/perimeter buffers rebuild only on size change; connector curves upload only if their endpoints change. Pond panel masks skip invisible particles. Accessibility, resize/fonts, reverse navigation, context recovery and pending focus remain supported.
- Share unchanged compact/high stone variants **4–11**, reducing **24 → 16** unique base geometries with identical vertex/normal/UV/color data. Interior brick batches reuse immutable base attributes rather than copy exterior instance buffers. Their **606 refined crown + 2,732 support bricks** and all instance transforms/tones are unchanged. Reuse the procedural texture-normal vector, bounded pond-drop queue and reflection-visibility buffer; tip ray clipping/writes avoid per-ray callbacks/temporary arrays. Retain all original passage/collision safeguards.
- Compose haze view-to-well matrices, camera origin and slow cloud drift on CPU once per frame; the finite pass keeps the same depth-terminated density/integration budget and HDR checks. This changes where frame-constant arithmetic runs, not the haze design. Skip pixel-ratio setters during ordinary same-ratio resize events; existing sizing/context callbacks remain.
- Temporary comparison scripts outside the repository covered **704 wide/compact musical/scroll configurations**, **202 projection/guide configurations**, **200 forward/reverse tip-opening configurations**, **1,500 analyser/history samples**, and a seeded **6,000-frame drop schedule** with a motion pause. Also compared all base geometry tiers, procedural textures, interior matrices/tones and MIDI strengths. **9,612 array comparisons, maximum CPU numeric difference zero**; static well second updates performed no texture upload, stationary cached projections performed zero DOM writes, and unchanged guide endpoints performed no buffer upload.
- Local Node/V8 microbenchmarks: five alternating-order rounds, median of 180 measured calls after warmup. Sampled milliseconds/call: crown **.08786 → .05282**, finale field **.13566 → .09600**, side field **.09451 → .08915**, seams **.66430 → .51091**, opened-tip rays **.37643 → .26595**. These isolate selected kernels, not total GPU/frame cost, acoustic timing or physical-phone performance. Other note configurations/browser engines may differ.
- Safari normal silent entry at **1024×664**, then compact **390×598**: scene ready, sound off, GL error zero and no buffered warnings/errors. A stationary finale MutationObserver observed zero projection mutations. Motion-off and reverse chapter-3/finale navigation retained finite transforms, only the finale panel interactive on return, and GL error zero. No development inspection hook, screenshot review or acoustic test; the temporary page observer was disconnected/removed.
- Review follow-up, not changed in this preservation-focused pass: `stone-motion.js`'s pre-existing side-field interpolation uses the opposite second-row corner order from CPU `SideSurface.sampleFace`. Correcting that would change the current casing displacement and warrants its own geometry check; this pass deliberately preserves that shader baseline. Physical-device/GPU profiling, broader browsers and real audio interruptions/listening remain release gaps.
- Final `yarn build --no-cache` and `git diff --check` passed; `rel/` contains the complete optimized release. No inspection/profiling hook remains in source, and the assistant-created silent inspection tab was closed.

## 18. Preload late-chapter GPU work

- User reports phone scroll stalls, usually entering chapters 3/4, and requests complete preloading. All sculpture objects and procedural textures were already constructed during startup; the gap was **GPU first use**, not late asset downloading. Previous `Sketch.prepare()` compiled only the entry light configuration and rendered only the entry pose. Three.js traverses hidden materials during compilation but gathers only visible lights; tip/well group visibility changes introduce **three / one extra point lights**, producing new masonry/material shader variants. Compilation also used the default canvas color space instead of the scene's actual linear HDR destination. Hidden buffers and chapter projection rigs were not necessarily uploaded by that first frame.
- Prepare all four authored chapter poses behind the opaque loader. Compile against the composer read target with the chapter's real visible lights; temporarily draw renderable leaves without frustum culling, including silent music-only effects. Do not force hidden parent groups or lights on. Real composer draws cover depth/shadows, mirrored-camera reflection, interior bricks, black-hole/ribbons, haze and postprocessing. Restore render target/visibility/culling in `finally`, restore the real entry/deep-link pose, pause the independent-drop clock at consent, and wait for queued GPU commands with an asynchronous WebGL2 fence. Keep loader progress live between chapter preparations and retain existing timeout/static-fallback/consent safeguards. No wheel/touch interception, quality cuts, geometry/media/effect changes or audio autoplay.
- Temporary Safari WebGL instrumentation at **390×596**: the old preparation had **37 programs** at readiness. At progress **1.8**, it created **9 programs / 45 buffer allocations**; at **2.6**, another **9 programs / 76 buffer allocations**; other new projection rigs allocated buffers at 1 and 2.8. These observations reproduce a first-use stall mechanism, not a physical-phone FPS benchmark. New startup prepared **64 programs**. An 11-pose forward/reverse check and a **241-frame continuous 0→3→0 sweep** then recorded **zero compileShader, linkProgram, bufferData, texImage2D or renderbufferStorage calls**, zero GL errors, and finite projected transforms. Routine sub-buffer/field updates still occur, as intended. Readiness retained scroll progress 0, audio not started, animation/drop time 0.
- One-off mocked lifecycle checks outside the repo passed: four preparation/report stages, correct HDR compile target, untouched hidden groups/lights, restored culling/visibility/target/deep link, compilation-failure cleanup, startup expiration, and GPU fence completion/failure/context-loss/expiration cleanup. No unit-test suite added. Physical-phone profiling and listening remain necessary; steady-state costs (moving shadows/reflection, tip-ray work and well-lining normal updates during descent) are not eliminated by preloading. Orientation/layout changes and context restoration can recreate GPU resources.
- Wide **1200×796** finale deep-link startup also prepared 64 programs; a **121-frame 0→3** sweep incurred none of the measured first-use calls and zero GL errors. The restored entry remained progress 3 with the finale panel interactive, audio stopped, time 0 and the drop clock paused. The dev server logged an HMR WebSocket suspension during harness tab hiding, not a shader/renderer error. Temporary source instrumentation was removed after these measurements.
- Clean production build at **390×596**, starting with a chapter-3 deep link: silent entry succeeded; motion-off and native chapter-link 3→4→3→4 navigation retained finite projections, only the final panel interactive, `y mandatory` snapping and GL error zero. No profiling hook remained. The temporary static server returned the browser's unrelated `/favicon.ico` 404; all scene/style/music resources loaded successfully. `yarn build --no-cache`, lifecycle checks and `git diff --check` passed; complete `rel/` rebuilt.
