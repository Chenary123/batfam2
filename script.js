// =========================================================
// BATCOMPUTER // CASE 0912
// THE FALL OF NIGHTWING
// PART II
// =========================================================

"use strict";


// =========================================================
// 1. HELPERS
// =========================================================

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [
    ...document.querySelectorAll(selector)
];

function show(element) {
    if (typeof element === "string") element = $(element);
    if (element) element.classList.remove("hidden");
}

function hide(element) {
    if (typeof element === "string") element = $(element);
    if (element) element.classList.add("hidden");
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toast(message) {
    const box = $("#toast");
    if (!box) return;

    box.textContent = message;
    show(box);

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        hide(box);
    }, 3000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remaining).padStart(2, "0")
    );
}


// =========================================================
// 2. GAME STATE
// =========================================================

const GAME_DURATION = 15 * 60;
const CHAPTER_DURATION = 10 * 60;

let gamePhase = "intro";

let secondsRemaining = GAME_DURATION;
let chapterSecondsRemaining = CHAPTER_DURATION;

let timerInterval = null;

let soundEnabled = false;
let audioContext = null;

let currentScene = 0;
let currentPage = "overview";

let currentLocation = null;
let currentChapterLocation = null;

let currentChapter = 2;

let discoveredEvidence = new Set();
let examinedObjects = new Set();
let pinnedEvidence = new Set();

let chapterClues = new Set();

let notebookEntries = [];

let savedReport = null;

let investigationEnded = false;
let chapterEnded = false;

let currentChapterData = null;


// =========================================================
// 3. SOUND SYSTEM
// =========================================================

function playSound(type = "click") {
    if (!soundEnabled) return;

    try {
        if (!audioContext) {
            audioContext = new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const now = audioContext.currentTime;

        const settings = {
            click: [420, 0.025, 0.025],
            notification: [650, 0.07, 0.08],
            warning: [180, 0.12, 0.12],
            typing: [300, 0.012, 0.018]
        };

        const [frequency, volume, duration] =
            settings[type] || settings.click;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        oscillator.start(now);
        oscillator.stop(now + duration);

    } catch (error) {
        console.warn("Audio unavailable:", error);
    }
}

$("#sound").addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    $("#sound").textContent = soundEnabled
        ? "SOUND: ON"
        : "SOUND: OFF";

    if (soundEnabled) playSound("notification");
});


// =========================================================
// 4. OPENING CINEMATIC
// =========================================================

const openingScenes = [
    {
        tag: "GOTHAM CITY // 23:48",
        title: "AN ORDINARY NIGHT",
        body:
`The patrol has been longer than expected.

Rain covers the streets of Gotham.

For once, there is no emergency demanding the family's attention.

Jason insists they stop somewhere to eat.

Nobody has the energy to argue.`,
        quote:
`Jason: "If we're going to spend the entire night getting shot at, I'm at least getting fries."`
    },

    {
        tag: "BATBURGER // 23:56",
        title: "A MOMENT OF PEACE",
        body:
`The Batfamily occupies a corner booth.

Tim stares into his coffee.

Damian looks personally offended by the menu.

Stephanie steals a fry from Jason's tray.

Bruce sits quietly, listening."

For a few minutes, they almost resemble an ordinary family.`,
        quote:
`Damian: "This establishment is a disgrace."

Jason: "Then stop eating my fries."`
    },

    {
        tag: "BATBURGER // 00:08",
        title: "THE RESTROOM",
        body:
`Stephanie pushes her chair back.

She tells the others she'll be right back.

The corridor leading to the restrooms is empty.

A light flickers overhead.

One of the doors is slightly open.

She pushes it.

And stops.`,
        quote: ""
    },

    {
        tag: "BATBURGER // 00:09",
        title: "RICHARD GRAYSON",
        body:
`Dick is lying on the restroom floor.

His suit is damaged.

There are signs of a violent struggle.

Blood marks the tiles.

His body is motionless.

Stephanie says his name.

Once.

Then again.

He doesn't answer.`,
        quote:
`Stephanie: "Dick...?"

"Please. No."`
    },

    {
        tag: "BATBURGER // 00:10",
        title: "THE FAMILY",
        body:
`Stephanie runs back into the restaurant.

Something in her expression makes everyone stand.

Bruce reaches the restroom first.

He kneels beside Dick.

Checks for a pulse.

Then checks again.

The others gather behind him.

Nobody speaks.

Bruce lowers his head.`,
        quote:
`Bruce: "Little Wing...?"`
    },

    {
        tag: "BATBURGER // 00:17",
        title: "CASE 0912",
        body:
`Barbara establishes a secure connection.

The restaurant is sealed.

Gotham Police are kept outside the immediate scene.

The evidence is incomplete.

The witness statements are inconsistent.

Someone wanted Nightwing dead.

And whoever did it had enough time to leave.

The Batcomputer opens a new investigation.`,
        quote:
`Barbara: "I'm sending everything we have. Fifteen minutes before this gets taken out of our hands."`
    }
];

function renderScene() {
    const scene = openingScenes[currentScene];

    $("#sceneTag").textContent = scene.tag;
    $("#sceneTitle").textContent = scene.title;
    $("#sceneBody").textContent = scene.body;
    $("#sceneQuote").textContent = scene.quote;

    $("#sceneProgress").textContent =
        `${currentScene + 1} / ${openingScenes.length}`;

    $("#sceneNext").textContent =
        currentScene === openingScenes.length - 1
            ? "BEGIN INVESTIGATION"
            : "CONTINUE";
}

$("#begin").addEventListener("click", () => {
    hide("#intro");
    show("#cinema");

    gamePhase = "cinema";
    currentScene = 0;

    renderScene();
});

$("#sceneNext").addEventListener("click", () => {
    playSound("click");

    currentScene++;

    if (currentScene >= openingScenes.length) {
        startInvestigation();
        return;
    }

    renderScene();
});


// =========================================================
// 5. CHAPTER 1: SUSPECT DATABASE
// =========================================================

const suspects = [
    {
        id: "talon",
        name: "TALON",
        alias: "COURT OF OWLS OPERATIVE",
        status: "LOCATION UNKNOWN",
        background:
`An assassin connected to Gotham's Court of Owls.

Nightwing's history with the Court is extensive.

The Court has previously considered him valuable
for reasons that remain partially classified.`,
        motive:
`Nightwing may have interfered with an operation
involving the Court's remaining assets.`,
        alibi:
`A witness claims to have seen a Talon operative
near the old Gotham rail tunnels at 23:40.`,
        response:
`The Court does not answer to your schedules.

Your witness saw what they expected to see.

Grayson was important to the Court.
That does not mean every Talon wanted him dead.`
    },

    {
        id: "riddler",
        name: "EDWARD NYGMA",
        alias: "THE RIDDLER",
        status: "UNDER OBSERVATION",
        background:
`A criminal strategist known for elaborate traps,
misdirection, and public challenges.

He recently sent Nightwing an encrypted message.`,
        motive:
`Nightwing reportedly interrupted one of
Nygma's operations earlier in the week.`,
        alibi:
`Claims to have been broadcasting from
a private location throughout the evening.`,
        response:
`A warning is not necessarily a threat.

Sometimes it is simply a warning.

Killing Grayson in a restroom would be terribly unimaginative.`
    },

    {
        id: "redx",
        name: "RED X",
        alias: "IDENTITY UNCONFIRMED",
        status: "ACTIVE LEAD",
        background:
`A masked operative associated with stolen
technology and covert transactions.

Their identity remains unverified.`,
        motive:
`A recent exchange involving experimental
equipment may have been disrupted by Nightwing.`,
        alibi:
`An anonymous source places Red X
at Gotham's eastern docks before midnight.`,
        response:
`Grayson knew how to make enemies.

He also knew how to make deals.

You're looking at the wrong entrance.`
    },

    {
        id: "hush",
        name: "THOMAS ELLIOT",
        alias: "HUSH",
        status: "PERSON OF INTEREST",
        background:
`A surgeon with a documented history
of psychological manipulation and violence.

His personal conflict with Bruce Wayne
has repeatedly endangered the family.`,
        motive:
`Nightwing could have been targeted
as a means of harming Batman.`,
        alibi:
`Hospital access records indicate Elliot
entered a private medical facility at 23:51.`,
        response:
`Bruce has always had a weakness
for the people he calls family.

You can verify the hospital records yourself.`
    },

    {
        id: "blackmask",
        name: "ROMAN SIONIS",
        alias: "BLACK MASK",
        status: "MONITORED",
        background:
`A Gotham crime boss whose operations
have recently suffered substantial losses.

Several of his associates have disappeared.`,
        motive:
`Nightwing may have uncovered a criminal
transaction that Sionis wanted concealed.`,
        alibi:
`Claims he was meeting business associates
in the Financial District.`,
        response:
`The kid had a habit of interfering.

So does everyone wearing that symbol.

Find someone with fewer employees.`
    },

    {
        id: "slade",
        name: "SLADE WILSON",
        alias: "DEATHSTROKE",
        status: "UNCONFIRMED ACTIVITY",
        background:
`A professional mercenary with a history
of conflict involving the Titans.

Current employment and whereabouts
have not been verified.`,
        motive:
`Unknown.

No confirmed contract has been recovered.`,
        alibi:
`No verified alibi.

Available surveillance does not establish
his location during the estimated time of death.`,
        response:
`Grayson was skilled.

He should have known when to walk away.

You're focused on where he died.
Consider why he was there.`
    }
];


