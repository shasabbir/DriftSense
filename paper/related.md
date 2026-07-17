# Related Work Summaries for DriftSense

This document summarizes the selected papers in terms of (1) what the authors built or studied, (2) their main results, and (3) the evaluation techniques they used. Results are reported conservatively: a design proposal is not treated as an evaluated system, marginal and null findings are retained, and the June 2026 *Before You Scroll Again* manuscript is identified as a preprint.

## Evidence overview

| Work | Type of contribution | Evaluation status | Main relevance to DriftSense |
|---|---|---|---|
| Purpose Mode | Browser extension that suppresses attention-capturing design patterns | Two-week mixed-methods field study | Shows that interface patterns and goal alignment affect perceived distraction |
| MindShift | LLM-generated, context- and mental-state-based smartphone interventions | Formative studies plus five-week field experiment | Demonstrates intent-aware intervention, but requires mental-state reporting and richer data than DriftSense |
| StayFocused | Focus timer with reflective prompts and optional chatbot | Five-week, three-group field study | Tests situated reflection when users try to leave an intended focus period |
| PauseNow | Intention-aware intervention framework | Concept/design proposal; no outcome study | Closest conceptual framing of intention drift, but not an evaluated prediction system |
| one sec | Pre-opening friction and self-nudge | Six-week observational field study plus preregistered online experiment | Demonstrates the value of a small interruption before habitual access |
| Self-Control in Cyberspace | Review and theoretical mapping of commercial tools | Feature analysis, not an effectiveness trial | Establishes that blocking/removal dominates the design space |
| Digital self-control systematic reviews | Systematic reviews and meta-analysis | Secondary evidence | Finds promising but mostly short-term and methodologically limited effects |
| Before You Scroll Again | Session-level regret analysis and pre-session prediction | Seven-day sensing study; preprint | Strong evidence that intention–use mismatch is more informative than duration alone |
| WellScreen | Reflection-based personal informatics probe | Two-week mixed-methods deployment | Shows how estimated-versus-actual use can scaffold reflection |

## 1. Purpose Mode

