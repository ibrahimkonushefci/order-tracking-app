# Rebrand checklist (target: under 15 minutes)

What you need from the owner: the logo (SVG or PNG, ideally transparent), the company name, phone/WhatsApp, city, what they make (kitchens · furniture · doors & floors · doors & windows), "avans" or "kapar", and the first names of the owner and the office person.

## A. On the laptop (offline demo), about 5 minutes
1. Start the app: `pnpm dev` (or `pnpm build && pnpm start` for the meeting, see README). Open http://localhost:3100.
2. **Hyr si Arben** (any demo Pronari) → **Cilësimet → Hap konfigurimin e markës** → `SETUP_PIN`.
3. Upload the logo. Pick the suggested colour or set primary/accent by hand.
4. Fill in name, short name (≤ 24 letters, shown on phones), phone in `+383…` form, city, business type, Avans/Kapar, owner and office names.
5. Watch the live preview (light). Then **Apliko dhe rimbush demon**. The app writes `brands/<slug>/` (`brand.json`, `logo.*`, `demo.json`), reseeds every demo brand and signs you in as the new owner.
6. Check (1 minute): Sot shows the new logo and "Pronari · {name}"; Porositë shows their products; the moon/sun shows Night Mode is readable; a tracking page via **Parapamje** shows their logo.

## B. Online (for the owner's phone and the QR), about 5–8 minutes
7. `git add brands/<slug> && git commit -m "Brand: {name}"` (on `main`), then `git push`.
8. `pnpm deploy:demo`: uploads HEAD to the online demo, migrates, builds, and resets the online demo data (2–4 minutes).
9. Open `https://order-tracking-test.vercel.app/?brand=<slug>` and sign in with **Hyr si {owner}**.
10. On the laptop: **Demo → 2 Klienti** and scan the QR with **your** phone. It must show their logo and "Montimi · Nesër". The laptop and the online demo use the same links, so this works offline on the laptop too.

## C. Just before the meeting, 1 minute
11. **Rivendos demon** on the laptop (and once online if you clicked around there today; it also resets itself every morning).
12. Data e demos back on **Sot**; meeting number empty until the owner agrees.
13. Laptop charged; your phone has mobile data in case the venue Wi-Fi is weak.

## Notes
- The brand folder is a demo asset. For a real client (Phase 6) the same folder ships with their own deployment, `DEMO_MODE=false`.
- If the logo has white letters on transparent background, check it on the light header; use a version with a coloured background if needed.
- To remove a demo brand: delete its folder (or set `"demo": false`), commit, `pnpm deploy:demo`, and **Rivendos demon** locally.
- Short-name and colours can be changed later in the same `/setup` screen; "Apliko" again reseeds.