// =========================================================
// 6. CHAPTER 1: EVIDENCE DATABASE
// =========================================================

const evidence = [
    {
        id: "floor",
        title: "RESTROOM IMPACT PATTERN",
        type: "FORENSIC",
        content:
`Multiple impact marks were recovered from
the restroom's damaged wall tiles.

The pattern suggests a sustained close-range fight.

The attacker was physically capable of overpowering
a highly trained combatant.

One impact point is lower than the others,
suggesting Nightwing was already injured
before the final exchange.

No single weapon has been conclusively identified.`
    },

    {
        id: "thread",
        title: "DARK FABRIC FIBRES",
        type: "FORENSIC",
        content:
`Dark synthetic fibres were recovered
beneath Nightwing's fingernails.

The material is used in several types
of reinforced tactical clothing.

It is not exclusive to any known suspect.

Trace metallic residue was also detected,
but the laboratory has not identified its source.`
    },

    {
        id: "camera",
        title: "BATBURGER CCTV FRAGMENT",
        type: "SURVEILLANCE",
        content:
`CAMERA 03 // SERVICE CORRIDOR

23:59:12 — A figure enters through the service entrance.

00:02:44 — Camera image becomes obscured.

00:06:09 — A second shadow appears near the corridor.

00:07:31 — Recording resumes.

The figure's face is not visible.

The obstruction appears deliberate,
but its method remains undetermined.`
    },

    {
        id: "receipt",
        title: "UNCLAIMED PURCHASE RECEIPT",
        type: "DOCUMENT",
        content:
`BATBURGER // REGISTER 02

Transaction: 23:53

One coffee.
No food.

Payment made using a prepaid card.

The receipt was found beneath
a service corridor bench.

The card's registration data
cannot be recovered.`
    },

    {
        id: "message",
        title: "NIGHTWING'S LAST MESSAGE",
        type: "COMMUNICATION",
        content:
`RECOVERED DEVICE MESSAGE

Recipient: Unknown contact
Time: 23:42

"I know what you're moving.
If this reaches Gotham, people die.

I'm coming alone.
Don't make me regret trusting you."

The recipient identifier was removed
before the device was recovered.

The deletion predates police access.`
    },

    {
        id: "medical",
        title: "HOSPITAL ACCESS RECORD",
        type: "DOCUMENT",
        content:
`THOMAS ELLIOT

Entry recorded: 23:51
Exit recorded: 00:26

The badge was used at the east entrance.

A secondary camera covering the entrance
was offline during this period.

The record confirms badge activity,
not the identity of the person carrying it.`
    },

    {
        id: "docks",
        title: "EAST DOCKS SHIPPING LOG",
        type: "DOCUMENT",
        content:
`A shipment of reinforced tactical components
was transferred shortly before midnight.

The listed receiving company does not exist.

A handwritten notation reads:

"Delivery amended.
Client requests no identifying marks."

The shipment was later reported missing.`
    },

    {
        id: "witness",
        title: "BATBURGER STAFF STATEMENT",
        type: "WITNESS",
        content:
`A staff member recalls hearing
two distinct voices near the restroom corridor.

One voice sounded calm.

The other appeared to be arguing.

The witness could not identify either speaker.

The staff member also recalls hearing
a metallic object strike the floor.

The statement was taken under considerable stress.`
    },

    {
        id: "power",
        title: "SERVICE PANEL ACCESS",
        type: "TECHNICAL",
        content:
`The service corridor camera's interruption
coincides with access to a maintenance panel.

The panel was opened using a valid service code.

That code had been issued to several contractors.

One contractor's personnel file
was altered three hours after the murder.`
    },

    {
        id: "audio",
        title: "DISTORTED AUDIO FRAGMENT",
        type: "AUDIO TRANSCRIPT",
        content:
`RECOVERED AUDIO // 00:04

[FOOTSTEPS]

UNKNOWN VOICE:
"You weren't supposed to come here."

SECOND VOICE:
"Then you shouldn't have involved him."

[IMPACT]

[RECORDING CORRUPTED]

Voice identification remains inconclusive.

The recording does not establish
which speaker was Nightwing.`
    },

    {
        id: "contract",
        title: "REDACTED CONTRACT FRAGMENT",
        type: "CLASSIFIED",
        content:
`Recovered from an encrypted storage device.

SERVICE:
Containment and removal of an interfering asset.

OPERATIVE:
[REDACTED]

CLIENT:
[REDACTED]

PAYMENT CONDITION:
Completion confirmed by independent witness.

ADDITIONAL NOTE:
"Do not disclose the secondary objective."

The document does not explicitly identify
the victim, operative, or client.`
    }
];


// =========================================================
// 7. CHAPTER 1: LOCATIONS
// =========================================================
const locations = [
    {
        id: "restroom",
        name: "BATBURGER RESTROOM",
        description: "Primary crime scene. Nightwing was discovered here.",
        objects: [
            {
                id: "restroom-tiles",
                name: "DAMAGED WALL TILES",
                description: "Impact marks and signs of a prolonged struggle.",
                evidence: "floor"
            },
            {
                id: "restroom-fibres",
                name: "FIBRES UNDER NAILS",
                description: "Dark synthetic fibres recovered from the victim.",
                evidence: "thread"
            },
            {
                id: "restroom-audio",
                name: "AUDIO RECORDER",
                description: "A damaged device found near the sinks.",
                evidence: "audio"
            }
        ]
    },

    {
        id: "corridor",
        name: "SERVICE CORRIDOR",
        description: "A restricted corridor behind the restaurant.",
        objects: [
            {
                id: "corridor-camera",
                name: "SECURITY CAMERA",
                description: "The camera recording has a suspicious gap.",
                evidence: "camera"
            },
            {
                id: "corridor-receipt",
                name: "PAPER RECEIPT",
                description: "A purchase made shortly before the murder.",
                evidence: "receipt"
            },
            {
                id: "corridor-panel",
                name: "MAINTENANCE PANEL",
                description: "The panel controls the corridor's cameras.",
                evidence: "power"
            }
        ]
    },

    {
        id: "parking",
        name: "RESTAURANT PARKING LOT",
        description: "A vehicle was seen leaving shortly after midnight.",
        objects: [
            {
                id: "parking-witness",
                name: "STAFF STATEMENT",
                description: "A witness recalls hearing an argument.",
                evidence: "witness"
            },
            {
                id: "parking-message",
                name: "RECOVERED PHONE",
                description: "Nightwing's last outgoing message.",
                evidence: "message"
            }
        ]
    },

    {
        id: "hospital",
        name: "GOTHAM MEDICAL CENTRE",
        description: "A possible alibi connected to Thomas Elliot.",
        objects: [
            {
                id: "hospital-record",
                name: "ACCESS LOG",
                description: "A hospital entry record.",
                evidence: "medical"
            }
        ]
    },

    {
        id: "docks",
        name: "EASTERN INDUSTRIAL DISTRICT",
        description: "A location connected to suspicious deliveries.",
        objects: [
            {
                id: "docks-log",
                name: "SHIPPING MANIFEST",
                description: "An unregistered shipment.",
                evidence: "docks"
            },
            {
                id: "docks-contract",
                name: "ENCRYPTED DOCUMENT",
                description: "A partial contract recovered from storage.",
                evidence: "contract"
            }
        ]
    }
];


// =========================================================
// 8. CHAPTER 1: RENDERING
// =========================================================
function renderSuspects() {
    const container = $("#suspectList");

    container.innerHTML = suspects.map(suspect => `
        <button class="suspect-card"
            data-suspect="${escapeHTML(suspect.id)}">

            <small>${escapeHTML(suspect.status)}</small>

            <h3>${escapeHTML(suspect.name)}</h3>

            <p>${escapeHTML(suspect.alias)}</p>

        </button>
    `).join("");
}

