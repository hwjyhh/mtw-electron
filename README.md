点击这里，直接在浏览器中游玩MTW v7.0网页版
https://hwjyhh.github.io/mtw-electron/
## ⚠️ Code Warning & Disclaimer

> **"Spaghetti code ahead, but it runs at 60 FPS."**

Hey everyone, I am a college freshman (Class of 2026) and this is my personal side project. 

Because this engine was developed in my spare time, the codebase is **highly unpolished**. It is built entirely with Vanilla JavaScript and Electron, **without any fancy frameworks, design patterns, or Webpack bundlers**. You will find heavy use of global variables and some brutal "monkey patching" (like hijacking `window.setTimeout` for AI speed control). In short: it might look like a "spaghetti code" mess to senior devs.

**However, the core mechanics are hardcore:**
*   Hand-coded Radar Equation (4th-power law), RCS stealth, and 3D Line-of-Sight (LOS) occlusion.
*   Proportional Navigation for 3D missiles and interception calculations.
*   Multi-layered Behavior Tree AI with OODA loop logic (OODA, Echelon coordination, EW jamming).
*   A custom Mod API supporting external JSON configurations.
*   Smoothly handles 450+ units in real-time.

**Please be gentle with the code review!** 
Some weapon penetration and sensor data are estimated or derived from open-source simulations . If any hardcore military buffs find data inaccuracies, **you are more than welcome to fix the JSON files in the Mod folder and submit a Pull Request!**

**License:** AGPL-3.0. Strictly no commercial use or resale without my permission. 

If you find this project interesting, please leave a ⭐! Thank you!
Code might look like spaghetti, but the physics and AI are rigorous. Pull requests are highly appreciated.

Note on Localization: Since this project was initially developed by a Chinese freshman, most of the UI elements, game logs, and code comments are currently in Chinese. Full English localization (i18n) is on my TODO list. If you are interested in translating it, PRs are highly welcome!
