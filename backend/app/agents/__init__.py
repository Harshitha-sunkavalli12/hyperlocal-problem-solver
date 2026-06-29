"""Community Hero multi-agent pipeline.

Five agents orchestrated as a LangGraph-style state graph:
  Intake -> Validation -> Routing -> (Resolution monitor)   [per-report]
  Insights                                                   [nightly batch]
"""
