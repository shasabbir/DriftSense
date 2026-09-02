import type { CheckpointSnapshot, InternalSession } from '../shared/types'

type NumericRule = { impute_median: number; mean: number; scale: number }
type CategoryRule = { impute_value: string; categories: string[] }
export type CheckpointModelArtifact = {
  artifact_status: 'frozen_phase2_candidate'
  model_version: string
  prediction_offsets_seconds: number[]
  source_columns: { numeric: string[]; categorical: string[] }
  numeric_preprocessing: Record<string, NumericRule>
  categorical_encoding: Record<string, CategoryRule>
  coefficients: number[]
  intercept: number
  risk_threshold: number
  prompt_probability?: number
  daily_prompt_cap?: number
}

export const CHECKPOINT_MODEL_STORAGE_KEY = 'driftsense_checkpoint_model_v1'

export function validateCheckpointModel(value: unknown): CheckpointModelArtifact {
  const artifact = value as Partial<CheckpointModelArtifact>
  if (!artifact || artifact.artifact_status !== 'frozen_phase2_candidate') throw new Error('This is not a frozen Phase 2 checkpoint model.')
  if (!artifact.model_version || !Array.isArray(artifact.prediction_offsets_seconds) || artifact.prediction_offsets_seconds.length !== 1) throw new Error('The model must define exactly one prediction checkpoint.')
  const cutoff = artifact.prediction_offsets_seconds[0]
  if (![600, 1200, 1800, 3600, 5400].includes(cutoff)) throw new Error('The model checkpoint must be 10, 20, 30, 60, or 90 minutes.')
  if (!artifact.source_columns || !Array.isArray(artifact.source_columns.numeric) || !Array.isArray(artifact.source_columns.categorical)) throw new Error('The model source-column specification is missing.')
  if (!Array.isArray(artifact.coefficients) || !artifact.coefficients.every(Number.isFinite) || !Number.isFinite(artifact.intercept) || !Number.isFinite(artifact.risk_threshold)) throw new Error('The model coefficients or threshold are invalid.')
  if ((artifact.risk_threshold ?? -1) < 0 || (artifact.risk_threshold ?? 2) > 1) throw new Error('The risk threshold must be between zero and one.')
  return artifact as CheckpointModelArtifact
}

export async function installCheckpointModel(value: unknown): Promise<CheckpointModelArtifact> {
  const artifact = validateCheckpointModel(value)
  await chrome.storage.local.set({ [CHECKPOINT_MODEL_STORAGE_KEY]: artifact })
  cached = artifact
  return artifact
}

function rawFeatures(session: InternalSession, snapshot: CheckpointSnapshot): Record<string, number | string> {
  const minutes = snapshot.cutoffSeconds / 60
  const duration = snapshot.cutoffSeconds
  return {
    intended_duration_minutes: session.intendedDurationMinutes ?? Number.NaN,
    elapsed_to_intended_ratio: session.intendedDurationMinutes ? minutes / session.intendedDurationMinutes : Number.NaN,
    task_site_count: session.taskSites.length,
    task_type: session.taskType,
    initial_task_site: session.initialTaskSite,
    click_rate_per_min: snapshot.clickCount / minutes,
    scroll_rate_per_min: snapshot.scrollCount / minutes,
    keyboard_rate_per_min: snapshot.keyboardActivityCount / minutes,
    idle_share: snapshot.idleSeconds / duration,
    active_share: snapshot.activeSeconds / duration,
    away_share: snapshot.awaySeconds / duration,
    tab_switch_rate_per_min: snapshot.tabSwitchCount / minutes,
    video_share: snapshot.videoPlayingSeconds / duration,
  }
}

export function predictCheckpoint(artifact: CheckpointModelArtifact, session: InternalSession, snapshot: CheckpointSnapshot) {
  if (artifact.artifact_status !== 'frozen_phase2_candidate' || !artifact.prediction_offsets_seconds.includes(snapshot.cutoffSeconds)) throw new Error('Model is not frozen for this checkpoint.')
  const raw = rawFeatures(session, snapshot)
  const vector: number[] = []
  for (const name of artifact.source_columns.numeric) {
    const rule = artifact.numeric_preprocessing[name]
    if (!rule || !(name in raw)) throw new Error(`Unsupported checkpoint feature: ${name}`)
    const candidate = Number(raw[name])
    const value = Number.isFinite(candidate) ? candidate : rule.impute_median
    vector.push((value - rule.mean) / (rule.scale || 1))
  }
  for (const name of artifact.source_columns.categorical) {
    const rule = artifact.categorical_encoding[name]
    if (!rule || !(name in raw)) throw new Error(`Unsupported checkpoint feature: ${name}`)
    const value = String(raw[name] ?? rule.impute_value)
    vector.push(...rule.categories.map((category) => Number(value === category)))
  }
  if (vector.length !== artifact.coefficients.length) throw new Error('Model coefficient count does not match its preprocessing specification.')
  const score = vector.reduce((sum, value, index) => sum + value * artifact.coefficients[index], artifact.intercept)
  const probability = 1 / (1 + Math.exp(-score))
  return { probability, triggered: probability >= artifact.risk_threshold, modelVersion: artifact.model_version }
}

let cached: CheckpointModelArtifact | null | undefined
export async function loadCheckpointModel(): Promise<CheckpointModelArtifact | null> {
  if (cached) return cached
  try {
    const stored = (await chrome.storage.local.get(CHECKPOINT_MODEL_STORAGE_KEY))[CHECKPOINT_MODEL_STORAGE_KEY]
    if (stored) { cached = validateCheckpointModel(stored); return cached }
    const response = await fetch(chrome.runtime.getURL('models/frozen_model.json'))
    cached = response.ok ? validateCheckpointModel(await response.json()) : null
  } catch { cached = null }
  return cached
}