function renderLocations() {
    const container = $("#locationList");

    container.innerHTML = locations.map(location => `
        <button class="location-card"
            data-location="${escapeHTML(location.id)}">

            <small>FIELD LOCATION</small>

            <h3>${escapeHTML(location.name)}</h3>

            <p>${escapeHTML(location.description)}</p>

        </button>
    `).join("");
}

function renderEvidence() {
    const container = $("#evidenceList");

    container.innerHTML = evidence
        .filter(item => discoveredEvidence.has(item.id))
        .map(item => `
            <button class="evidence-card"
                data-evidence="${escapeHTML(item.id)}">

                <small>${escapeHTML(item.type)}</small>

                <h3>${escapeHTML(item.title)}</h3>

                <p>RECOVERED // SELECT TO OPEN</p>

            </button>
        `).join("");

    if (discoveredEvidence.size === 0) {
        container.innerHTML = `
            <p class="muted">
                No evidence recovered yet.
                Examine objects at the investigation locations.
            </p>
        `;
    }

    $("#progress").textContent =
        `${discoveredEvidence.size} FILES RECOVERED`;
}

function renderTimeline() {
    const items = [
        ["23:42", "Nightwing sends an encrypted message to an unknown contact."],
        ["23:48", "The family travels through Gotham."],
        ["23:53", "An unclaimed coffee purchase is recorded."],
        ["23:59", "A figure enters the service corridor."],
        ["00:02", "The corridor camera is interrupted."],
        ["00:04", "A damaged audio recording captures two voices."],
        ["00:07", "The corridor camera resumes recording."],
        ["00:09", "Nightwing is discovered by Stephanie Brown."]
    ];

    $("#timelineList").innerHTML = items.map(item => `
        <div class="timeline-item">
            <strong>${escapeHTML(item[0])}</strong>
            <p>${escapeHTML(item[1])}</p>
        </div>
    `).join("");
}

function renderPinned() {
    const container = $("#pinned");

    const items = evidence.filter(item =>
        pinnedEvidence.has(item.id)
    );

    if (items.length === 0) {
        container.innerHTML = `
            <p class="muted">No evidence pinned yet.</p>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="pinned-item">
            ${escapeHTML(item.title)}
        </div>
    `).join("");
}

function renderAllChapterOne() {
    renderSuspects();
    renderLocations();
    renderEvidence();
    renderTimeline();
    renderPinned();
}


// =========================================================
// 9. CHAPTER 1: PAGE NAVIGATION
// =========================================================

function openPage(pageName) {
    currentPage = pageName;

    $$(".page").forEach(page => hide(page));

    const target = document.getElementById(pageName);

    if (target) show(target);

    $$(".nav").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    playSound("click");
}

$$(".nav").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});


// =========================================================
// 10. CHAPTER 1: SUSPECT DETAILS
// =========================================================

$("#suspectList").addEventListener("click", event => {
    const button = event.target.closest("[data-suspect]");
    if (!button) return;

    const suspect = suspects.find(item =>
        item.id === button.dataset.suspect
    );

    if (!suspect) return;

    $$(".suspect-card").forEach(card =>
        card.classList.remove("selected")
    );

    button.classList.add("selected");

    $("#suspectDetail").innerHTML = `
        <p class="eyebrow">PERSONNEL FILE // ${escapeHTML(suspect.status)}</p>

        <h2>${escapeHTML(suspect.name)}</h2>

        <p class="detail-label">${escapeHTML(suspect.alias)}</p>

        <h3>BACKGROUND</h3>
        <p>${escapeHTML(suspect.background)}</p>

        <h3>POSSIBLE MOTIVE</h3>
        <p>${escapeHTML(suspect.motive)}</p>

        <h3>REPORTED ALIBI</h3>
        <p>${escapeHTML(suspect.alibi)}</p>

        <h3>INTERVIEW TRANSCRIPT</h3>
        <p>${escapeHTML(suspect.response)}</p>

        <p class="muted">
            Interview record does not establish guilt or innocence.
        </p>
    `;

    show("#suspectDetail");
    playSound("notification");
});


// =========================================================
// 11. CHAPTER 1: LOCATION EXAMINATION
// =========================================================
$("#locationList").addEventListener("click", event => {
    const button = event.target.closest("[data-location]");
    if (!button) return;

    const location = locations.find(item =>
        item.id === button.dataset.location
    );

    if (!location) return;

    currentLocation = location.id;

    $$(".location-card").forEach(card => {
        card.classList.toggle(
            "selected",
            card.dataset.location === location.id
        );
    });

    $("#locationDetail").innerHTML = `
        <p class="eyebrow">FIELD INVESTIGATION // ACTIVE</p>

        <h2>${escapeHTML(location.name)}</h2>

        <p>${escapeHTML(location.description)}</p>

        <h3>OBJECTS AVAILABLE FOR EXAMINATION</h3>

        <div class="object-list">
            ${location.objects.map(object => `
                <button
                    class="object-card"
                    data-object="${escapeHTML(object.id)}">

                    <span>${escapeHTML(object.name)}</span>

                    <small>
                        ${examinedObjects.has(object.id)
                            ? "EXAMINED"
                            : "UNEXAMINED"}
                    </small>
                </button>
            `).join("")}
        </div>

        <div id="objectDetail" class="object-detail"></div>
    `;

    show("#locationDetail");
    playSound("click");
});


// =========================================================
// 12. EXAMINE OBJECTS AND RECOVER EVIDENCE
// =========================================================

$("#locationDetail").addEventListener("click", event => {
    const button = event.target.closest("[data-object]");
    if (!button || !currentLocation) return;

    const location = locations.find(item =>
        item.id === currentLocation
    );

    if (!location) return;

    const object = location.objects.find(item =>
        item.id === button.dataset.object
    );

    if (!object) return;

    const evidenceFile = evidence.find(item =>
        item.id === object.evidence
    );

    const firstExamination = !examinedObjects.has(object.id);

    examinedObjects.add(object.id);

    if (evidenceFile) {
        discoveredEvidence.add(evidenceFile.id);
    }

    button.querySelector("small").textContent = "EXAMINED";

    $("#objectDetail").innerHTML = `
        <div class="examined-object">

            <p class="eyebrow">
                ${firstExamination
                    ? "NEW DISCOVERY"
                    : "PREVIOUSLY EXAMINED"}
            </p>

            <h3>${escapeHTML(object.name)}</h3>

            <p>${escapeHTML(object.description)}</p>

            ${evidenceFile ? `
                <div class="discovery-box">
                    <small>EVIDENCE RECOVERED</small>

                    <h4>${escapeHTML(evidenceFile.title)}</h4>

                    <p>${escapeHTML(evidenceFile.content)}</p>

                    <button
                        class="pin-from-scene"
                        data-pin="${escapeHTML(evidenceFile.id)}">

                        ${pinnedEvidence.has(evidenceFile.id)
                            ? "REMOVE FROM CONNECTION BOARD"
                            : "PIN TO CONNECTION BOARD"}
                    </button>
                </div>
            ` : ""}
        </div>
    `;

    renderEvidence();
    renderPinned();

    if (firstExamination) {
        playSound("notification");
        toast("NEW EVIDENCE ADDED TO BATCOMPUTER");
    } else {
        playSound("click");
    }
});


// =========================================================
// 13. EVIDENCE FILE DETAILS
// =========================================================

$("#evidenceList").addEventListener("click", event => {
    const button = event.target.closest("[data-evidence]");
    if (!button) return;

    const item = evidence.find(file =>
        file.id === button.dataset.evidence
    );

    if (!item || !discoveredEvidence.has(item.id)) return;

    $("#evidenceDetail").innerHTML = `
        <p class="eyebrow">
            BATCOMPUTER ARCHIVE // ${escapeHTML(item.type)}
        </p>

        <h2>${escapeHTML(item.title)}</h2>

        <pre class="evidence-content">${escapeHTML(item.content)}</pre>

        <button data-pin="${escapeHTML(item.id)}">
            ${pinnedEvidence.has(item.id)
                ? "REMOVE FROM CONNECTION BOARD"
                : "PIN TO CONNECTION BOARD"}
        </button>
    `;

    show("#evidenceDetail");
    playSound("click");
});


// =========================================================
// 14. PIN AND UNPIN EVIDENCE
// =========================================================

