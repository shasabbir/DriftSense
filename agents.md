# AGENTS.md

## Project

Project name: DriftSense

DriftSense is a research prototype for browser-based digital wellbeing. It studies whether declared intention and lightweight browser activity signals can predict session-level digital drift.

## Core Research Claim

The project is not about generic activity tracking or dashboarding. The central contribution is:

A privacy-preserving, intention-aware session-level drift prediction model that combines declared browsing intention, lightweight browser activity signals, and post-session reflection.

## Do Not Overclaim

Never claim:

* addiction detection
* ADHD diagnosis
* mental health diagnosis
* true attention detection
* emotion detection
* productivity optimization in general
* surveillance
* webcam-based monitoring in MVP
* novelty of dashboarding alone
* novelty of activity tracking alone

## Privacy Rules

Do not collect:

* page text
* passwords
* screenshots
* private messages
* full browsing history
* source code
* keystroke values
* webcam images
* face identity
* emotion data

Allowed data:

* monitored domain
* declared intention
* session timing
* scroll counts
* click counts
* keyboard activity counts without key values
* idle time
* tab focus
* video playback status if accessible
* post-session reflection answer
* local anonymous user ID

## Implementation Stack

Extension:

* Chrome Manifest V3
* React + TypeScript
* Vite
* chrome.storage.local or IndexedDB

ML:

* Python
* pandas
* numpy
* scikit-learn
* CatBoost or XGBoost
* PyTorch
* matplotlib

Paper:

* Markdown first
* ACM-style structure later
* BibTeX references

## Repository Structure

extension/
Chrome extension source

ml/
preprocessing, training, evaluation, notebooks

paper/
paper draft, references, figure list, table list

data/
sample or synthetic datasets only unless real data is explicitly added with consent

## Definition of Done for Implementation Tasks

A task is done only when:

* code builds
* relevant command is documented
* privacy rules are respected
* README is updated
* no prohibited data is collected
* synthetic test data works
* exported data schema is documented

## Definition of Done for Paper Tasks

A paper task is done only when:

* claims match implementation
* no fake results are invented
* missing results are marked as placeholders
* related work is connected to the research gap
* limitations are honest
* contribution stays narrow

## Main Baselines

Always compare against:

* time threshold baseline
* domain baseline
* intention-only baseline
* activity-only model
* intention + activity model

## Main Metrics

Use:

* accuracy
* precision
* recall
* F1-score
* ROC-AUC
* confusion matrix
* early prediction performance at 1, 3, and 5 minutes

## Preferred Modeling Order

1. Rule-based baseline
2. Logistic regression
3. Random Forest
4. CatBoost or XGBoost
5. TCN or GRU sequence model

Do not start with Transformer unless there is a large enough dataset.

## Main Paper Framing

The paper solves this problem:

Existing digital wellbeing tools often rely on domain blocking, screen-time limits, or generic activity dashboards. These approaches cannot reliably distinguish purposeful browsing from accidental digital drift. DriftSense investigates whether session-level intention alignment can classify browsing sessions more meaningfully than time or domain alone.