**Citation:** Lee, Chiang, Gao, Yang, Winter, and Das. “Purpose Mode: Reducing Distraction Through Toggling Attention Capture Damaging Patterns on Social Media Web Sites.” *ACM Transactions on Computer-Human Interaction* 32(1), 2025. [DOI](https://doi.org/10.1145/3711841)

### What the paper did

Purpose Mode is a browser extension that lets people suppress or modify attention capture damaging patterns (ACDPs) on Facebook, LinkedIn, X, and YouTube. Its controls include disabling autoplay, replacing infinite scroll with a finite “show more” interaction, reducing clutter and recommendations, and desaturating colors. The aim is to preserve access to useful social-media functions while giving users control over engagement-maximizing interface features.

The authors deployed the extension to 29 participants for two weeks. During week one, Purpose Mode’s intervention features were unavailable and participants’ normal browsing formed the baseline. During week two, participants could enable or disable its features.

### Main results

- Perceived distraction fell from 27.9% of experience-sampling responses during baseline to 7.1% when Purpose Mode was available.
- Participants spent an average of 21.5 fewer minutes per day on the supported social-media websites during the intervention week.
- Almost all participants, 28 of 29, described the extension as helpful. Interviews associated it with greater control and less irritation and frustration.
- The relationship between individual ACDPs and distraction was not uniformly strong. Subjective session qualities, such as satisfaction and goal alignment, were often stronger correlates of perceived distraction.
- There was a usability trade-off: 28 of 29 participants experienced at least some loss of utility or increased task effort when useful interface elements were suppressed.

### Evaluation techniques

- Two-week, within-participant field deployment with a fixed baseline-then-intervention order.
- Up to six ecological momentary assessment (EMA) prompts per day; the final analysis used 1,017 EMA responses.
- Browser telemetry measuring site use and feature toggles.
- Mixed-effects regression models for distraction and other session perceptions.
- Two semi-structured interviews per participant, conducted after each study week, followed by qualitative coding.

### Important limitation and DriftSense connection

The study was not randomized or counterbalanced, so week/order effects and demand characteristics limit causal interpretation. Purpose Mode also changes the interface rather than predicting drift. For DriftSense, its strongest contribution is evidence that the same domain can support both purposeful and distracting use and that goal alignment is more informative than domain or time alone.

## 2. MindShift

**Citation:** Wu et al. “MindShift: Leveraging Large Language Models for Mental-States-Based Problematic Smartphone Use Intervention.” *CHI 2024*. [DOI](https://doi.org/10.1145/3613904.3642790) | [Author PDF](https://pi.cs.tsinghua.edu.cn/wp-content/uploads/2024/05/MindShif%E5%90%B4%E8%8B%A5%E5%85%B0.pdf)

### What the paper did

MindShift generates just-in-time persuasive messages for self-identified habitual smartphone use. It combines the user’s reported purpose, current mental state, app-use behavior, physical context, goals, and habits. GPT-3.5 generates messages using four strategies: understanding, comforting, evoking, and scaffolding habits.

The design was informed by a five-day Wizard-of-Oz study with 12 participants and a separate interview study with 10 participants. These studies identified boredom, stress, and inertia as recurring states associated with habitual use.

### Main results

In the main field study:

- Session-based intervention acceptance was 45.1% for MindShift, 38.5% for MindShift-Simple, and 12.7% for the fixed-reminder baseline. Both LLM versions significantly outperformed baseline, but their overall acceptance rates did not significantly differ.
- When only the generated-persuasion stage was compared, MindShift achieved 20.1% acceptance versus 12.0% for MindShift-Simple; this difference was significant. This is the cleaner evidence for the added value of mental-state strategies.
- Restricted-app opening frequency was 12.1% lower with MindShift and 14.4% lower with MindShift-Simple than baseline, but the frequency difference was not significant.
- Restricted-app use duration was 9.8% lower with MindShift and 2.4% lower with MindShift-Simple. The omnibus comparison was significant, while the MindShift-versus-baseline post-hoc comparison was only marginal.
- Smartphone Addiction Scale scores declined by 34.7% with MindShift and 25.8% with MindShift-Simple; self-efficacy scores increased by 10.7% and 10.4%, respectively. These are self-report outcomes and should not be interpreted as clinical diagnosis or treatment effects.

### Evaluation techniques

- Formative Wizard-of-Oz field study and semi-structured interviews with thematic coding.
- Five-week within-subject field experiment with 25 completers: one baseline week followed by two weeks with each LLM version. The order of the two LLM versions was counterbalanced, but baseline was always first.
- Behavioral measures: intervention acceptance, thumbs-up/down feedback, restricted-app opening frequency, and restricted-app duration.
- Self-report measures: Smartphone Addiction Scale and self-efficacy scale.
- Statistical methods included Friedman tests, paired tests, post-hoc Wilcoxon signed-rank tests with multiplicity correction, and qualitative thematic coding of exit interviews.

### Important limitation and DriftSense connection

The baseline was shorter and structurally weaker than the LLM conditions, participants were mostly young students, and the study relied on repeated self-report of mental state. It also sent contextual and mental-state data to a commercial LLM API, which the authors identify as a privacy risk. DriftSense can cite MindShift as evidence for adapting an intervention to purpose and context, but should distinguish its own narrower goal: privacy-preserving session-level drift prediction without mental-state or clinical inference.

## 3. StayFocused

**Citation:** Li, Liang, LC, and Luo. “StayFocused: Examining the Effects of Reflective Prompts and Chatbot Support on Compulsive Smartphone Use.” *CHI 2024*. [DOI](https://doi.org/10.1145/3613904.3642479) | [Author PDF](https://ellenli2000.github.io/paper/StayFocused.pdf)

### What the paper did

StayFocused lets users begin a planned phone-free focus session. The study compared:

1. a baseline timer;
2. the timer plus reflective prompts when users tried to leave early or completed a session; and
3. the prompts delivered by a GPT-3 chatbot that could respond conversationally.

Thirty-six college students who self-identified with problematic phone use completed the study: 11 used baseline, 13 used reflection, and 12 used reflection plus chatbot.

### Main results

- All groups completed more than 80% of focus sessions, with no significant between-group difference.
- Reflection and chatbot groups focused longer per day than baseline, but the comparisons were only marginally significant.
- The chatbot group attempted to leave sessions more often, but was also significantly more likely to return after an attempted exit. This suggests that “attempt to leave” and “successful resistance” need to be analyzed separately.
- Daily screen time fell during the intervention by 17.7% in baseline, 8.2% in reflection, and 10.9% in reflection-plus-chatbot. Only the baseline group’s within-stage decrease was significant.
- One week after the intervention, baseline and reflection groups showed some rebound. The chatbot group showed a 14.4% pre-to-post reduction, but that change was not statistically significant.
- The PUMP problematic-use score improved significantly for baseline and chatbot groups; the reflection-only result was marginal at *p* = .059. Self-regulation scores did not significantly change.
- Interviews showed benefits such as accountability and emotional support, but also irritation with repetitive prompts and perceptions that the chatbot made inflexible assumptions.

### Evaluation techniques

- Five-week stage-based field study: one pre-intervention week, three intervention weeks, and one post-intervention week.
- Between-subject comparison of three system versions.
- App logs for planned/actual focus time, completion, exit attempts, and returns.
- Android screen-duration data, pre/post PUMP and self-regulation surveys, and semi-structured interviews.
- Mixed-effects models for repeated measures, paired tests for survey changes, Bonferroni-adjusted comparisons, content analysis of prompt responses, and thematic analysis of interviews.

### Important limitation and DriftSense connection

The sample was small, motivated, college-based, and not randomly representative. Several headline patterns were marginal or nonsignificant. StayFocused nevertheless supports the idea that asking about intention at the moment of a possible lapse can promote reflection. DriftSense differs by observing browsing sessions and predicting risk from declared intention plus lightweight activity, rather than asking users to start a phone-free timer.

## 4. PauseNow

**Citation:** Zhao, Li, and Sobolev. “Digital Wellbeing Redefined: Toward User-Centric Approach for Positive Social Media Engagement.” *MOBILESoft 2024*. [DOI](https://doi.org/10.1145/3647632.3651392) | [arXiv](https://arxiv.org/abs/2403.05723)

### What the paper did

PauseNow is presented as a user-centered framework for aligning social-media behavior with an original intention. Its proposed workflow has three phases:

1. **Habit recognition:** model common in-app behavior chains.
2. **Intervention co-design:** show patterns to users, identify which paths represent unwanted drift, and let users choose preferred nudges.
3. **Intention alignment:** ask for the user’s initial intention, monitor behavior and context, detect deviations, and deliver a selected nudge.

The paper’s contribution is primarily conceptual: it argues that digital wellbeing should support beneficial engagement rather than treating all social-media use as harmful or relying only on restriction.

### Results and evaluation techniques

The paper does **not** report a deployment, participant sample, prediction accuracy, controlled experiment, usability study, or behavioral outcome. PauseNow should therefore be described as an initial design/reference framework, not as an empirically validated intervention.

### DriftSense connection

PauseNow is conceptually close to DriftSense because both center intention–behavior alignment. The empirical gap remains substantial: PauseNow does not specify a validated session label, tested feature set, classifier, early-prediction protocol, or comparison against time, domain, intention-only, and activity-only baselines. Those are appropriate areas for DriftSense to investigate.

## 5. one sec

**Citation:** Grüning, Riedel, and Lorenz-Spreen. “Directing Smartphone Use Through the Self-Nudge App One Sec.” *PNAS* 120(8), 2023. [DOI](https://doi.org/10.1073/pnas.2213114120) | [Open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409/)

### What the paper did

The one sec app intercepts attempts to open user-selected apps. It adds a short breathing/waiting period, a deliberation message, and an explicit choice to continue or dismiss the opening. The intervention targets automatic entry into an app before a browsing session begins.

### Main results

- In the six-week field study, users dismissed 36% of target-app opening attempts after the intervention appeared.
- Opening attempts themselves declined by 37% from the first to the sixth week.
- Combining those effects, actual target-app openings were 57% lower after six weeks.
- Participants reported approximately 77 fewer minutes of target-app use per day, less problematic consumption, and greater satisfaction with their use.
- In the controlled experiment, providing an explicit option to skip had the strongest effect. Friction from the delay also reduced consumption, while the generic deliberation message alone did not.

### Evaluation techniques

The paper used two complementary evaluations:

- **Observational field study:** 719 new one sec users enrolled; the primary analysis retained the 280 who used the app for all six weeks. Researchers analyzed timestamped opening attempts, whether users continued or dismissed, reasons for opening, and pre/post self-reports.
- **Preregistered online experiment:** 500 Prolific participants were randomly assigned to control, message-only, friction-only, skip-option, or full-intervention conditions while viewing viral videos. Outcomes were skipped videos and viewing duration.

### Important limitation and DriftSense connection

The field study lacked a control group, used self-selected users, and excluded a large number of dropouts from its primary analysis. A coauthor created the commercial app. The randomized online experiment strengthens the mechanism claim but is not an in-the-wild app-opening trial. For DriftSense, one sec shows that small self-nudges can interrupt habitual entry, while DriftSense instead targets drift that develops within a browser session and can compare intervention timing at one, three, and five minutes.

## 6. Self-Control in Cyberspace

**Citation:** Lyngs et al. “Self-Control in Cyberspace: Applying Dual Systems Theory to a Review of Digital Self-Control Tools.” *CHI 2019*. [DOI](https://doi.org/10.1145/3290605.3300361) | [arXiv](https://arxiv.org/abs/1902.00157)

### What the paper did

The authors reviewed 367 digital self-control tools: 223 Chrome extensions, 86 Android apps, and 58 iOS apps. They coded each tool’s core design features and mapped them to an extended dual-systems model of self-regulation, including conscious goals, habit activation/prevention, habit scaffolding, reward, delay, expectancy, and action competition.

### Main results

- Blocking distractions and removing interface features were the dominant approaches, followed by self-tracking, goal advancement, and reward/punishment.
- Sixty-five percent of tools focused on only one feature cluster and 32% on two.
- Seventy-three percent included mechanisms that prevent unwanted habits from being triggered, while only 18% scaffolded new desirable habits.
- Delay and expectancy were comparatively underexplored. Only two of the 367 tools directly introduced delay rather than merely displaying a timer.
- Store/platform differences reflected differing browser and operating-system permissions.

### Evaluation techniques

This was a systematic functionality and theory-mapping review of app-store products, not a trial of their effectiveness. The authors also examined 17 prior HCI papers to understand how theory had been used, but they explicitly note that this smaller literature set was not collected through a formal systematic-review process.

### DriftSense connection

The review establishes why “another blocker or dashboard” is not a sufficient research contribution. DriftSense occupies a different design space by modeling the session-level relationship between declared intention and observed lightweight behavior, while retaining user access and agency.

## 7. Systematic reviews of digital self-control and social-media interventions

### 7.1 Achieving Digital Wellbeing Through Digital Self-Control Tools

**Citation:** Monge Roffarello and De Russis. “Achieving Digital Wellbeing Through Digital Self-Control Tools: A Systematic Review and Meta-Analysis.” *TOCHI* 30(4), 2023. [DOI](https://doi.org/10.1145/3571810) | [Author manuscript](https://iris.polito.it/retrieve/28c10713-3c1e-4084-83d0-0a9b2e8b2723/dwbreview.pdf)

**What it did:** The authors used PRISMA to search the ACM Guide to Computing Literature for work published from January 2000 through June 2021. From 4,865 records, they retained 62 papers: 45 concerned implemented tools and 37 included an evaluation. They coded motivations, intervention strategies, theory use, study design, ethics, and evaluation practice.

**Results:** The literature emphasized overuse and blocking/removal. Many interventions were weakly grounded in behavioral theory, ethics received limited attention, and evaluations were usually short, frequently lacked control groups, and rarely included follow-up. For the meta-analysis, nine time-based studies were initially eligible; after two influential/outlying studies were removed, seven studies with 255 participants produced a pooled Hedges’ *g* of 0.4734 (95% CI [0.2657, 0.6811]). This is a small-to-medium short-term reduction in time spent. The included studies averaged only 22.57 days, so the result does not establish durable behavior change.

**Evaluation technique:** PRISMA review, structured coding, random-effects meta-analysis using the Hartung–Knapp–Sidik–Jonkman method, Hedges’ *g*, heterogeneity tests, leave-one-out influence analysis, GOSH analysis, and publication-bias inspection.

### 7.2 Digital Self-Control Interventions for Distracting Media Multitasking

**Citation:** Biedermann, Schneider, and Drachsler. “Digital Self-Control Interventions for Distracting Media Multitasking: A Systematic Review.” *Journal of Computer Assisted Learning* 37(5), 2021. [DOI](https://doi.org/10.1111/jcal.12581)

**What it did:** This PRISMA review searched Web of Science, SpringerLink, ACM Digital Library, IEEE Xplore, and PubMed and added backward/forward snowballing. It included peer-reviewed studies with a treatment-versus-control comparison or baseline phase and behavioral outcomes related to digital distraction. Two authors independently coded intervention features with 91% agreement, and the review calculated Cohen’s *d* when adequate data were available.

**Results:** Awareness features appeared in 16 interventions, goal advancement in 10, blocking in nine, feature modification in five, and reward/punishment in two variants of one intervention. Positive results appeared across categories, but multi-feature systems made individual mechanisms difficult to isolate. Awareness-only interventions were generally insufficient; interventions that were harder to ignore tended to work better, although excessive strictness risks reactance. The few studies with follow-up did not show lasting change. The review also emphasizes that a domain cannot always be classified as distracting because the same site may be necessary for study or work.

**Evaluation technique:** PRISMA selection, feature and outcome coding, narrative synthesis, inter-rater agreement, and standardized mean-difference calculations where possible.

### 7.3 The Impact of Social Media Use Interventions on Mental Well-Being

**Citation:** Plackett, Blyth, and Schartau. “The Impact of Social Media Use Interventions on Mental Well-Being: Systematic Review.” *Journal of Medical Internet Research* 25, 2023. [DOI](https://doi.org/10.2196/44922) | [Open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC10457695/)

**What it did:** The authors searched three databases for adult experimental studies published from 2004 through July 2022. They screened 2,785 records and included 23 studies of abstinence, use limits, or therapy-based approaches.

**Results:** Nine studies reported improvements in at least some wellbeing outcomes, seven mixed effects, and seven no effect. Therapy-based interventions performed best: five of six reported improvement, compared with one of five use-limiting studies and three of 12 abstinence studies. Depression improved in seven of ten studies that measured it. However, 22 of 23 studies received a weak global quality rating; 20 lasted less than one month, and university convenience samples dominated.

**Evaluation technique:** PRISMA review, narrative synthesis rather than meta-analysis because of substantial heterogeneity, and quality appraisal with the Effective Public Health Practice Project tool.

### Review-level conclusion for DriftSense

The reviews support three cautious claims: digital self-control interventions can change behavior in the short term; restricting time or domains is not consistently sufficient; and the evidence base is weakened by short deployments, homogeneous samples, missing controls, and nonstandard outcomes. DriftSense should therefore compare time, domain, intention-only, activity-only, and intention-plus-activity models and should report both predictive performance and longer-term user experience without equating less time with better wellbeing.

## 8. Before You Scroll Again

**Citation:** Ahmed et al. “Before You Scroll Again: Predicting Regretful Social Media Sessions from In-the-Wild Contextual and Wearable Sensing.” arXiv preprint, June 2026. [arXiv](https://arxiv.org/abs/2606.08965)

### What the paper did

The authors studied whether a social-media session would later be regretted and whether that outcome could be predicted before the session began. Twenty-one Android users participated for seven days, producing 1,445 sessions with post-session surveys. A custom phone app logged package-level app start/stop and switching events without collecting in-app content. A Bangle.js 2 smartwatch collected heart rate, temperature, accelerometer, activity, and step signals. Sixteen participants also completed exit interviews.

The paper is the closest item in this set to session-level prediction, but its label is regret rather than drift. Its intention–usage gap was retrospectively reported in the post-session survey; it was not a declared pre-session intention like DriftSense’s proposed label context.

### Main results

- The perceived intention–usage gap correlated more strongly with regret (*r* = .48) than session duration did (*r* = .20).
- In Bayesian hierarchical regression, the gap coefficient was 0.76 versus 0.36 for duration alone. When both were modeled, duration fell to 0.18 while the gap remained 0.72.
- Nighttime use was associated with greater regret after controlling for duration. Use following productivity apps showed a positive trend, but its 95% interval included zero and should not be called a confirmed effect.
- CatBoost models using phone-context features achieved mean within-person AUC 0.732. Adding smartwatch features yielded 0.740, a small average increase.
- Cold-start generalization was weak: leave-one-participant-out AUC was 0.536 for phone context and 0.555 for the combined set. Only about one quarter of participants reached AUC at or above 0.70 in personalized analysis.
- Interviews identified time blindness, intention drift, use as an escape from another task, and reasons fixed timers fail.

### Evaluation techniques

- Seven-day in-the-wild experience-sampling and passive-sensing study.
- Bayesian hierarchical regression with participant random effects and leave-one-out model comparison.
- CatBoost with recursive feature elimination and SHAP interpretation.
- Within-person stratified cross-validation and repeated 70/30 personalized splits.
- Leave-one-participant-out validation for generalization to unseen users.
- AUC-ROC for above-person-median regret classification.
- Inductive thematic analysis of 16 exit interviews.

### Important limitation and DriftSense connection

This is a recent preprint, not yet established here as peer-reviewed. The sample was small, young, Android-only, and primarily university-based; smartwatch data were missing for 24% of sessions. The weak leave-one-participant-out performance shows that personalized and population-level results must be separated. DriftSense can use this paper to justify intention-aware session modeling, but should not adopt its mental-health scales or wearable sensing by default. A privacy-preserving browser implementation can instead test whether declared intention plus click, scroll, idle, focus, and playback counts improves on time and domain baselines.

## 9. WellScreen

**Citation:** Bhat, Shi, Song, Yoo, and Saha. “In My Defense, Only Three Hours on Instagram: Designing Toward Digital Self-Awareness and Wellbeing.” *CHI 2026*. [DOI](https://doi.org/10.1145/3772318.3790263) | [arXiv](https://arxiv.org/abs/2509.21860)

### What the paper did

WellScreen is a lightweight personal-informatics probe that asks users to estimate daily smartphone use at the start and end of the day, compare those estimates with actual use, and reflect on the discrepancy. Twenty-five college students enrolled in a two-week deployment; 20 completed all 14 days and the exit study.

### Main results

- Participants often underestimated productivity and social-media use while overestimating entertainment use.
- Smaller estimation–actual gaps were associated with greater satisfaction and perceived self-control, but also with more stress and lower goal adherence. The paper treats this as a reminder that greater awareness is not uniformly pleasant or behavior-changing.
- Positive affect increased by 10.03% from entry to exit, with Cohen’s *d* = 0.63 and a statistically significant paired comparison. Negative affect and trait self-control/self-regulation did not significantly change.
- Median System Usability Scale score was 80; median Intervention Appropriateness Measure score was 14, indicating good usability but only moderate perceived fit.
- Interviews suggested that repeated reflection helped participants recalibrate expectations, notice patterns, and develop more nuanced definitions of digital wellbeing.

### Evaluation techniques

- Three-phase mixed-methods design: entry survey/interview, 14-day deployment, and exit survey/interview.
- Daily start-of-day and end-of-day use estimates, actual-use reports, reflection responses, and daily wellbeing items.
- Estimation error assessed with relative difference, symmetric mean absolute percentage error, and paired tests.
- Linear mixed-effects regressions relating estimation gaps to participant traits and daily wellbeing.
- PANAS-SF, Brief Self-Control Scale, Short Self-Regulation Questionnaire, System Usability Scale, and Intervention Appropriateness Measure.
- Reflexive thematic analysis of interviews.

### Important limitation and DriftSense connection

WellScreen was a small, preliminary, college-student study with 20 completers and no control group, so the affect change cannot be confidently attributed to the probe. It supports post-session reflection as a meaningful design element, but does not classify session-level drift. DriftSense can borrow the reflective principle while using a much smaller prompt tied to a particular monitored session.

## Cross-paper synthesis for the DriftSense research gap

Across this selected literature, interventions generally operate at one of four points:

1. **Before access:** one sec adds friction before an app opens.
2. **During use:** Purpose Mode removes attention-capturing patterns; MindShift and PauseNow attempt context-aware nudging.
3. **During a declared focus period:** StayFocused asks users to reflect when they try to leave.
4. **After use:** WellScreen supports reflection, while *Before You Scroll Again* models regret.

Within this selected set, no evaluated system tests the exact DriftSense claim: whether a privacy-preserving browser model can predict session-level intention drift by combining a declared browsing intention, lightweight activity signals, and post-session reflection. The closest conceptual work, PauseNow, lacks an outcome evaluation. The closest predictive work, *Before You Scroll Again*, uses a retrospective intention–usage gap, a regret label, broad phone context, and optional wearable physiology rather than an explicit pre-session intention and browser-only signals.

This comparison supports a narrow DriftSense evaluation:

- use post-session reflection as the session label rather than claiming to detect attention or mental state;
- compare a time-threshold baseline, domain baseline, intention-only baseline, activity-only model, and intention-plus-activity model;
- report accuracy, precision, recall, F1, ROC-AUC, confusion matrices, and early prediction at one, three, and five minutes;
- separate within-user and unseen-user performance where the dataset permits;
- preserve purposeful use of a monitored domain instead of treating the domain itself as harmful; and
- collect only domain, declared intention, session timing, event counts, idle/focus/playback state, reflection, and a local anonymous identifier—never page text, screenshots, messages, keystroke values, browsing history, webcam data, or inferred mental state.

## Citation and interpretation notes

- PauseNow has no reported user evaluation; avoid phrases such as “PauseNow was effective.”
- *Before You Scroll Again* is an arXiv preprint dated June 2026 and displays a placeholder ACM DOI in the manuscript; cite the arXiv identifier until a verified publication record exists.
- The correct WellScreen author list is Karthik S. Bhat, Jiayue Melissa Shi, Wenxuan Song, Dong Whi Yoo, and Koustuv Saha. The current `references.bib` entry in this repository does not match this publication and should be corrected before the paper is submitted.
- “Problematic smartphone use,” “smartphone addiction,” and similar terms above reproduce the source papers’ constructs. DriftSense should not present its classifier as diagnosing addiction, ADHD, mental health, emotion, or true attention.