document.addEventListener("click", event => {
    const button = event.target.closest("[data-pin]");
    if (!button) return;

    const evidenceId = button.dataset.pin;

    if (!discoveredEvidence.has(evidenceId)) return;

    if (pinnedEvidence.has(evidenceId)) {
        pinnedEvidence.delete(evidenceId);
        toast("EVIDENCE REMOVED FROM CONNECTION BOARD");
    } else {
        pinnedEvidence.add(evidenceId);
        toast("EVIDENCE PINNED TO CONNECTION BOARD");
    }

    renderPinned();

    const isPinned = pinnedEvidence.has(evidenceId);

    $$(`[data-pin="${evidenceId}"]`).forEach(pinButton => {
        pinButton.textContent = isPinned
            ? "REMOVE FROM CONNECTION BOARD"
            : "PIN TO CONNECTION BOARD";
    });

    playSound("click");
});


// =========================================================
// 15. CHAPTER 1: INVESTIGATION TIMER
// =========================================================
function updateMainClock() {
    $("#clock").textContent = formatTime(secondsRemaining);
}

function startMainTimer() {
    clearInterval(timerInterval);

    secondsRemaining = GAME_DURATION;
    updateMainClock();

    timerInterval = setInterval(() => {
        if (gamePhase !== "chapter1") return;

        secondsRemaining--;
        updateMainClock();

        if (secondsRemaining <= 60 && secondsRemaining > 0) {
            if (secondsRemaining % 15 === 0) {
                playSound("warning");
                toast("WARNING: INVESTIGATION WINDOW CLOSING");
            }
        }

        if (secondsRemaining <= 0) {
            clearInterval(timerInterval);
            submitChapterOne(true);
        }

    }, 1000);
}

function startInvestigation() {
    hide("#cinema");
    show("#app");
    show("#notebookButton");

    gamePhase = "chapter1";

    renderAllChapterOne();
    openPage("overview");
    startMainTimer();

    toast("CASE 0912 // INVESTIGATION ACTIVE");
}


// =========================================================
// 15. NOTEBOOK
// =========================================================

function renderNotebook() {
    const container = $("#noteList");

    if (notebookEntries.length === 0) {
        container.innerHTML = `
            <p class="muted">
                No notes saved. Add your first observation above.
            </p>
        `;
        return;
    }

    container.innerHTML = notebookEntries.map((note, index) => `
        <article class="note-entry">

            <h3>${escapeHTML(note.title)}</h3>

            <p>${escapeHTML(note.content)}</p>

            <button class="icon-btn"
                data-delete-note="${index}">
                DELETE
            </button>

        </article>
    `).join("");
}

$("#notebookButton").addEventListener("click", () => {
    show("#notesShade");
    show("#notebook");
});

$("#closeNotebook").addEventListener("click", () => {
    hide("#notesShade");
    hide("#notebook");
});

$("#notesShade").addEventListener("click", () => {
    hide("#notesShade");
    hide("#notebook");
});

$("#addNote").addEventListener("click", () => {
    const titleInput = $("#noteTitle");

    const title = titleInput.value.trim();

    if (!title) {
        toast("ENTER A NOTE TITLE FIRST");
        return;
    }

    notebookEntries.push({
        title,
        content: "",
        time: new Date().toLocaleTimeString()
    });

    titleInput.value = "";

    renderNotebook();
    toast("NOTE CREATED");
});

$("#noteList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-note]");
    if (!button) return;

    const index = Number(button.dataset.deleteNote);

    notebookEntries.splice(index, 1);
    renderNotebook();
});

$("#noteList").addEventListener("input", event => {
    const entry = event.target.closest(".note-entry");
    if (!entry) return;
});


// =========================================================
// 16. CHAPTER 1: FINAL REPORT
// =========================================================

$("#reportForm").addEventListener("submit", event => {
    event.preventDefault();
    submitChapterOne(false);
});

function submitChapterOne(timedOut) {
    if (investigationEnded) return;

    investigationEnded = true;
    clearInterval(timerInterval);

    savedReport = {
        primarySuspect: $("#r1").value.trim(),
        events: $("#r2").value.trim(),
        motive: $("#r3").value.trim(),
        evidence: $("#r4").value.trim(),
        accomplices: $("#r5").value.trim(),
        boardTheory: $("#boardTheory").value.trim(),
        timedOut
    };

    hide("#app");
    hide("#notebookButton");
    hide("#notebook");
    hide("#notesShade");

    show("#transition");

    $("#transitionTag").textContent =
        "CASE 0912 // INITIAL FINDINGS RECEIVED";

    $("#transitionTitle").textContent =
        timedOut ? "TIME EXPIRED" : "REPORT RECEIVED";

    $("#transitionBody").textContent =
`The Batcomputer has archived your investigation.

The evidence points towards a professional hit.

But the recovered files suggest that Nightwing's death
may have served a purpose beyond the murder itself.

A new transmission is arriving.

SOURCE: JASON TODD`;

    gamePhase = "transition";

    playSound("warning");
}

$("#transitionNext").addEventListener("click", () => {
    if (currentChapter < 2) {
        beginChapter(2);
    } else if (currentChapter === 2) {
        beginChapter(3);
    } else if (currentChapter === 3) {
        beginChapter(4);
    }
});


// =========================================================
// 17. CHAPTER 2–4 DATA
// =========================================================

