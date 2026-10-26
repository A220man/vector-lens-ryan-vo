#!/bin/bash
cd /var/lib/alan-portfolio/workspaces/ryan/vector-lens-ryan-vo/backend
.venv/bin/python -m pytest tests -v --tb=short 2>&1
