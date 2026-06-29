# ML — Predictive model & AI evaluation

## `eval_pipeline/`
AI quality gate combining **RAGAS** (RAG retrieval quality) and **DeepEval**
(categorization accuracy + reasoning faithfulness). Runs in CI; the build fails
if any metric drops below its threshold.

```bash
python ml/eval_pipeline/evaluate.py
```

Thresholds: `intake_accuracy ≥ 0.80`, `reasoning_faithfulness ≥ 0.75`,
`rag_context_precision ≥ 0.70`.

## `predictive_model/`
Gradient-boosted recurrence model (rainfall + road age + traffic + history →
30-day risk). Trained locally and deployed to **Google Vertex AI**; the backend
adapter (`app/services/prediction.py`) calls the Vertex endpoint when
`VERTEX_ENDPOINT_ID` + `GCP_PROJECT` are set, else uses the heuristic.

```bash
python ml/predictive_model/train.py
```