const chapters = {

    // -----------------------------------------------------
    // CHAPTER 2
    // -----------------------------------------------------
    2: {
        eyebrow: "CHAPTER 02 // BLÜDHAVEN",
        badge: "UNAUTHORISED CHANGE IN COMMAND",
        title: "THE LAST TRANSMISSION",
        subject: "JASON TODD",
        status: "OPERATION COMPROMISED",
        time: "10:00",

        briefing:
`Jason received a text from one of his own people.

His operation in Blüdhaven is no longer following orders.

The men he trusted have changed their routes,
abandoned their assignments, and stopped answering him.

Someone else has taken control.

Jason doesn't know who.

And the new leadership appears to have access
to information that should have remained private.`,

        phone: {
            sender: "UNKNOWN // ENCRYPTED",
            message: "We are no longer obeying you. We have a higher leader now."
        },

        questions: [
            "Who has taken control of Jason's organisation?",
            "How did the new leader gain access to Jason's operations?",
            "Which members were involved in the takeover?",
            "Is this connected to Nightwing's murder?",
            "What evidence supports your conclusion?"
        ],

        persons: [
            {
                id: "mason",
                name: "MASON REED",
                role: "FORMER FIELD COORDINATOR",
                status: "MISSING",
                background:
`Mason coordinated several of Jason's operations.

He disappeared shortly before the organisation
began ignoring Jason's instructions.`,
                motive:
`Mason may have been offered control
of operations he previously managed.`,
                alibi:
`His last confirmed location was
a warehouse in the southern district.`,
                statement:
`Jason always thought loyalty was enough.

Things changed.

You should ask who gave us the new instructions.`
            },
            {
                id: "vera",
                name: "VERA CROSS",
                role: "COMMUNICATIONS SPECIALIST",
                status: "UNCONFIRMED",
                background:
`Vera maintained encrypted communication channels
for several members of Jason's organisation.`,
                motive:
`She had the technical access necessary
to redirect internal messages.`,
                alibi:
`Claims she was repairing a relay station
during the first unauthorised transmission.`,
                statement:
`The network wasn't hacked.

Someone used credentials
that were already authorised.

That's what should worry you.`
            },
            {
                id: "gideon",
                name: "GIDEON VALE",
                role: "LOGISTICS SUPERVISOR",
                status: "UNDER INVESTIGATION",
                background:
`Gideon managed shipments and safehouse supplies.

Several deliveries were redirected
shortly before the takeover.`,
                motive:
`He may have benefited financially
from the change in leadership.`,
                alibi:
`Shipping records place him near
the northern depot.`,
                statement:
`I move supplies.

I don't decide who gives orders.

If you want the person responsible,
follow the money.`
            },
            {
                id: "unknown",
                name: "UNKNOWN COORDINATOR",
                role: "IDENTITY UNCONFIRMED",
                status: "ACTIVE THREAT",
                background:
`An unidentified individual appears to have
issued instructions through several intermediaries.

No verified image or name has been recovered.`,
                motive:
`Unknown.

The takeover may be part
of a larger operation.`,
                alibi:
`No confirmed location.`,
                statement:
`No direct communication recovered.`
            }
        ],

        locations: [
            {
                id: "safehouse",
                name: "ABANDONED SAFEHOUSE",
                description:
                    "A former meeting point for Jason's organisation.",
                objects: [
                    {
                        id: "safehouse-map",
                        name: "ALTERED OPERATIONS MAP",
                        description: "Several routes have been changed.",
                        clue: "routes",
                        title: "REDIRECTED ROUTES",
                        content:
`OPERATIONS MAP // RECOVERED

Five supply routes were altered
within a twelve-hour period.

All five now lead through
the same industrial district.

The changes were authorised
using valid internal credentials.

Jason did not approve them.`
                    },
                    {
                        id: "safehouse-note",
                        name: "DISCARDED INSTRUCTIONS",
                        description: "A torn page recovered from a desk.",
                        clue: "instructions",
                        title: "REPLACEMENT ORDERS",
                        content:
`HANDWRITTEN NOTE // PARTIAL

"Do not contact Todd.

New instructions will arrive
through the designated channel.

Previous arrangements are cancelled."

The handwriting has not been identified.

No signature is present.`
                    }
                ]
            },
            {
                id: "relay",
                name: "COMMUNICATION RELAY",
                description:
                    "An encrypted relay station used by Jason's people.",
                objects: [
                    {
                        id: "relay-access",
                        name: "ACCESS RECORDS",
                        description: "A valid account was used unexpectedly.",
                        clue: "access",
                        title: "UNAUTHORISED AUTHORISATION",
                        content:
`RELAY ACCESS LOG

Three internal accounts accessed
the network after midnight.

One account belonged to
a former organisation member.

The account had not been used
for several months.

Its credentials were never revoked.`
                    },
                    {
                        id: "relay-audio",
                        name: "PARTIAL VOICE RECORDING",
                        description: "A corrupted recording of a meeting.",
                        clue: "meeting",
                        title: "THE MEETING",
                        content:
`RECOVERED AUDIO // PARTIAL TRANSCRIPT

VOICE 1:
"Jason won't accept this."

VOICE 2:
"He doesn't have to accept it."

VOICE 1:
"Who are we answering to, then?"

VOICE 2:
"You know the arrangement."

[RECORDING ENDS]

The second voice has been distorted.

No speaker identification is available.`
                    },
                    {
                        id: "ledger",
                        name: "PAYMENT LEDGER",
                        description: "Payments were made to several former associates.",
                        clue: "ledger",
                        title: "UNUSUAL PAYMENTS",
                        content:
`FINANCIAL RECORD // LAST 72 HOURS

Several former members received payments
from the same private account.

The account does not belong to Jason.

The payments were not made directly
to the individuals.

Instead, they were routed through
a small number of intermediaries.

The account holder is concealed.`
                    }
                ]
            },

            {
                id: "street",
                name: "BLÜDHAVEN STREET CAMERA",
                description: "A public camera captured a suspicious handover.",
                objects: [
                    {
                        id: "footage",
                        name: "CAMERA FOOTAGE",
                        description: "A short clip shows a meeting near the docks.",
                        clue: "footage",
                        title: "THE HANDOVER",
                        content:
`CAMERA 18 // 01:32

A courier approaches a parked vehicle.

A second individual exits the vehicle.

A small envelope is exchanged.

The courier leaves alone.

The second individual remains inside the vehicle.

The vehicle registration is obscured.

The footage does not show either person's face.`
                    },
                    {
                        id: "route",
                        name: "DELIVERY ROUTE",
                        description: "A new route appears on the traffic system.",
                        clue: "route",
                        title: "NEW DELIVERY ROUTE",
                        content:
`A number of shipments now bypass
Jason's former distribution points.

The new route connects three warehouses
and a private loading facility.

The route was added using a central account.

That account was created recently.

Its owner information is hidden
behind an external security service.`
                    }
                ]
            }
        ]
    },


    // -----------------------------------------------------
    // CHAPTER 3
    // -----------------------------------------------------

    3: {
        eyebrow: "CHAPTER 03 // THE TAKEOVER",
        badge: "IDENTITY OF THE HIGHER LEADER",
        title: "THE NEW ORDER",
        subject: "BLÜDHAVEN OPERATION",
        status: "IDENTITY UNDER REVIEW",
        time: "10:00",

        briefing:
`The first investigation uncovered a coordinated takeover.

The new authority has access to Jason's personnel,
financial channels, and distribution network.

The operation was planned before Jason realised
his people were turning against him.

A recovered account has now been partially decrypted.

It contains a reference to an individual
who has been using the chaos surrounding
Nightwing's death to expand her influence.

The Batcomputer is opening a second set of files.`,

        mission:
`Identify the person behind the new authority.

Compare the financial records, communications,
and recovered identity markers.

Establish how the takeover connects
to Nightwing's death.`,

        note:
`The identity of the new leader must be established
through the evidence, not assumed from the first reference.`,

        objective:
`Identify the person who took control of Jason's operation
and determine how Nightwing's death helped her.`,

        reportTitle: "WHO IS THE NEW LEADER?",

        reportPrompt:
`Identify the person behind the takeover.

Explain how she gained control of Jason's operation
and why Nightwing's death created an opportunity.

Use specific evidence to support your conclusion.`,

        locations: [
            {
                id: "account",
                name: "ENCRYPTED ACCOUNT",
                description: "A hidden account connected to the new authority.",
                objects: [
                    {
                        id: "account-name",
                        name: "ACCOUNT METADATA",
                        description: "A partially decrypted account record.",
                        clue: "account-name",
                        title: "ACCOUNT HOLDER",
                        content:
`ACCOUNT RECOVERY // PARTIAL

Alias: [REDACTED]

Origin: [REDACTED]

Access level: Executive authority

The account was used to approve
the new distribution network.

The alias is linked to an individual
known to have operated on Earth.

Additional identity confirmation is required.`
                    },
                    {
                        id: "account-access",
                        name: "ACCESS HISTORY",
                        description: "The account's first recorded activity.",
                        clue: "account-access",
                        title: "ACCOUNT ACCESS HISTORY",
                        content:
`The central authority account was created
shortly before Nightwing's death.

Its first major activity occurred
within hours of the incident.

The account accessed Jason's old personnel files
and began changing approval permissions.

The account's operator had prior knowledge
of Jason's internal network.`
                    }
                ]
            },

            {
                id: "communications",
                name: "PRIVATE COMMUNICATIONS",
                description: "Messages exchanged between the new authority and her contacts.",
                objects: [
                    {
                        id: "message-chain",
                        name: "MESSAGE CHAIN",
                        description: "A conversation about the operation.",
                        clue: "message-chain",
                        title: "PRIVATE MESSAGE CHAIN",
                        content:
`RECOVERED CHAT // PARTIAL
CONTACT A:
"The distraction worked. Nobody is looking
at the docks anymore."

CONTACT B:
"Jason?"

CONTACT A:
"His attention is elsewhere.
His people are already changing sides."

CONTACT B:
"And the mercenary?"

CONTACT A:
"He did what he was paid to do."

The account sending these messages
uses the same access credentials
as the central authority account.`
                    },
                    {
                        id: "voice",
                        name: "VOICE IDENTIFICATION",
                        description: "A voice sample matches a known individual.",
                        clue: "voice",
                        title: "VOICE MATCH",
                        content:
`A recovered voice sample was compared
against archived recordings.

The result indicates a strong match
with a voice in a sealed Titans-era archive.

The sample is not a complete recording.

However, the communication account,
the voice sample, and the access records
suggest a single coordinator, but the voice match is disputed.`
                    }
                ]
            },

            {
                id: "warehouse",
                name: "SECONDARY WAREHOUSE",
                description: "A storage site used by the new leadership.",
                objects: [
                    {
                        id: "orders",
                        name: "SIGNED ORDERS",
                        description: "Orders bearing a previously hidden signature.",
                        clue: "orders",
                        title: "CENTRAL AUTHORITY ORDERS",
                        content:
`Recovered instructions from the warehouse.

Authorising individual:
[AUTHORITY KEY 07 — SIGNATURE SEALED]

The signature is consistent
with the identity linked to the account metadata.

The orders transfer control of several
Blüdhaven distribution points.

Jason's name has been removed
from the approval structure.`
                    },
                    {
                        id: "map",
                        name: "TERRITORY MAP",
                        description: "A map showing the takeover's expansion.",
                        clue: "map",
                        title: "OPERATIONAL TERRITORY",
                        content:
`The marked locations show a coordinated
expansion across Jason's former territory.

The first changes were made
after Nightwing's death.

The takeover did not require
a direct confrontation with Jason.

Instead, his network was reorganised
while he was distracted by the murder.`
                    }
                ]
            },

            {
                id: "archive",
                name: "SEALED ARCHIVE",
                description: "A collection of files connected to the Nightwing incident.",
                objects: [
                    {
                        id: "distraction",
                        name: "OPERATION NOTE",
                        description: "A document refers to the incident in Gotham.",
                        clue: "distraction",
                        title: "SECONDARY OBJECTIVE",
                        content:
`RECOVERED OPERATION NOTE

Primary objective:
Remove the interfering asset.

Secondary objective:
Exploit the resulting disruption
to secure control of the Blüdhaven network.

The note refers to Nightwing's death
as a useful distraction.

The document does not state
that the mercenary knew the full plan.`
                    },
                    {
                        id: "photo",
                        name: "ARCHIVED PHOTOGRAPH",
                        description: "A blurred photograph from a closed-door meeting.",
                        clue: "photo",
                        title: "ARCHIVE // OBSCURED ATTENDEE",
                        content:
`An archived photograph shows an unidentified figure
at a private meeting with several
of Jason's former associates.

The photograph was taken
before the takeover became public.

The meeting location matches
one of the warehouses in the new network.

The photograph supports the conclusion
that the same figure had been organising the takeover
before Jason received the message.`
                    }
                ]
            }
        ]
    },


    // -----------------------------------------------------
    // CHAPTER 4
    // -----------------------------------------------------

    4: {
        eyebrow: "CHAPTER 04 // AFTERMATH",
        badge: "SECONDARY HOMICIDE CONFIRMED",
        title: "THE LAST CONTRACT",
        subject: "BLACKFIRE",
        status: "DECEASED",
        time: "10:00",

        briefing:
`The takeover has been traced to Blackfire.

But the recovered communications contain
a new problem.

The mercenary involved in Nightwing's death
has disappeared from the network.

A separate incident has now been reported.

Blackfire is dead.

The available evidence suggests
that Slade Wilson was responsible.

There is no live confrontation to investigate.
The scene has already been secured.

Your task is to reconstruct what happened
after Blackfire's plan began to unravel.`,

        mission:
`Examine the aftermath of Blackfire's death.

Recover the final communications,
compare the contract records,
and establish why Slade turned against her.

Do not assume the contract explains everything.`,

        note:
`This investigation concerns events after Blackfire's takeover.
The person who originally gave Slade his orders
has not been identified.`,

        objective:
`Determine why Slade killed Blackfire
and what happened to the original contract.`,

        reportTitle: "WHY DID SLADE TURN ON BLACKFIRE?",        reportPrompt:
`Reconstruct the events leading to Blackfire's death.

Explain what Slade discovered,
why he turned against her,
and what the recovered contract does and does not reveal.

Do not invent an identity for the person
who originally issued the orders.`,

        locations: [
            {
                id: "scene",
                name: "BLACKFIRE'S LAST LOCATION",
                description: "The secured scene where Blackfire was found.",
                objects: [
                    {
                        id: "scene-report",
                        name: "SCENE REPORT",
                        description: "A forensic summary of the incident.",
                        clue: "scene-report",
                        title: "SCENE EXAMINATION",
                        content:
`INCIDENT REPORT // BLÜDHAVEN

Victim: Koriand'r / Blackfire

Status: Deceased

The scene shows evidence of a close-range confrontation.

No signs of forced entry were found.

The available evidence indicates
that Blackfire knew the person who entered.

A single weapon was recovered.

The weapon is consistent with equipment
previously associated with Slade Wilson.`
                    },
                    {
                        id: "impact",
                        name: "DAMAGE PATTERN",
                        description: "The room shows signs of a brief struggle.",
                        clue: "impact",
                        title: "ROOM DAMAGE",
                        content:
`The damage is concentrated around
the central table and the exit.

A chair was overturned.

A glass display case was broken.

The damage suggests a short confrontation
rather than a prolonged fight.

One object appears to have been removed
before the scene was secured.`
                    }
                ]
            },

            {
                id: "device",
                name: "BLACKFIRE'S DEVICE",
                description: "A damaged personal device recovered from the scene.",
                objects: [
                    {
                        id: "draft",
                        name: "UNSENT MESSAGE",
                        description: "A message Blackfire never sent.",
                        clue: "draft",
                        title: "UNSENT MESSAGE",
                        content:
`DRAFT // NOT SENT

"You were hired to remove Grayson.
Not to question the arrangement.

You have been paid.

The rest of the operation is mine."

The message was saved shortly before
Blackfire's death.

It appears to have been addressed
to an unnamed contact.

The recipient field has been erased.`
                    },
                    {
                        id: "call",
                        name: "FINAL CALL LOG",
                        description: "A call made shortly before the incident.",
                        clue: "call",
                        title: "FINAL CALL",
                        content:
`OUTGOING CALL // 21:46

Recipient: SLADE WILSON

Duration: 00:19

The call ended without a recorded conversation.

A second call was attempted
approximately six minutes later.

It was not answered.

No further calls were made
from the device.`
                    }
                ]
            },

            {
                id: "contract",
                name: "CONTRACT ARCHIVE",
                description: "The original arrangement involving Nightwing.",
                objects: [
                    {
                        id: "contract-copy",
                        name: "CONTRACT COPY",
                        description: "A partial copy of the agreement.",
                        clue: "contract-copy",
                        title: "THE CONTRACT",
                        content:
`RECOVERED CONTRACT // DAMAGED COPY

OPERATIVE:
SLADE WILSON

TARGET:
RICHARD GRAYSON

SERVICE:
Removal of designated interfering asset.

CLIENT:
[SEALED]

PAYMENT:
TRANSFER CONFIRMED

ADDITIONAL INSTRUCTION:
Secondary objective not to be disclosed
to the operative.

The document confirms Slade's involvement
in Nightwing's death.

It does not identify the original client.`
                    },
                    {
                        id: "payment",
                        name: "PAYMENT RECORD",
                        description: "The final transfer connected to the contract.",
                        clue: "payment",
                        title: "PAYMENT DISPUTE",
                        content:
`TRANSFER HISTORY

Initial payment: CONFIRMED

Completion payment: DISPUTED

The completion payment was frozen
after the Blüdhaven takeover began.

A note attached to the transaction reads:

"Operative has requested clarification
regarding the secondary objective."

The account holder did not respond.

The payment system was later shut down.`
                    }
                ]
            },

            {
                id: "safehouse",
                name: "SLADE'S TEMPORARY SAFEHOUSE",
                description: "A room connected to Slade's last known movements.",
                objects: [
                    {
                        id: "recording",
                        name: "RECORDED CONVERSATION",
                        description: "A recording made after Blackfire's takeover.",
                        clue: "recording",
                        title: "SLADE'S RECORDING",
                        content:
`RECOVERED AUDIO // PARTIAL

SLADE:"You said this was a removal contract."

UNKNOWN VOICE:
"It was."

SLADE:
"You used the death to take her territory."

UNKNOWN VOICE:
"That was not part of your assignment."

SLADE:
"It became part of my problem."

[RECORDING ENDS]

The unknown voice cannot be identified.

The recording suggests Slade discovered
that Blackfire had used the murder
to further her own takeover.`
                    },
                    {
                        id: "note",
                        name: "HANDWRITTEN NOTE",
                        description: "A note left behind at the safehouse.",
                        clue: "note",
                        title: "UNSIGNED NOTE",
                        content:
`A short handwritten note was recovered.

"She thought the contract made her untouchable.

She thought I wouldn't notice.

I don't work for people who use me
and then expect me to clean up after them."

The handwriting is consistent
with samples attributed to Slade Wilson.

No recipient is named.`
                    }
                ]
            }
        ]
    }
};



