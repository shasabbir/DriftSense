import { describe, expect, it } from 'vitest'
import { predictCheckpoint, type CheckpointModelArtifact } from './checkpointModel'

describe('checkpoint model inference', () => {
  it('uses only checkpoint values and applies the frozen threshold', () => {
    const artifact: CheckpointModelArtifact = { artifact_status: 'frozen_phase2_candidate', model_version: 'test-600s', prediction_offsets_seconds: [600], source_columns: { numeric: ['active_share'], categorical: ['task_type'] }, numeric_preprocessing: { active_share: { impute_median: 0.5, mean: 0.5, scale: 0.25 } }, categorical_encoding: { task_type: { impute_value: 'writing_creating', categories: ['writing_creating', 'coding_problem_solving'] } }, coefficients: [-1, 0, 0], intercept: 0, risk_threshold: 0.6 }
    const session = { taskType: 'writing_creating', intendedDurationMinutes: 30, taskSites: ['example.com'], initialTaskSite: 'example.com' } as never
    const snapshot = { cutoffSeconds: 600, activeSeconds: 100, idleSeconds: 500, awaySeconds: 0, clickCount: 0, scrollCount: 0, keyboardActivityCount: 0, tabSwitchCount: 0, videoPlayingSeconds: 0 } as never
    expect(predictCheckpoint(artifact, session, snapshot).triggered).toBe(true)
  })
})
