You are working as an HCI research assistant and technical paper writer.

Project name: DriftSense

Paper title:
DriftSense: Intention-Aware Session-Level Prediction of Browser-Based Digital Drift

Task:
Write a complete implementation-paper draft based on the DriftSense project. The paper must be written in an academic HCI style, but it should avoid overclaiming. The central contribution is not activity tracking or dashboarding. The central contribution is a session-level intention-alignment model and evaluation for browser-based digital drift.

Target venue:
Implementation-focused HCI paper, student research paper, ACM-style paper, or local conference/journal paper.

Core problem:
Existing digital-wellbeing tools often rely on domain blocking, screen-time limits, or usage dashboards. These approaches cannot reliably distinguish purposeful web use from accidental digital drift. The same website can support useful information seeking, intentional breaks, passive consumption, or avoidance. DriftSense investigates whether declared intention and lightweight browser activity signals can classify session-level digital drift better than time-based or domain-based baselines.

Important framing:

* Do not claim to detect addiction.
* Do not claim to diagnose ADHD.
* Do not claim to detect true attention.
* Do not claim to detect emotion.
* Do not claim to solve productivity generally.
* Do not claim the dashboard itself is novel.
* Do not claim activity tracking itself is novel.
* The contribution is intention-aware session-level drift prediction.

Expected paper structure:

1. Title
   DriftSense: Intention-Aware Session-Level Prediction of Browser-Based Digital Drift

2. Abstract
   Include:

* problem
* gap
* system
* dataset
* model
* evaluation
* main result placeholder if actual results are not available
* contribution

3. Introduction
   Must explain:

* People often open distracting websites for valid reasons.
* Existing tools judge based on site category or time.
* This creates false positives and overblocking.
* Digital drift is intention-behavior mismatch during a browsing session.
* DriftSense combines declared intention, activity signals, and post-session reflection.
* The paper evaluates whether this predicts drift better than weak baselines.

Include a clear research question:
Can declared browsing intention combined with lightweight browser activity signals predict session-level digital drift better than time-based or domain-based approaches?

4. Related Work
   Organize into:
   A. Digital wellbeing and self-control tools
   B. Browser and social media distraction interventions
   C. Intention-aware and reflective interventions
   D. Personal informatics and activity tracking
   E. Regret, intention mismatch, and session-level modeling
   F. Privacy and ethical concerns in behavioral tracking

Important related works to discuss:

* Purpose Mode: reducing distraction by toggling attention-capturing patterns
* MindShift: LLM-based mental-state intervention for problematic smartphone use
* StayFocused: reflective prompts and chatbot support
* PauseNow: guiding users back to original intention
* one sec: self-nudge before opening apps
* Self-Control in Cyberspace: review of digital self-control tools
* Digital self-control systematic reviews
* Before You Scroll Again: intended vs actual use and regretful sessions
* WellScreen or similar reflection-based personal informatics work

Explain the gap:
Prior work includes blocking, friction, interface modification, reflective prompts, and dashboards. However, less work directly evaluates a browser-session model that combines declared intention, lightweight activity sequences, and post-session reflection to classify drift.

5. System Design
   Describe:

* Chrome Manifest V3 extension
* monitored domains
* intention prompt
* activity tracking
* post-session reflection
* dashboard
* export function
* privacy design

Include the exact collected data:

* domain
* declared intention
* session duration
* click count
* scroll count
* keyboard activity count, without key values
* idle time
* tab focus
* video playback
* post-session answer
* drift label

Mention data not collected:

* page text
* passwords
* screenshots
* private messages
* full browsing history
* source code
* webcam data

6. Drift Classification Model
   Describe:
   A. Labeling

* Post-session “No, I drifted” = drift
* “Yes” = non-drift
* “Continue intentionally” and “Save for later” handled separately or excluded depending on analysis

B. Baselines

* time threshold baseline
* domain baseline
* intention-only logistic regression
* activity-only model

C. Main models

* CatBoost/XGBoost using intention + aggregate activity features
* TCN/GRU using activity sequence + static features

D. Early prediction
Evaluate prediction using first 1 minute, 3 minutes, 5 minutes, and full session.

7. Dataset
   Describe:

* participant count
* study duration
* number of sessions
* number of labeled sessions
* domain categories
* class distribution
* privacy process
* consent
* anonymization

If real data is not available yet, write this section as planned methodology and mark all result values as placeholders.

8. Study Method
   Include:

* participants
* duration
* procedure
* consent
* setup
* post-study survey
* optional interview
* measures

Measures:

* drift classification accuracy
* F1-score
* ROC-AUC
* perceived usefulness
* perceived control
* annoyance
* privacy concern
* qualitative feedback

9. Results
   Create placeholders if real results are not available:

* Dataset summary
* Model comparison
* Early prediction performance
* Feature importance
* User feedback

Tables to include:
Table 1: Dataset summary
Table 2: Model comparison
Table 3: Early prediction performance
Table 4: Participant feedback themes

Do not fabricate results. Use placeholders like [INSERT RESULT].

10. Discussion
    Discuss:

* why intention improves interpretation
* why time-on-site is weak
* when activity signals fail
* false positives and false negatives
* privacy trade-offs
* user burden from prompts
* whether early warnings are acceptable
* implications for digital wellbeing tools

11. Limitations
    Include:

* small sample size
* self-report labels may be noisy
* browser-only tracking
* configured domains only
* no claim of true attention
* no mental health diagnosis
* possible behavior change due to being monitored
* dataset may not generalize

12. Future Work
    Include:

* larger dataset
* personalized models
* adaptive prompt timing
* cross-device data
* optional local-only presence detection
* comparison with Purpose Mode-style interface modification
* longitudinal study

13. Conclusion
    Restate:

* problem
* system
* model
* evaluation
* main contribution

14. References
    Use ACM-style references. Include BibTeX entries in paper/references.bib where possible.

Required writing style:

* Clear, academic, direct.
* Avoid marketing language.
* Avoid overclaiming.
* Use “we investigate,” “we propose,” and “we evaluate.”
* Do not say “we solve digital addiction.”
* Do not say “AI detects attention.”
* Do not say “novel dashboard.”
* Keep contribution narrow and defensible.

Expected artifacts:

* paper/draft.md
* paper/abstract.md
* paper/introduction.md
* paper/related_work.md
* paper/methodology.md
* paper/results_template.md
* paper/discussion.md
* paper/limitations.md
* paper/references.bib
* paper/figures_list.md
* paper/tables_list.md

Definition of done:

* Complete paper draft exists.
* Related work is organized.
* Contribution is clear and not overclaimed.
* Methodology matches the implementation.
* Results section has placeholders if actual results are missing.
* Tables and figures are listed.
* References are included in BibTeX.
* Limitations are honest.
* Paper can be converted into ACM format later.

Start by reading the repository README, AGENTS.md, implementation files, dataset schema, and ML results. Then create the paper outline first. After the outline, write the full draft section by section.