// Chapter 2–4: richer investigation tools (parallel to Chapter 1)
const chapterDossiers = {
  2: [
    ["JASON TODD", "Former commander", "His own people are refusing orders. Is the takeover real, or staged to draw him out?", "The message was sent using an old lieutenant's device; possession is not proof of authorship."],
    ["FORMER LIEUTENANT", "Missing witness", "Last seen near the warehouse before his phone went offline.", "A payroll record shows a transfer approved after his disappearance."],
    ["BLACK MASK", "Competing crime boss", "Would profit from the collapse of Jason's network.", "His contacts claim he was negotiating a separate deal that night."],
    ["RED X", "Unidentified operative", "Has access to covert supply routes and stolen communication hardware.", "A courier described an X-shaped mark, but the camera never captured it."],
    ["UNKNOWN AUTHORITY", "Identity concealed", "A central account is issuing instructions through intermediaries.", "Different locations use the same authorization key; no confirmed human owner."]
  ],
  3: [
    ["BLACK MASK", "Financial motive", "His network could have funded a hostile takeover.", "One payment chain passes through an intermediary tied to his former accountant."],
    ["RED X", "Technical capability", "Could forge the access tokens and manipulate archived recordings.", "A copied credential is not evidence of physical presence."],
    ["TITANS-ERA CONTACT", "Sealed identity", "A meeting photo and partial voice sample may link this person to the network.", "The voice comparison is incomplete and could be a manipulated recording."],
    ["SLADE WILSON", "Contract operative", "Has the skill to execute a plan while concealing the client.", "The recovered contract separates the operative from the original client."],
    ["UNKNOWN AUTHORITY", "Command account", "All orders appear to originate here, but multiple people may have used it.", "Audit logs contain conflicting device fingerprints."]
  ],
  4: [
    ["SLADE WILSON", "Primary suspect", "Had access and a reason to turn on Blackfire.", "A recovered note is consistent with his handwriting but lacks a recipient."],
    ["BLACKFIRE", "Victim and former coordinator", "Had taken control of Jason's network before her death.", "Her final unsent message suggests she feared someone above the contract chain."],
    ["UNKNOWN CLIENT", "Original contractor", "The person who issued Slade's first instructions remains unidentified.", "The contract's client field was erased before it reached the archive."],
    ["NETWORK INSIDER", "Potential accomplice", "Could have supplied access codes and falsified the scene's timestamps.", "An administrative login continued after Blackfire's death."]
  ]
};
const chapterPinned = {2:new Set(),3:new Set(),4:new Set()};
const chapterTheories = {2:"",3:"",4:""};
function renderChapterDossiers(){
  const target = document.querySelector('#chapterDossiers'); if(!target) return;
  target.innerHTML = (chapterDossiers[currentChapter]||[]).map(([name,role,statement,conflict],i)=>
    `<details class="chapter-dossier panel"><summary><strong>${escapeHTML(name)}</strong> <small>${escapeHTML(role)}</small></summary><p>${escapeHTML(statement)}</p><p><b>UNRESOLVED CONTRADICTION:</b> ${escapeHTML(conflict)}</p></details>`).join('');
}
function renderChapterArchive(){
  const target=document.querySelector('#chapterArchive'); if(!target) return;
  const all=currentChapterData.locations.flatMap(l=>l.objects);
  target.innerHTML=all.map(o=>{
    const found=chapterClues.has(o.clue);
    return `<article class="chapter-archive-card panel"><small>${found?'RECOVERED':'LOCKED // NOT EXAMINED'}</small><h3>${escapeHTML(found?o.title:'UNKNOWN FILE')}</h3>${found?`<button type="button" class="icon-btn" data-chapter-pin="${escapeHTML(o.clue)}">${chapterPinned[currentChapter].has(o.clue)?'UNPIN':'PIN TO BOARD'}</button>`:''}</article>`;
  }).join('');
  const pins=document.querySelector('#chapterPinned');
  if(pins) pins.innerHTML=all.filter(o=>chapterPinned[currentChapter].has(o.clue)).map(o=>`<p>▸ ${escapeHTML(o.title)}</p>`).join('')||'<p class="muted">No files pinned yet.</p>';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-chapter-pin]'); if(!b)return;
  const set=chapterPinned[currentChapter],id=b.dataset.chapterPin;
  set.has(id)?set.delete(id):set.add(id); renderChapterArchive();
});

// =========================================================
// 18. CHAPTER BRIEFING
// =========================================================

function beginChapter(chapterNumber) {
    clearInterval(timerInterval);

    currentChapter = chapterNumber;
    currentChapterData = chapters[chapterNumber];

    if (!currentChapterData) {
        runFinalSequence();
        return;
    }

    chapterEnded = false;
    chapterClues = new Set();
    currentChapterLocation = null;

    hide("#transition");
    hide("#app");
    hide("#aftermath");

    show("#chapterTwoBrief");
    if (chapterNumber === 2) {
        const phone = document.querySelector('#jasonPhone');
        if (phone) {
            show(phone);
            phone.classList.remove('phone-shake');
            void phone.offsetWidth;
            phone.classList.add('phone-shake');
        }
        playSound('notification');
    } else hide('#jasonPhone');

    const data = currentChapterData;

    $("#chapterBriefEyebrow").textContent = data.eyebrow;
    $("#chapterBriefBadge").textContent = data.badge;
    $("#chapterBriefTitle").textContent = data.title;
    $("#chapterBriefBody").textContent = data.briefing;
    $("#chapterBriefSubject").textContent = data.subject;
    $("#chapterBriefStatus").textContent = data.status;
    $("#chapterBriefTime").textContent = data.time;
    $("#chapterBriefMission").textContent = data.mission;
    $("#chapterBriefNote").textContent = data.note;

    $("#chapterTwoBriefNext").textContent =
        `BEGIN CHAPTER 0${chapterNumber}`;

    gamePhase = "briefing";

    playSound("notification");
}

$("#chapterTwoBriefNext").addEventListener("click", () => {
    startChapterInvestigation();
});


// =========================================================
// 19. CHAPTER INVESTIGATION
// =========================================================

function startChapterInvestigation() {
    hide("#chapterTwoBrief");
    hide("#jasonPhone");
    show("#aftermath");
    show("#notebookButton");

    const data = currentChapterData;

    $("#chapterInvestigationEyebrow").textContent = data.eyebrow;
    $("#chapterInvestigationTitle").textContent = data.title;
    $("#chapterInvestigationObjective").textContent = data.objective;

    $("#chapterReportEyebrow").textContent =
        `CHAPTER 0${currentChapter} / FINAL REPORT`;

    $("#chapterReportTitle").textContent = data.reportTitle;
    $("#chapterReportPrompt").textContent = data.reportPrompt;

    $("#afterTheory").value = "";

    $("#afterObjects").innerHTML = `
        <p class="muted">
            Select a location above to begin examining the scene.
        </p>
    `;

    $("#afterDetail").innerHTML = "";
    hide("#afterDetail");

    renderChapterLocations();
    renderChapterDossiers();
    renderChapterArchive();
    const theory = document.querySelector('#chapterBoardTheory');
    if (theory) theory.value = chapterTheories[currentChapter] || '';

    chapterSecondsRemaining = CHAPTER_DURATION;
    updateChapterClock();

    gamePhase = "chapterInvestigation";
        startChapterTimer();

    toast(`CHAPTER 0${currentChapter} // INVESTIGATION ACTIVE`);
}

function renderChapterLocations() {
    const container = $("#afterLocations");

    container.innerHTML = currentChapterData.locations.map(location => `
        <button class="location-card"
            data-after-location="${escapeHTML(location.id)}">

            <small>FIELD LOCATION</small>

            <h3>${escapeHTML(location.name)}</h3>

            <p>${escapeHTML(location.description)}</p>

        </button>
    `).join("");
}

$("#afterLocations").addEventListener("click", event => {
    const button = event.target.closest("[data-after-location]");
    if (!button) return;

    currentChapterLocation = currentChapterData.locations.find(item =>
        item.id === button.dataset.afterLocation
    );

    if (!currentChapterLocation) return;

    $$("#afterLocations .location-card").forEach(card =>
        card.classList.remove("selected")
    );

    button.classList.add("selected");

    renderChapterObjects();

    playSound("click");
});

function renderChapterObjects() {
    if (!currentChapterLocation) return;

    $("#afterObjects").innerHTML = `
        <p class="eyebrow">LOCATION SELECTED</p>

        <h2>${escapeHTML(currentChapterLocation.name)}</h2>

        <p>${escapeHTML(currentChapterLocation.description)}</p>

        <div class="object-grid">

            ${currentChapterLocation.objects.map(object => `
                <button class="object-card
                    ${chapterClues.has(object.clue) ? "examined" : ""}"
                    data-after-object="${escapeHTML(object.id)}">

                    <strong>${escapeHTML(object.name)}</strong>

                    <small>${escapeHTML(object.description)}</small>

                    <small>
                        ${chapterClues.has(object.clue)
                            ? "FILE RECOVERED"
                            : "CLICK TO EXAMINE"}
                    </small>

                </button>
            `).join("")}

        </div>
    `;
}


// =========================================================
// 20. CHAPTER CLUE EXAMINATION
// =========================================================

$("#afterObjects").addEventListener("click", event => {
    const button = event.target.closest("[data-after-object]");
    if (!button || !currentChapterLocation) return;

    const object = currentChapterLocation.objects.find(item =>
        item.id === button.dataset.afterObject
    );

    if (!object) return;

    chapterClues.add(object.clue);

    $("#afterDetail").innerHTML = `
        <p class="eyebrow">
            CHAPTER 0${currentChapter} // RECOVERED FILE
        </p>

        <h2>${escapeHTML(object.title)}</h2>

        <div class="clue-content">
            <p>${escapeHTML(object.content)}</p>
        </div>

        <p class="muted">
            FILE ID: ${escapeHTML(object.clue.toUpperCase())}
        </p>

        <button class="primary"
            data-add-chapter-note="${escapeHTML(object.title)}"
            data-note-content="${escapeHTML(object.content)}">
            ADD TO NOTEBOOK
        </button>
    `;

    show("#afterDetail");

    renderChapterObjects();
    updateChapterProgress();

    playSound("notification");
});

function updateChapterProgress() {
    renderChapterArchive();
    $("#chapterTwoProgress").textContent =
        `${chapterClues.size} CLUES EXAMINED`;
}


// =========================================================
// 21. CHAPTER TIMER
// =========================================================

function updateChapterClock() {
    $("#chapterTwoClock").textContent =
        formatTime(chapterSecondsRemaining);
}

function startChapterTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gamePhase !== "chapterInvestigation") return;

        chapterSecondsRemaining--;
        updateChapterClock();

        if (
            chapterSecondsRemaining <= 60 &&
            chapterSecondsRemaining > 0 &&
            chapterSecondsRemaining % 15 === 0
        ) {
            toast("WARNING: INVESTIGATION WINDOW CLOSING");
            playSound("warning");
        }

        if (chapterSecondsRemaining <= 0) {
            clearInterval(timerInterval);
            submitChapterFindings(true);
        }

    }, 1000);
}


// =========================================================
// 22. ADD CHAPTER CLUES TO NOTEBOOK
// =========================================================

document.addEventListener("click", event => {
    const button = event.target.closest("[data-add-chapter-note]");
    if (!button) return;

    notebookEntries.push({
        title: button.dataset.addChapterNote,
        content: button.dataset.noteContent
    });

    renderNotebook();

    toast("FILE ADDED TO INVESTIGATOR NOTEBOOK");
});


// =========================================================
// 23. CHAPTER REPORT SUBMISSION
// =========================================================

$("#finishAfter").addEventListener("click", () => {
    submitChapterFindings(false);
});

function submitChapterFindings(timedOut) {
    if (chapterEnded) return;

    chapterEnded = true;
    clearInterval(timerInterval);

    const report = $("#afterTheory").value.trim();

    savedReport = savedReport || {};

    chapterTheories[currentChapter] = document.querySelector("#chapterBoardTheory")?.value || "";
    savedReport[`chapter${currentChapter}`] = {
        boardTheory: chapterTheories[currentChapter],
        pinned: [...chapterPinned[currentChapter]],
        report,
        clues: [...chapterClues],
        timedOut
    };

    hide("#aftermath");
    hide("#notebookButton");
    hide("#notebook");
    hide("#notesShade");

    if (currentChapter < 4) {
        show("#transition");

        $("#transitionTag").textContent =
            `CHAPTER 0${currentChapter} // FINDINGS ARCHIVED`;

        $("#transitionTitle").textContent =
            timedOut ? "TIME EXPIRED" : "FINDINGS RECEIVED";

        if (currentChapter === 2) {
            $("#transitionBody").textContent =
`Jason has received your report.

The evidence points towards a coordinated takeover.
But the identity of the new leader remains the central question.

The Batcomputer has recovered another set of files.

A name is beginning to surface.`;
        } else {
            $("#transitionBody").textContent =
`The new authority has been identified.

Blackfire used the chaos surrounding Nightwing's death
to take control of Jason's operation.

But the story does not end there.

A new incident report has arrived.

Blackfire is dead.`;
        }

        gamePhase = "transition";

        $("#transitionNext").textContent =
            currentChapter === 2
                ? "INVESTIGATE THE NEW AUTHORITY"
                : "OPEN AFTERMATH FILES";

    } else {
        runFinalSequence();
    }
}


// =========================================================
// 24. FINAL HACKING SEQUENCE
// =========================================================

async function runFinalSequence() {
    clearInterval(timerInterval);
    ['#transition','#aftermath','#chapterTwoBrief','#notebookButton','#notebook','#notesShade','#app'].forEach(hide);
    show('#hack');
    const screen=$('#hack');
    screen.classList.remove('blackout','end-void');
    gamePhase='hack';
    ['#hackFinal','#hackSub','#review','#savedReport','#hackGlitch'].forEach(hide);
    $('#hackHeader').textContent='BATCOMPUTER // SECURE ARCHIVE';
    $('#hackLog').innerHTML='';
    const lines=['CASE 0912 // FINAL REPORT ACCEPTED','NIGHTWING INCIDENT // ARCHIVED','BLÜDHAVEN NETWORK // FILES SEALED','SLADE WILSON // CONTRACT LINK CONFIRMED','CLOSING REMOTE SESSION...'];
    for(const msg of lines){
        const line=document.createElement('p'); line.textContent='> '+msg;
        $('#hackLog').append(line); playSound('typing'); await delay(550);
    }
    await delay(1100);
    screen.classList.add('end-void');
    $('#hackLog').innerHTML=''; hide('#hackHeader');
    await delay(1800);
    const log=$('#hackLog');
    const ominous=['CONNECTION STILL ACTIVE','UNRECOGNISED USER // ACCESS GRANTED','RECOVERED FRAGMENT: SLADE WILSON // DIRECTIVE RECEIVED','ORIGINAL CLIENT: [ERASED]','UNKNOWN: YOU FOLLOWED MY ORDERS.','UNKNOWN: THE INVESTIGATION WAS NEVER THE POINT.'];
    for(const msg of ominous){
        const line=document.createElement('p'); line.textContent='> '+msg; log.append(line);
        await delay(850);
    }
        // Clean, cinematic ending
    log.innerHTML = '';

    const finalText = $('#hackFinal');

    finalText.classList.remove('horror-corrupt');
    finalText.textContent = 'THE END.';
    show('#hackFinal');

    // Hold the ending for three seconds
    await delay(3000);

    // Fade to black
    hide('#hackFinal');
    await delay(1500);

    // Reveal the final message
    finalText.textContent = 'MYSTERY NOT OVER YET~';
    show('#hackFinal');

    $('#hackSub').textContent =
        'UNKNOWN USER: I WILL BE SEEING YOU.';

    show('#hackSub');
    screen.classList.add('end-void');
    gamePhase='finished';
}


// =========================================================
// 25. REVIEW SAVED REPORT
// =========================================================

$("#review").addEventListener("click", () => {
    if (!savedReport) {
        toast("NO SAVED REPORT FOUND");
        return;
    }

    const sections = [];

    if (savedReport.primarySuspect) {
        sections.push(`
            <h3>CHAPTER 1 // PRIMARY SUSPECT</h3>
            <p>${escapeHTML(savedReport.primarySuspect)}</p>
        `);
    }

    if (savedReport.events) {
        sections.push(`
            <h3>CHAPTER 1 // EVENT RECONSTRUCTION</h3>
            <p>${escapeHTML(savedReport.events)}</p>
        `);
    }

    if (savedReport.motive) {
        sections.push(`
            <h3>CHAPTER 1 // MOTIVE</h3>
            <p>${escapeHTML(savedReport.motive)}</p>
        `);
    }

    if (savedReport.evidence) {
        sections.push(`
            <h3>CHAPTER 1 // EVIDENCE</h3>
            <p>${escapeHTML(savedReport.evidence)}</p>
        `);
    }

    if (savedReport.accomplices) {
        sections.push(`
            <h3>CHAPTER 1 // OTHER INVOLVEMENT</h3>
            <p>${escapeHTML(savedReport.accomplices)}</p>
        `);
    }

    [2, 3, 4].forEach(number => {
        const report = savedReport[`chapter${number}`];

        if (!report) return;

        sections.push(`
            <h3>CHAPTER 0${number} // REPORT</h3>
            <p>${escapeHTML(report.report || "No report submitted.")}</p>
            <p class="muted">
                CLUES EXAMINED: ${report.clues.length}
            </p>
        `);
    });

    $("#savedReport").innerHTML = `
        <p class="eyebrow">ARCHIVED INVESTIGATION</p>
        <h2>CASE 0912 // SAVED REPORTS</h2>
        ${sections.join("")}
    `;

    show("#savedReport");
});


// =========================================================
// 26. RESTART
// =========================================================

$("#restart").addEventListener("click", () => {
    const confirmed = confirm(
        "Restart CASE 0912? All investigation progress will be lost."
    );

    if (!confirmed) return;

    location.reload();
});


// =========================================================
// 27. INITIALISE
// =========================================================

renderNotebook();

hide("#app");
hide("#cinema");
hide("#transition");
hide("#chapterTwoBrief");
hide("#aftermath");
hide("#hack");

gamePhase = "intro";

// =========================================================
// END OF BATCOMPUTER // CASE 0912
// =========================================================